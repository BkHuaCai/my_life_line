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
        await ensureDefaultPerson()
        const def = await this.getDefaultPerson()
        if (def) await ensureMainTimeline(def.id)
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
      const timelines = await this.getTimelinesByPerson(id)
      for (const tl of timelines) await this.deleteTimeline(tl.id, true) // 删除人物时允许级联删除其主线
      await adapter.delete('person', id)
    },

    // ---------- timeline ----------
    async getTimelinesByPerson(personId) {
      const rows = await adapter.all('timeline')
      return rows.filter((r) => r.person_id === personId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },
    async getTimeline(id) {
      const rows = await adapter.all('timeline')
      return rows.find((r) => r.id === id) || null
    },
    async getMainTimeline(personId) {
      const rows = await adapter.all('timeline')
      return rows.find((r) => r.person_id === personId && r.is_main === 1) || null
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
      const events = await this.getEventsByTimeline(id)
      for (const ev of events) await this.deleteEvent(ev.id)
      await adapter.delete('timeline', id)
    },

    // ---------- event ----------
    async getEventsByTimeline(timelineId) {
      const rows = await adapter.all('event')
      return rows
        .filter((r) => r.timeline_id === timelineId)
        .sort((a, b) => (effectiveDate(a) < effectiveDate(b) ? -1 : effectiveDate(a) > effectiveDate(b) ? 1 : 0))
    },
    async getEvent(id) {
      const rows = await adapter.all('event')
      return rows.find((r) => r.id === id) || null
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
    async deleteEvent(id) {
      await adapter.deleteWhere('event_image', 'event_id', id)
      await adapter.delete('event', id)
    },
    async getImagesByEvent(eventId) {
      const rows = await adapter.all('event_image')
      return rows.filter((r) => r.event_id === eventId).sort((a, b) => a.sort_order - b.sort_order)
    },

    // ---------- search ----------
    async searchEvents(keyword) {
      const k = (keyword || '').trim().toLowerCase()
      if (!k) return []
      const rows = await adapter.all('event')
      return rows.filter((r) => ((r.title || '') + ' ' + (r.description || '')).toLowerCase().includes(k))
    }
  }
}

// 应用级默认单例：App 端用 plus.sqlite，其余（H5/测试/Node）用内存适配器。
export const db = createDb(resolveAdapter())
