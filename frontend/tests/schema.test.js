import { describe, it, expect } from 'vitest'
import { TABLES, createTableSql, createAllTablesSql } from '../src/utils/schema'

describe('schema', () => {
  it('定义了四张表', () => {
    expect(Object.keys(TABLES).sort()).toEqual(['event', 'event_image', 'person', 'timeline'])
  })
  it('person 表包含核心列', () => {
    const cols = Object.keys(TABLES.person.columns)
    expect(cols).toContain('id')
    expect(cols).toContain('name')
  })
  it('event 表支持时间点/时间段/至今', () => {
    const cols = Object.keys(TABLES.event.columns)
    expect(cols).toEqual(expect.arrayContaining(['date_type', 'date_point', 'date_start', 'date_end']))
  })
  it('生成 CREATE TABLE 语句', () => {
    const sql = createTableSql(TABLES.person)
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "person"')
    expect(sql).toContain('"id" TEXT PRIMARY KEY')
  })
  it('生成全部建表语句且互不重复表名', () => {
    const all = createAllTablesSql()
    expect(all.length).toBe(4)
    const names = all.map((s) => s.match(/TABLE IF NOT EXISTS "([a-z_]+)"/)[1])
    expect(new Set(names).size).toBe(4)
  })
})
