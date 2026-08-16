import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryAdapter } from '../src/utils/storage'
import { createDb } from '../src/utils/db'

let db
beforeEach(async () => {
  db = createDb(createMemoryAdapter())
  await db.init()
})

describe('db.person', () => {
  it('保存并读取人物', async () => {
    const id = await db.savePerson({ name: '小明' })
    const p = await db.getPerson(id)
    expect(p.name).toBe('小明')
    expect(p.id).toBe(id)
  })
  it('编辑已存在人物不改变 id', async () => {
    const before = (await db.getPersons()).length // init 已自动创建默认用户
    const id = await db.savePerson({ name: '小明' })
    await db.savePerson({ id, name: '小红' })
    expect((await db.getPerson(id)).name).toBe('小红')
    expect((await db.getPersons()).length).toBe(before + 1)
  })
})

describe('db.timeline', () => {
  it('按人物查询时间线', async () => {
    const pid = await db.savePerson({ name: '小明' })
    await db.saveTimeline({ person_id: pid, name: '成长', category: '教育' })
    const list = await db.getTimelinesByPerson(pid)
    expect(list.length).toBe(2) // 自动创建的「主线」+ 新建的「成长」
    expect(list.find((t) => t.name === '成长').category).toBe('教育')
  })
})

describe('db.event', () => {
  it('保存时间点事件并可按时间排序', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = await db.saveTimeline({ person_id: pid, name: '成长' })
    await db.saveEvent({ timeline_id: tid, title: '毕业', date_type: 'point', date_point: '2019-06-30' })
    await db.saveEvent({ timeline_id: tid, title: '入学', date_type: 'point', date_point: '2015-09-01' })
    const events = await db.getEventsByTimeline(tid)
    expect(events.map((e) => e.title)).toEqual(['入学', '毕业'])
  })
  it('保存时间段事件 date_end 可为空表示至今', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = await db.saveTimeline({ person_id: pid, name: '工作' })
    await db.saveEvent({ timeline_id: tid, title: '在职', date_type: 'range', date_start: '2020-01-01', date_end: null })
    const events = await db.getEventsByTimeline(tid)
    expect(events[0].date_end).toBeNull()
  })
})

describe('db.event_image', () => {
  it('替换事件图片：先删旧再存新', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = await db.saveTimeline({ person_id: pid, name: '成长' })
    const eid = await db.saveEvent({ timeline_id: tid, title: '毕业', date_type: 'point', date_point: '2019-06-30' })
    await db.saveEvent({ ...(await db.getEvent(eid)), images: [{ image_path: 'a.jpg', thumb_path: 'a_t.jpg' }] })
    await db.saveEvent({ ...(await db.getEvent(eid)), images: [{ image_path: 'b.jpg', thumb_path: 'b_t.jpg' }] })
    const imgs = await db.getImagesByEvent(eid)
    expect(imgs.length).toBe(1)
    expect(imgs[0].image_path).toBe('b.jpg')
  })
})

describe('db.delete', () => {
  it('删除人物级联删除其时间线与事件', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = await db.saveTimeline({ person_id: pid, name: '成长' })
    await db.saveEvent({ timeline_id: tid, title: '毕业', date_type: 'point', date_point: '2019-06-30' })
    await db.deletePerson(pid)
    expect(await db.getPerson(pid)).toBeNull()
    expect((await db.getTimelinesByPerson(pid)).length).toBe(0)
  })
})

describe('db.search', () => {
  it('按标题或描述关键词搜索事件', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = await db.saveTimeline({ person_id: pid, name: '成长' })
    await db.saveEvent({ timeline_id: tid, title: '第一次旅行', description: '去了杭州', date_type: 'point', date_point: '2018-05-01' })
    await db.saveEvent({ timeline_id: tid, title: '加班', description: '在杭州出差', date_type: 'point', date_point: '2019-01-01' })
    const byTitle = await db.searchEvents('旅行')
    const byDesc = await db.searchEvents('出差')
    expect(byTitle.length).toBe(1)
    expect(byTitle[0].title).toBe('第一次旅行')
    expect(byDesc.length).toBe(1)
    expect(byDesc[0].title).toBe('加班')
  })
})

describe('db.default person', () => {
  it('首次 init 自动创建默认用户', async () => {
    const persons = await db.getPersons()
    expect(persons.length).toBe(1)
    expect(persons[0].is_default).toBe(1)
    expect(persons[0].name).toBe('我')
  })
  it('已有用户时再次 init 不重复创建', async () => {
    await db.init()
    expect((await db.getPersons()).length).toBe(1)
  })
  it('默认用户不允许删除', async () => {
    const def = await db.getDefaultPerson()
    await expect(db.deletePerson(def.id)).rejects.toThrow('默认用户不允许删除')
    expect(await db.getPerson(def.id)).not.toBeNull()
  })
  it('非默认用户仍可删除', async () => {
    const pid = await db.savePerson({ name: '小明' })
    await db.deletePerson(pid)
    expect(await db.getPerson(pid)).toBeNull()
  })
})

