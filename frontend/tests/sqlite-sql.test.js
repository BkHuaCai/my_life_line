import { describe, it, expect, afterEach } from 'vitest'
import { createSqliteAdapter } from '../src/utils/storage'
import { createDb } from '../src/utils/db'

// 用桩 plus.sqlite 记录适配器生成的 SQL，验证 App 端（plus.sqlite）产出的语句合法：
// 之前 update/delete/deleteWhere 把 esc() 的值再包一层引号，生成 WHERE id=''xxx'' 的非法 SQL，
// 导致 App 端 saveEvent 在清理 event_image 时抛错、初始点弹窗保存后不关闭（H5 内存适配器不报错）。
function stubPlusSqlite() {
  const sqls = []
  global.plus = {
    sqlite: {
      isOpenDatabase: () => true,
      openDatabase: () => {},
      executeSql: ({ sql, success }) => {
        sqls.push(sql)
        success()
      },
      selectSql: ({ sql, success }) => {
        sqls.push(sql)
        success([])
      }
    }
  }
  return sqls
}

afterEach(() => {
  delete global.plus
})

describe('sqliteAdapter SQL 生成', () => {
  it('insert 生成完整 INSERT 语句（NULL 不包引号）', async () => {
    const sqls = stubPlusSqlite()
    const adapter = createSqliteAdapter()
    await adapter.insert('event', {
      id: 'e1',
      timeline_id: 't1',
      title: '起点',
      description: null,
      date_type: 'point',
      date_point: '2026-08-14'
    })
    expect(sqls[0]).toBe(
      `INSERT INTO "event" ("id","timeline_id","title","description","date_type","date_point") VALUES ('e1','t1','起点',NULL,'point','2026-08-14')`
    )
  })

  it('update 的 WHERE 只包一层引号', async () => {
    const sqls = stubPlusSqlite()
    const adapter = createSqliteAdapter()
    await adapter.update('person', 'p1', { name: '小红' })
    expect(sqls[0]).toBe(`UPDATE "person" SET "name"='小红' WHERE id='p1'`)
  })

  it('delete 的 WHERE 只包一层引号', async () => {
    const sqls = stubPlusSqlite()
    const adapter = createSqliteAdapter()
    await adapter.delete('person', 'p1')
    expect(sqls[0]).toBe(`DELETE FROM "person" WHERE id='p1'`)
  })

  it('deleteWhere 的 WHERE 只包一层引号', async () => {
    const sqls = stubPlusSqlite()
    const adapter = createSqliteAdapter()
    await adapter.deleteWhere('event_image', 'event_id', 'e1')
    expect(sqls[0]).toBe(`DELETE FROM "event_image" WHERE "event_id"='e1'`)
  })

  it('saveEvent 全流程（插入事件 + 清理关联图）不抛错', async () => {
    const sqls = stubPlusSqlite()
    const adapter = createSqliteAdapter()
    const db = createDb(adapter)
    const id = await db.saveEvent({ timeline_id: 't1', title: '起点', date_type: 'point', date_point: '2026-08-14' })
    expect(id).toBeTruthy()
    expect(sqls[0]).toContain('INSERT INTO "event"')
    expect(sqls[1]).toBe(`DELETE FROM "event_image" WHERE "event_id"='${id}'`)
  })
})
