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
    const id = await db.savePerson({ name: '小明' })
    await db.savePerson({ id, name: '小红' })
    expect((await db.getPerson(id)).name).toBe('小红')
    expect((await db.getPersons()).length).toBe(1)
  })
})

describe('db.timeline', () => {
  it('按人物查询时间线', async () => {
    const pid = await db.savePerson({ name: '小明' })
    await db.saveTimeline({ person_id: pid, name: '成长', category: '教育' })
    const list = await db.getTimelinesByPerson(pid)
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('成长')
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
