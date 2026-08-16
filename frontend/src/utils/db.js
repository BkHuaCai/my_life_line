import { uuid } from './id'
import { createAllTablesSql } from './schema'
import { effectiveDate } from './date'
import { resolveAdapter } from './storage'

export function createDb(adapter) {
  const now = () => new Date().toISOString()

  // 首次打开（无任何用户）时自动创建默认用户；默认用户不允许删除
  const ensureDefaultPerson = async () => {
    const rows = await adapter.all('person')
    if (rows.length > 0) return
    await adapter.insert('person', {
      id: uuid(),
      name: '我',
      avatar_path: null,
      birth_date: null,
      note: null,
      is_default: 1,
      created_at: now()
    })
  }

  // 每个用户都有一条默认「主线」时间线：创建用户时自动生成，可改名但不可删除
  const ensureMainTimeline = async (personId) => {
    const timelines = await adapter.all('timeline')
    const hasMain = timelines.some((t) => t.person_id === personId && t.is_main === 1)
    if (hasMain) return
    await adapter.insert('timeline', {
      id: uuid(),
      person_id: personId,
      name: '主线',
      category: null,
      is_private: 1,
      is_main: 1,
      created_at: now()
    })
  }

  const upsert = async (table, id, row, getter) => {
    if (id) {
      const existing = await getter(id)
      if (existing) {
        await adapter.update(table, id, row)
        return id
      }
      await adapter.insert(table, { ...row, id, created_at: row.created_at || now() })
      return id
    }
    const newId = uuid()
    await adapter.insert(table, { ...row, id: newId, created_at: now() })
    return newId
  }

  return {
    // 应用级单例在 App.vue onLaunch 启动一次；各页面 onShow 通过 await db.ready
    // 等待初始化完成，避免真机 SQLite 首次建表/插默认用户与首屏查询的竞态
    ready: null,
    async init() {
      if (this.ready) return this.ready
      this.ready = (async () => {
        await adapter.init(createAllTablesSql())
        // 老库升级：补充软删列（新库建表已含，ALTER 报错属预期，由 migrate 吞掉）
        await adapter.migrate([
          'ALTER TABLE "timeline" ADD COLUMN deleted_at TEXT',
          'ALTER TABLE "event" ADD COLUMN deleted_at TEXT'
        ])
        await ensureDefaultPerson()
        const def = await this.getDefaultPerson()
        if (def) await ensureMainTimeline(def.id)
        // 启动时清理过期回收站（默认保留 5 天）
        await this.purgeExpiredTrash()
      })()
      return this.ready
    },

    // ---------- person ----------
    async getPersons() {
      const rows = await adapter.all('person')
      return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },
    async getDefaultPerson() {
      const rows = await adapter.all('person')
      return rows.find((r) => r.is_default === 1) || rows[0] || null
    },
    async setDefaultPerson(id) {
      // 清除其他默认标记
      const persons = await adapter.all('person')
      for (const p of persons) {
        if (p.is_default === 1 && p.id !== id) {
          await adapter.update('person', p.id, { is_default: 0 })
        }
      }
      // 设置新的默认用户
      await adapter.update('person', id, { is_default: 1 })
    },
    async getPerson(id) {
      const rows = await adapter.all('person')
      return rows.find((r) => r.id === id) || null
    },
    async savePerson(p) {
      const id = await upsert('person', p.id, p, (id) => this.getPerson(id))
      await ensureMainTimeline(id)
      // 如果没有默认用户，将第一个设为默认
      const persons = await adapter.all('person')
      const hasDefault = persons.some(r => r.is_default === 1)
      if (!hasDefault && persons.length > 0) {
        await adapter.update('person', persons[0].id, { is_default: 1 })
      }
      return id
    },
    async deletePerson(id) {
      const person = await this.getPerson(id)
      if (person && person.is_default === 1) {
        throw new Error('默认用户不允许删除')
      }
      // 物理级联：人物删除时其全部时间线/动态（含回收站内）一并清除
      const all = await adapter.all('timeline')
      for (const tl of all.filter((r) => r.person_id === id)) await this.deleteTimeline(tl.id, true)
      await adapter.delete('person', id)
    },

    // ---------- timeline ----------
    async getTimelinesByPerson(personId) {
      const rows = await adapter.all('timeline')
      return rows.filter((r) => r.person_id === personId && !r.deleted_at).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },
    async getTimeline(id) {
      const rows = await adapter.all('timeline')
      return rows.find((r) => r.id === id && !r.deleted_at) || null
    },
    async getMainTimeline(personId) {
      const rows = await adapter.all('timeline')
      return rows.find((r) => r.person_id === personId && r.is_main === 1 && !r.deleted_at) || null
    },
    async saveTimeline(t) {
      const existing = t.id ? await this.getTimeline(t.id) : null
      // 主线改名时保留 is_main 标记
      if (existing && existing.is_main === 1) t = { ...t, is_main: 1 }
      return upsert('timeline', t.id, t, (id) => this.getTimeline(id))
    },
    async deleteTimeline(id, force = false) {
      const tl = await this.getTimeline(id)
      if (!force && tl && tl.is_main === 1) {
        throw new Error('主线不允许删除')
      }
      if (force) {
        // 物理删除：仅删除人物级联时使用（人物已删，回收站无意义）
        const all = await adapter.all('event')
        for (const ev of all.filter((r) => r.timeline_id === id)) {
          await adapter.deleteWhere('event_image', 'event_id', ev.id)
          await adapter.delete('event', ev.id)
        }
        await adapter.delete('timeline', id)
        return
      }
      // 软删除：时间线与它的动态一起进回收站，保留 5 天后自动清除
      const deleted = new Date().toISOString()
      await adapter.update('timeline', id, { deleted_at: deleted })
      const all = await adapter.all('event')
      for (const ev of all.filter((r) => r.timeline_id === id && !r.deleted_at)) {
        await adapter.update('event', ev.id, { deleted_at: deleted })
      }
    },

    // ---------- event ----------
    async getEventsByTimeline(timelineId) {
      const rows = await adapter.all('event')
      return rows
        .filter((r) => r.timeline_id === timelineId && !r.deleted_at)
        .sort((a, b) => (effectiveDate(a) < effectiveDate(b) ? -1 : effectiveDate(a) > effectiveDate(b) ? 1 : 0))
    },
    async getEvent(id) {
      const rows = await adapter.all('event')
      return rows.find((r) => r.id === id && !r.deleted_at) || null
    },
    async saveEvent(e) {
      const { images = [], ...row } = e
      const id = await upsert('event', e.id, row, (i) => this.getEvent(i))
      await adapter.deleteWhere('event_image', 'event_id', id)
      for (let i = 0; i < images.length; i++) {
        await adapter.insert('event_image', { id: uuid(), event_id: id, ...images[i], sort_order: i })
      }
      return id
    },
    async deleteEvent(id, force = false) {
      if (force) {
        await adapter.deleteWhere('event_image', 'event_id', id)
        await adapter.delete('event', id)
        return
      }
      // 软删除：动态进回收站，保留 5 天后自动清除
      await adapter.update('event', id, { deleted_at: new Date().toISOString() })
    },
    async getImagesByEvent(eventId) {
      const rows = await adapter.all('event_image')
      return rows.filter((r) => r.event_id === eventId).sort((a, b) => a.sort_order - b.sort_order)
    },

    // ---------- 前后动态：同时间线按日期排序，返回给定动态的上一条/下一条 ----------
    async getAdjacentEvents(eventId) {
      const ev = await this.getEvent(eventId)
      if (!ev) return { prev: null, next: null }
      const all = await this.getEventsByTimeline(ev.timeline_id)
      const idx = all.findIndex((e) => e.id === eventId)
      return { prev: idx > 0 ? all[idx - 1] : null, next: idx < all.length - 1 ? all[idx + 1] : null }
    },

    // ---------- search ----------
    async searchEvents(keyword) {
      const k = (keyword || '').trim().toLowerCase()
      if (!k) return []
      const rows = await adapter.all('event')
      return rows.filter((r) => !r.deleted_at && ((r.title || '') + ' ' + (r.description || '')).toLowerCase().includes(k))
    },

    // ---------- 时光机：查「历史上同月同日」（仅一年前及更早）的动态，按年份远近排序 ----------
    // 取动态生效日期（时间点取 date_point，时间段取 date_start）的 MM-DD 与今天相同的动态
    async getTodayEvents(personId) {
      const now = new Date()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const target = `${mm}-${dd}`
      const tls = await this.getTimelinesByPerson(personId)
      const tlIds = new Set(tls.map((t) => t.id))
      const rows = await adapter.all('event')
      return rows
        .filter((r) => tlIds.has(r.timeline_id) && !r.deleted_at)
        .map((r) => {
          const d = r.date_type === 'range' ? (r.date_start || '') : (r.date_point || '')
          return { ev: r, date: d }
        })
        // 历史上的今天：仅一年前及更早的同月同日（当年今天的记录不算历史）
        .filter((x) => x.date.length >= 10 && x.date.slice(5, 10) === target && Number(x.date.slice(0, 4)) < now.getFullYear())
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .map((x) => ({ ...x.ev, _year: x.date.slice(0, 4) }))
    },

    // ---------- 本月概览：当前用户本月新增动态数 + 最活跃时间线 ----------
    async getMonthOverview(personId) {
      const now = new Date()
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`
      const tls = await this.getTimelinesByPerson(personId)
      const rows = await adapter.all('event')
      const own = rows.filter((r) => !r.deleted_at && tls.some((t) => t.id === r.timeline_id))
      const monthCount = own.filter((r) => {
        const d = r.date_type === 'range' ? (r.date_start || '') : (r.date_point || '')
        return d.startsWith(prefix)
      }).length
      // 最活跃时间线：当前用户各时间线动态数最多者
      let active = null
      let max = -1
      for (const tl of tls) {
        const n = own.filter((r) => r.timeline_id === tl.id).length
        if (n > max) { max = n; active = tl }
      }
      return { monthCount, activeTimeline: max <= 0 ? null : active, activeCount: max < 0 ? 0 : max }
    },

    // ---------- 回收站：软删除的时间线/动态，默认保留 5 天，到期自动清除 ----------
    async getTrash() {
      const tls = await adapter.all('timeline')
      const evs = await adapter.all('event')
      const persons = await adapter.all('person')
      const pName = (id) => (persons.find((p) => p.id === id) || {}).name || '已删除档案'
      const tlName = (id) => (tls.find((t) => t.id === id) || {}).name || '已删除时间线'
      const desc = (a, b) => ((a.deleted_at || '') < (b.deleted_at || '') ? 1 : -1)
      return {
        timelines: tls.filter((t) => t.deleted_at).map((t) => ({ ...t, _person: pName(t.person_id) })).sort(desc),
        events: evs.filter((e) => e.deleted_at).map((e) => ({ ...e, _timeline: tlName(e.timeline_id) })).sort(desc)
      }
    },
    async restoreTimeline(id) {
      await adapter.update('timeline', id, { deleted_at: null })
      // 一并恢复随时间线删除的动态
      const all = await adapter.all('event')
      for (const ev of all.filter((r) => r.timeline_id === id && r.deleted_at)) {
        await adapter.update('event', ev.id, { deleted_at: null })
      }
    },
    async restoreEvent(id) {
      await adapter.update('event', id, { deleted_at: null })
    },
    async purgeTimeline(id) {
      const all = await adapter.all('event')
      for (const ev of all.filter((r) => r.timeline_id === id)) {
        await adapter.deleteWhere('event_image', 'event_id', ev.id)
        await adapter.delete('event', ev.id)
      }
      await adapter.delete('timeline', id)
    },
    async purgeEvent(id) {
      await adapter.deleteWhere('event_image', 'event_id', id)
      await adapter.delete('event', id)
    },
    // 清理过期回收站：deleted_at 距今超过 days 天的彻底删除（启动时与打开回收站时调用）
    async purgeExpiredTrash(days = 5) {
      const cutoff = Date.now() - days * 24 * 3600 * 1000
      const tls = await adapter.all('timeline')
      for (const t of tls) {
        if (t.deleted_at && new Date(t.deleted_at).getTime() < cutoff) await this.purgeTimeline(t.id)
      }
      const evs = await adapter.all('event')
      for (const e of evs) {
        if (e.deleted_at && new Date(e.deleted_at).getTime() < cutoff) await this.purgeEvent(e.id)
      }
    }
  }
}

// 应用级默认单例：App 端用 plus.sqlite，其余（H5/测试/Node）用内存适配器。
export const db = createDb(resolveAdapter())