describe('db.main timeline', () => {
  it('创建用户时自动生成默认「主线」', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const main = await db.getMainTimeline(pid)
    expect(main).toBeTruthy()
    expect(main.name).toBe('主线')
    expect(main.is_main).toBe(1)
  })
  it('默认用户「我」也有主线', async () => {
    const def = await db.getDefaultPerson()
    const main = await db.getMainTimeline(def.id)
    expect(main).toBeTruthy()
  })
  it('主线不允许删除', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const main = await db.getMainTimeline(pid)
    await expect(db.deleteTimeline(main.id)).rejects.toThrow('主线不允许删除')
    expect(await db.getTimeline(main.id)).not.toBeNull()
  })
  it('主线改名后仍保留 is_main 标记', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const main = await db.getMainTimeline(pid)
    await db.saveTimeline({ id: main.id, person_id: pid, name: '人生大事' })
    const updated = await db.getTimeline(main.id)
    expect(updated.name).toBe('人生大事')
    expect(updated.is_main).toBe(1)
  })
  it('删除人物时级联删除其主线', async () => {
    const pid = await db.savePerson({ name: '小明' })
    await db.deletePerson(pid)
    expect((await db.getTimelinesByPerson(pid)).length).toBe(0)
  })
})

describe('db.getTodayEvents', () => {
  // 用真实今天的月日生成事件日期，避免 mock Date 原型（ESM 严格模式下只读、赋值静默失败）
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')

  it('返回历史上同月同日的事件，按年份远近排序', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = (await db.getMainTimeline(pid)).id
    await db.saveEvent({ timeline_id: tid, title: '出生', date_type: 'point', date_point: `1990-${mm}-${dd}` })
    await db.saveEvent({ timeline_id: tid, title: '毕业', date_type: 'point', date_point: `2010-${mm}-${dd}` })
    // 同年同月但非同日的不应命中
    const otherDay = dd === '15' ? '14' : '15'
    await db.saveEvent({ timeline_id: tid, title: '入学', date_type: 'point', date_point: `2010-${mm}-${otherDay}` })
    const list = await db.getTodayEvents(pid)
    expect(list.map((e) => e.title)).toEqual(['出生', '毕业'])
    expect(list[0]._year).toBe('1990')
  })
  it('时间段事件取 date_start 的 MM-DD 做命中判断', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = (await db.getMainTimeline(pid)).id
    await db.saveEvent({ timeline_id: tid, title: '在职', date_type: 'range', date_start: `2020-${mm}-${dd}`, date_end: null })
    const list = await db.getTodayEvents(pid)
    expect(list.length).toBe(1)
    expect(list[0].title).toBe('在职')
  })
  it('只查当前用户的时间线内事件，不含他人', async () => {
    const me = await db.savePerson({ name: '我' })
    const other = await db.savePerson({ name: '他' })
    const myTl = (await db.getMainTimeline(me)).id
    const otherTl = (await db.getMainTimeline(other)).id
    await db.saveEvent({ timeline_id: myTl, title: '我的', date_type: 'point', date_point: `2010-${mm}-${dd}` })
    await db.saveEvent({ timeline_id: otherTl, title: '他的', date_type: 'point', date_point: `2010-${mm}-${dd}` })
    const list = await db.getTodayEvents(me)
    expect(list.length).toBe(1)
    expect(list[0].title).toBe('我的')
  })
})

describe('db.getMonthOverview', () => {
  it('本月新增事件数 + 最活跃时间线', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const mainId = (await db.getMainTimeline(pid)).id
    const otherId = await db.saveTimeline({ person_id: pid, name: '工作' })
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    // 上月日期：把月份数减 1 后再 padStart，避免 Number('08')-1=7 不补零
    const lastMonth = String((now.getMonth() + 1 - 1 + 12) % 12).padStart(2, '0')
    // 本月主线 1 + 工作 1，上月工作 1 → 工作 2 条最活跃
    await db.saveEvent({ timeline_id: mainId, title: '本月A', date_type: 'point', date_point: `${y}-${m}-10` })
    await db.saveEvent({ timeline_id: otherId, title: '本月B', date_type: 'point', date_point: `${y}-${m}-20` })
    await db.saveEvent({ timeline_id: otherId, title: '上月', date_type: 'point', date_point: `${y}-${lastMonth}-05` })
    const ov = await db.getMonthOverview(pid)
    expect(ov.monthCount).toBe(2)
    expect(ov.activeTimeline).not.toBeNull()
    expect(ov.activeCount).toBe(2)
  })
  it('无事件时 activeTimeline 为 null、activeCount 为 0', async () => {
    const ov = await db.getMonthOverview((await db.savePerson({ name: '空' })))
    expect(ov.monthCount).toBe(0)
    expect(ov.activeTimeline).toBeNull()
    expect(ov.activeCount).toBe(0)
  })
})

