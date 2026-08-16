// 内存适配器：纯 JS、零平台依赖，用于单元测试与 H5 兜底。
export function createMemoryAdapter() {
  const tables = new Map()
  const ensure = (t) => {
    if (!tables.has(t)) tables.set(t, [])
  }
  return {
    async init() {
      // memory 模式无需建表，懒创建即可
    },
    async migrate() {
      // memory 无固定 schema，无需迁移
    },
    async insert(table, row) {
      ensure(table)
      tables.get(table).push({ ...row })
    },
    async update(table, id, patch) {
      ensure(table)
      const rows = tables.get(table)
      const i = rows.findIndex((r) => r.id === id)
      if (i >= 0) rows[i] = { ...rows[i], ...patch }
    },
    async delete(table, id) {
      ensure(table)
      tables.set(table, tables.get(table).filter((r) => r.id !== id))
    },
    async deleteWhere(table, field, value) {
      ensure(table)
      tables.set(table, tables.get(table).filter((r) => r[field] !== value))
    },
    async all(table) {
      ensure(table)
      return tables.get(table).map((r) => ({ ...r }))
    }
  }
}

// SQLite 适配器：包装 plus.sqlite，仅真机 App 环境可用。
// 注意：SQL 值一律走 esc() 转义，防注入。
function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

export function createSqliteAdapter() {
  const DB_NAME = 'my_life_line'
  const DB_PATH = '_doc'
  // plus.sqlite.openDatabase 是异步的：首次打开时若不等 success 回调就执行
  // executeSql/selectSql，真机上会报「数据库未打开」。这里把 open 包成 Promise
  // 并缓存，保证后续所有 SQL 都等数据库真正打开后再执行。
  let opening = null
  const open = () => {
    if (plus.sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })) return Promise.resolve()
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        plus.sqlite.openDatabase({
          name: DB_NAME,
          path: DB_PATH,
          success: resolve,
          fail: (e) => {
            opening = null // 允许失败后重试
            reject(e)
          }
        })
      })
    }
    return opening
  }
  const exec = async (sql) => {
    await open()
    return new Promise((resolve, reject) => {
      plus.sqlite.executeSql({ name: DB_NAME, sql, success: () => resolve(), fail: reject })
    })
  }
  return {
    async init(createStatements) {
      for (const sql of createStatements) await exec(sql)
    },
    // 迁移语句逐个执行并忽略失败：老库 ALTER 加列成功，新库列已存在时报错属预期
    async migrate(statements) {
      for (const sql of statements) {
        try {
          await exec(sql)
        } catch (e) {
          console.warn('migrate skip:', e && e.message ? e.message : e)
        }
      }
    },
    async insert(table, row) {
      const cols = Object.keys(row)
      const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map((c) => esc(row[c])).join(',')})`
      await exec(sql)
    },
    async update(table, id, patch) {
      const sets = Object.entries(patch).map(([c, v]) => `"${c}"=${esc(v)}`).join(',')
      await exec(`UPDATE "${table}" SET ${sets} WHERE id=${esc(id)}`)
    },
    async delete(table, id) {
      await exec(`DELETE FROM "${table}" WHERE id=${esc(id)}`)
    },
    async deleteWhere(table, field, value) {
      await exec(`DELETE FROM "${table}" WHERE "${field}"=${esc(value)}`)
    },
    async all(table) {
      await open()
      return new Promise((resolve, reject) => {
        plus.sqlite.selectSql({ name: DB_NAME, sql: `SELECT * FROM "${table}"`, success: (data) => resolve(data), fail: reject })
      })
    }
  }
}

// 环境探测：App 端用 SQLite，其余（H5/测试/Node）用内存适配器。
export function resolveAdapter() {
  // eslint-disable-next-line no-undef
  return typeof plus !== 'undefined' && plus.sqlite ? createSqliteAdapter() : createMemoryAdapter()
}
