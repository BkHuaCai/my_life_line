import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryAdapter } from '../src/utils/storage'

let adapter
beforeEach(async () => {
  adapter = createMemoryAdapter()
})

describe('memoryAdapter', () => {
  it('insert 后可 all 读出', async () => {
    await adapter.init([])
    await adapter.insert('person', { id: 'a', name: '小明' })
    const rows = await adapter.all('person')
    expect(rows).toEqual([{ id: 'a', name: '小明' }])
  })
  it('update 按 id 覆盖部分字段', async () => {
    await adapter.init([])
    await adapter.insert('person', { id: 'a', name: '小明', note: null })
    await adapter.update('person', 'a', { name: '小红' })
    const rows = await adapter.all('person')
    expect(rows[0]).toEqual({ id: 'a', name: '小红', note: null })
  })
  it('delete 与 deleteWhere 生效', async () => {
    await adapter.init([])
    await adapter.insert('event_image', { id: 'i1', event_id: 'e1' })
    await adapter.insert('event_image', { id: 'i2', event_id: 'e1' })
    await adapter.deleteWhere('event_image', 'event_id', 'e1')
    expect((await adapter.all('event_image')).length).toBe(0)
    await adapter.insert('person', { id: 'p1' })
    await adapter.delete('person', 'p1')
    expect((await adapter.all('person')).length).toBe(0)
  })
  it('all 返回副本，修改返回数组不影响内部数据', async () => {
    await adapter.init([])
    await adapter.insert('person', { id: 'a' })
    const rows = await adapter.all('person')
    rows[0].name = 'hacked'
    expect((await adapter.all('person'))[0].name).toBeUndefined()
  })
})
