import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryAdapter } from '../src/utils/storage'
import { createDb } from '../src/utils/db'
import { serialize, importData } from '../src/utils/export'

let db
beforeEach(async () => {
  db = createDb(createMemoryAdapter())
  await db.init()
})

async function seed() {
  const pid = await db.savePerson({ name: '小明', note: '测试' })
  const tid = await db.saveTimeline({ person_id: pid, name: '成长', category: '教育' })
  const eid = await db.saveEvent({
    timeline_id: tid,
    title: '毕业',
    description: '本科毕业',
    date_type: 'point',
    date_point: '2019-06-30',
    images: [{ image_path: 'a.jpg', thumb_path: 'a_t.jpg' }]
  })
  return { pid, tid, eid }
}

describe('export/import', () => {
  it('serialize 输出嵌套结构并保留 id', async () => {
    await seed()
    const data = await serialize(db)
    expect(data.version).toBe(1)
    const xm = data.persons.find((p) => p.name === '小明')
    expect(xm).toBeTruthy()
    expect(xm.timelines[0].events[0].title).toBe('毕业')
    expect(xm.id).toBeTruthy()
  })
  it('round-trip：导出后再导入新库，数据等价', async () => {
    await seed()
    const data = await serialize(db)
    const xm = data.persons.find((p) => p.name === '小明')
    const db2 = createDb(createMemoryAdapter())
    await db2.init()
    await importData(db2, data)
    const p2 = await db2.getPerson(xm.id)
    expect(p2.name).toBe('小明')
    const tls = await db2.getTimelinesByPerson(p2.id)
    expect(tls.length).toBe(1)
    const evs = await db2.getEventsByTimeline(tls[0].id)
    expect(evs[0].title).toBe('毕业')
    expect((await db2.getImagesByEvent(evs[0].id)).length).toBe(1)
  })
  it('重复导入不产生重复数据（按 id 幂等）', async () => {
    await seed()
    const data = await serialize(db)
    const before = (await db.getPersons()).length // 含自动创建的默认用户
    await importData(db, data)
    expect((await db.getPersons()).length).toBe(before)
    const xm = data.persons.find((p) => p.name === '小明')
    const tls = await db.getTimelinesByPerson(xm.id)
    expect((await db.getEventsByTimeline(tls[0].id)).length).toBe(1)
  })
})