describe('db.getAdjacentEvents', () => {
  it('同时间线按日期排序返回前后事件', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = (await db.getMainTimeline(pid)).id
    const e1 = await db.saveEvent({ timeline_id: tid, title: '入学', date_type: 'point', date_point: '2015-09-01' })
    const e2 = await db.saveEvent({ timeline_id: tid, title: '毕业', date_type: 'point', date_point: '2019-06-30' })
    const e3 = await db.saveEvent({ timeline_id: tid, title: '读研', date_type: 'point', date_point: '2020-09-01' })
    const mid = await db.getAdjacentEvents(e2)
    expect(mid.prev.id).toBe(e1)
    expect(mid.next.id).toBe(e3)
    const head = await db.getAdjacentEvents(e1)
    expect(head.prev).toBeNull()
    expect(head.next.id).toBe(e2)
    const tail = await db.getAdjacentEvents(e3)
    expect(tail.prev.id).toBe(e2)
    expect(tail.next).toBeNull()
  })
  it('事件不存在时返回 prev/next 皆 null', async () => {
    const adj = await db.getAdjacentEvents('不存在的-id')
    expect(adj.prev).toBeNull()
    expect(adj.next).toBeNull()
  })
})

describe('db.trash 回收站', () => {
  it('删除事件进回收站，恢复后回到时间线', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = (await db.getMainTimeline(pid)).id
    const eid = await db.saveEvent({ timeline_id: tid, title: '毕业', date_type: 'point', date_point: '2019-06-30' })
    await db.deleteEvent(eid)
    expect(await db.getEvent(eid)).toBeNull()
    expect((await db.getEventsByTimeline(tid)).length).toBe(0)
    expect((await db.getTrash()).events.some((e) => e.id === eid)).toBe(true)
    await db.restoreEvent(eid)
    expect((await db.getEvent(eid)).title).toBe('毕业')
    expect((await db.getTrash()).events.length).toBe(0)
  })
  it('删除时间线连同其事件进回收站，恢复后一起回来', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = await db.saveTimeline({ person_id: pid, name: '成长' })
    const eid = await db.saveEvent({ timeline_id: tid, title: '入学', date_type: 'point', date_point: '2015-09-01' })
    await db.deleteTimeline(tid)
    expect((await db.getTimelinesByPerson(pid)).length).toBe(1) // 只剩主线
    const trash = await db.getTrash()
    expect(trash.timelines.some((t) => t.id === tid)).toBe(true)
    expect(trash.events.some((e) => e.id === eid)).toBe(true)
    await db.restoreTimeline(tid)
    expect((await db.getTimeline(tid)).name).toBe('成长')
    expect((await db.getEventsByTimeline(tid)).length).toBe(1)
  })
  it('彻底删除立即从回收站清除', async () => {
    const pid = await db.savePerson({ name: '小明' })
    const tid = await db.saveTimeline({ person_id: pid, name: '成长' })
    const eid = await db.saveEvent({ timeline_id: tid, title: '入学', date_type: 'point', date_point: '2015-09-01' })
    await db.deleteEvent(eid)
    await db.purgeEvent(eid)
    expect((await db.getTrash()).events.length).toBe(0)
    await db.deleteTimeline(tid)
    await db.purgeTimeline(tid)
    expect((await db.getTrash()).timelines.length).toBe(0)
  })
  it('过期回收站自动清除，未过期保留', async () => {
    // 独立 db + 暴露 adapter，便于把 deleted_at 改到 6 天前模拟过期
    const adapter = createMemoryAdapter()
    const db2 = createDb(adapter)
    await db2.init()
    const pid = await db2.savePerson({ name: '小明' })
    const tid = await db2.saveTimeline({ person_id: pid, name: '成长' })
    const old = await db2.saveEvent({ timeline_id: tid, title: '旧事件', date_type: 'point', date_point: '2015-01-01' })
    const fresh = await db2.saveEvent({ timeline_id: tid, title: '新事件', date_type: 'point', date_point: '2016-01-01' })
    await db2.deleteEvent(old)
    await db2.deleteEvent(fresh)
    await adapter.update('event', old, { deleted_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString() })
    await db2.purgeExpiredTrash()
    const trash = await db2.getTrash()
    expect(trash.events.some((e) => e.id === old)).toBe(false)
    expect(trash.events.some((e) => e.id === fresh)).toBe(true)
    expect((await adapter.all('event')).length).toBe(1) // 旧事件已物理删除
  })
})
