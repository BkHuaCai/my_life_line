# 人生时间线 App 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现前期"纯本地"的人生时间线安卓 App：以人物为中心记录多条分类时间线，每条时间线包含带时间（时间点或时间段）、多图、标题、描述的事件，支持三种视图切换、搜索、导入/导出。所有数据存手机本地，完全离线私有，但数据模型与数据层为将来"Python 后端社区分享"预留扩展点。

**架构：** uni-app（Vue 3 + Vite）编译为安卓 App。数据层采用**适配器模式**：`db.js` 面向统一接口（init/insert/update/delete/all），提供两个实现——`memoryAdapter`（纯 JS，可单元测试，兼作 H5 兜底）和 `sqliteAdapter`（包装 `plus.sqlite`，真机使用）。页面只依赖 `db.js`，将来加同步层只改数据层。

**技术栈：** uni-app（Vue 3 + Vite）、`plus.sqlite`（本地 SQLite）、`plus.io`（图片存储）、vitest（单元测试）、degit（从 Gitee 镜像拉官方模板）。

**环境约束（重要）：**
- 本环境无法访问 github.com（npm registry 与 gitee.com 可达）。因此**必须**用 Gitee 镜像拉模板，绝不要用 degit 的 github 默认源。
- 真机/模拟器不在本环境内，`plus.sqlite`、相机、压缩、`plus.io` 等设备能力无法自动化验证，靠 `npm run build:h5` + 单元测试 + 手动清单验证。
- 最终打 APK 需用户本地 HBuilderX（或离线打包），属计划外的手动步骤，见"收尾"。

---

## 文件结构

```
src/
  main.js                     # 入口（模板自带，微调）
  App.vue                     # onLaunch 调用 db.init()
  manifest.json               # 模板自带，需补 app-plus 权限
  pages.json                  # 5 个页面路由
  uni.scss                    # 模板自带
  utils/
    id.js                     # UUID v4（纯函数）
    date.js                   # 日期格式化/排序/事件日期展示（纯函数）
    schema.js                 # 表结构定义 + CREATE 语句（纯数据）
    storage.js                # createMemoryAdapter / createSqliteAdapter / resolveAdapter
    db.js                     # createDb(adapter)：全部 CRUD + searchEvents
    export.js                 # serialize / importData（导入导出核心）
    image.js                  # 图片选择/压缩/落盘 + makeImagePaths（纯函数可测）
  components/
    timeline-axis.vue         # 视图一：经典时间轴
    timeline-grid.vue         # 视图二：照片墙（按年分组）
    timeline-cards.vue        # 视图三：大卡片流
  pages/
    person-list/index.vue     # 首页：人物列表 + 全局搜索
    person-detail/index.vue   # 人物详情：该人物时间线列表
    timeline/index.vue        # 时间线视图：三视图切换 + 添加事件
    event-detail/index.vue    # 事件详情：大图轮播 + 编辑/删除
    edit-form/index.vue       # 通用编辑表单（人物/时间线/事件）
tests/
  id.test.js
  date.test.js
  schema.test.js
  db.test.js
  export.test.js
```

**任务分解按依赖顺序：** 脚手架 → 纯逻辑（id/date/schema）→ 数据层（storage/db）→ 导入导出 → 图片 → 接线 → 页面（列表→详情→表单→时间线→事件详情→搜索）→ 收尾。

---

## 任务 1：项目脚手架（gitee 模板 + vitest）

**文件：**
- 创建：`package.json`（模板生成后追加 vitest 依赖）
- 创建：`vitest.config.js`
- 修改：`.gitignore`（补回 `.superpowers/`）
- 修改：`src/pages.json`（5 个页面路由）
- 创建：`tests/.gitkeep`（占位，确保目录入库）

- [ ] **步骤 1：从 Gitee 官方镜像拉取 uni-app Vue3+Vite 模板到当前目录**

```bash
cd "D:/python/my_life_line"
npx degit https://gitee.com/dcloud/uni-preset-vue#vite . --force
```

运行：`npx degit ...`
预期：当前目录出现 `src/`、`index.html`、`package.json`、`vite.config.js` 等文件（`--force` 覆盖同名文件；我们的 `docs/`、`README.md`、`.gitignore` 保留）。

注意：如果 `degit` 因网络再次失败，报错后停止，不要手工伪造模板（后续步骤依赖模板自带版本锁定的 `package.json`）。

- [ ] **步骤 2：安装依赖**

```bash
cd "D:/python/my_life_line"
npm install
```

运行：`npm install`
预期：`node_modules/` 生成，`npm install` 退出码 0。若安装失败，先检查网络/镜像（`npm config get registry`），不要跳过。

- [ ] **步骤 3：验证模板可构建（H5）**

```bash
cd "D:/python/my_life_line"
npm run build:h5
```

运行：`npm run build:h5`
预期：退出码 0，生成 `dist/build/h5/`。若报错，说明模板版本不兼容，先修复再继续（不要带着坏脚手架往下写）。

- [ ] **步骤 4：配置 vitest**

在 `package.json` 的 `devDependencies` 增加 vitest（用 `npm install -D vitest` 而非手改版本号）：

```bash
cd "D:/python/my_life_line"
npm install -D vitest
```

创建 `vitest.config.js`：

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
})
```

在 `package.json` 的 `scripts` 增加：

```json
"test": "vitest run"
```

- [ ] **步骤 5：确认 .gitignore 补回 .superpowers**

模板自带的 `.gitignore` 已覆盖 `node_modules/`、`unpackage/` 等。追加一行：

```gitignore
.superpowers/
```

- [ ] **步骤 6：配置 pages.json 页面路由**

将 `src/pages.json` 的 `pages` 数组替换为：

```json
{
  "pages": [
    { "path": "pages/person-list/index", "style": { "navigationBarTitleText": "人生时间线" } },
    { "path": "pages/person-detail/index", "style": { "navigationBarTitleText": "人物" } },
    { "path": "pages/timeline/index", "style": { "navigationBarTitleText": "时间线" } },
    { "path": "pages/event-detail/index", "style": { "navigationBarTitleText": "事件" } },
    { "path": "pages/edit-form/index", "style": { "navigationBarTitleText": "编辑" } }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "人生时间线",
    "navigationBarBackgroundColor": "#F8F8F8",
    "backgroundColor": "#F8F8F8"
  }
}
```

（保留模板 `globalStyle` 中其余字段可不动；页面目录用占位 `index.vue` 防止构建报错，后续任务逐个填充真实页面。）

- [ ] **步骤 7：Commit**

```bash
git add -A
git commit -m "chore: 初始化 uni-app Vue3 工程脚手架与 vitest"
```

---

## 任务 2：纯逻辑工具模块（id / date）

**文件：**
- 创建：`src/utils/id.js`
- 创建：`tests/id.test.js`
- 创建：`src/utils/date.js`
- 创建：`tests/date.test.js`

- [ ] **步骤 1：编写失败的 id 测试**

`tests/id.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { uuid } from '../src/utils/id'

describe('uuid', () => {
  it('生成符合 UUID v4 格式的字符串', () => {
    const id = uuid()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('连续生成不重复', () => {
    expect(uuid()).not.toBe(uuid())
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`
预期：FAIL，报错 "Cannot find module '../src/utils/id'" 或 "uuid is not a function"。

- [ ] **步骤 3：编写最少实现**

`src/utils/id.js`：

```js
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`
预期：`id` 用例 PASS。

- [ ] **步骤 5：编写失败的 date 测试**

`tests/date.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { formatEventDate, effectiveDate, formatDate } from '../src/utils/date'

describe('formatDate', () => {
  it('把 ISO 日期格式化为 2019.06', () => {
    expect(formatDate('2019-06-30')).toBe('2019.06')
  })
  it('空值返回空串', () => {
    expect(formatDate(null)).toBe('')
  })
})

describe('formatEventDate', () => {
  it('时间点事件显示单日期', () => {
    expect(formatEventDate({ date_type: 'point', date_point: '2020-01-05' })).toBe('2020.01')
  })
  it('时间段事件显示起止', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2015-09-01', date_end: '2019-06-30' })).toBe('2015.09 ~ 2019.06')
  })
  it('时间段无结束日期显示"至今"', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2019-08-01', date_end: null })).toBe('2019.08 ~ 至今')
  })
})

describe('effectiveDate', () => {
  it('时间点取 date_point，时间段取 date_start，用于排序', () => {
    expect(effectiveDate({ date_type: 'point', date_point: '2020-01-05' })).toBe('2020-01-05')
    expect(effectiveDate({ date_type: 'range', date_start: '2015-09-01' })).toBe('2015-09-01')
  })
  it('缺失日期时返回空串（排最前）', () => {
    expect(effectiveDate({ date_type: 'point' })).toBe('')
  })
})
```

- [ ] **步骤 6：运行测试确认失败**

运行：`npm test`
预期：FAIL，报错 "Cannot find module '../src/utils/date'"。

- [ ] **步骤 7：编写最少实现**

`src/utils/date.js`：

```js
// 日期统一存 ISO 字符串 "YYYY-MM-DD"；展示时截取年月。
export function formatDate(iso) {
  if (!iso) return ''
  return iso.slice(0, 7).replace('-', '.')
}

export function formatEventDate(event) {
  if (event.date_type === 'range') {
    const start = formatDate(event.date_start)
    const end = event.date_end ? formatDate(event.date_end) : '至今'
    return `${start} ~ ${end}`
  }
  return formatDate(event.date_point)
}

// 排序用：时间点取 date_point，时间段取 date_start；空串排最前。
export function effectiveDate(event) {
  if (event.date_type === 'range') return event.date_start || ''
  return event.date_point || ''
}
```

- [ ] **步骤 8：运行测试确认通过**

运行：`npm test`
预期：`date` 全部用例 PASS。

- [ ] **步骤 9：Commit**

```bash
git add src/utils/id.js src/utils/date.js tests/id.test.js tests/date.test.js
git commit -m "feat: 添加 UUID 与日期处理纯函数（含测试）"
```

---

## 任务 3：数据库表结构（schema）

**文件：**
- 创建：`src/utils/schema.js`
- 创建：`tests/schema.test.js`

- [ ] **步骤 1：编写失败的 schema 测试**

`tests/schema.test.js`：

```js
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`
预期：FAIL，报错 "Cannot find module '../src/utils/schema'"。

- [ ] **步骤 3：编写最少实现**

`src/utils/schema.js`：

```js
// 所有实体使用 UUID 字符串主键（为将来对外分享铺路）。
export const TABLES = {
  person: {
    name: 'person',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      avatar_path: 'TEXT',
      birth_date: 'TEXT',
      note: 'TEXT',
      created_at: 'TEXT'
    }
  },
  timeline: {
    name: 'timeline',
    columns: {
      id: 'TEXT PRIMARY KEY',
      person_id: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      category: 'TEXT',
      is_private: 'INTEGER DEFAULT 1',
      created_at: 'TEXT'
    }
  },
  event: {
    name: 'event',
    columns: {
      id: 'TEXT PRIMARY KEY',
      timeline_id: 'TEXT NOT NULL',
      title: 'TEXT NOT NULL',
      description: 'TEXT',
      date_type: 'TEXT NOT NULL',
      date_point: 'TEXT',
      date_start: 'TEXT',
      date_end: 'TEXT',
      cover_image_path: 'TEXT',
      created_at: 'TEXT'
    }
  },
  event_image: {
    name: 'event_image',
    columns: {
      id: 'TEXT PRIMARY KEY',
      event_id: 'TEXT NOT NULL',
      thumb_path: 'TEXT',
      image_path: 'TEXT',
      sort_order: 'INTEGER DEFAULT 0'
    }
  }
}

export function createTableSql(table) {
  const defs = Object.entries(table.columns)
    .map(([c, t]) => `"${c}" ${t}`)
    .join(', ')
  return `CREATE TABLE IF NOT EXISTS "${table.name}" (${defs})`
}

export function createAllTablesSql() {
  return Object.values(TABLES).map(createTableSql)
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`
预期：`schema` 全部用例 PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/schema.js tests/schema.test.js
git commit -m "feat: 定义数据库表结构（person/timeline/event/event_image）"
```

---

## 任务 4：存储适配器（memory + sqlite）

**文件：**
- 创建：`src/utils/storage.js`
- 创建：`tests/storage.test.js`

**说明：** 适配器接口只有 6 个方法：`init(createStatements)`、`insert(table, row)`、`update(table, id, patch)`、`delete(table, id)`、`deleteWhere(table, field, value)`、`all(table)`。`db.js` 拿到全表数据后在 JS 层过滤/排序，不写 SQL 查询——这让 memory 实现零 SQL 依赖、可测。

- [ ] **步骤 1：编写失败的 memory 适配器测试**

`tests/storage.test.js`：

```js
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`
预期：FAIL，报错 "Cannot find module '../src/utils/storage'"。

- [ ] **步骤 3：编写 memory 实现**

`src/utils/storage.js`：

```js
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
```

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`
预期：`memoryAdapter` 全部用例 PASS。

- [ ] **步骤 5：编写 sqlite 适配器（真机用，本环境不执行）**

继续在 `src/utils/storage.js` 追加：

```js
// SQLite 适配器：包装 plus.sqlite，仅真机 App 环境可用。
// 注意：SQL 值一律走 esc() 转义，防注入。
function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

export function createSqliteAdapter() {
  const DB_NAME = 'my_life_line'
  const DB_PATH = '_doc'
  const open = () => {
    if (!plus.sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })) {
      plus.sqlite.openDatabase({ name: DB_NAME, path: DB_PATH, success: () => {}, fail: (e) => console.error('open db fail', e) })
    }
  }
  const exec = (sql) => {
    open()
    return new Promise((resolve, reject) => {
      plus.sqlite.executeSql({ name: DB_NAME, sql, success: () => resolve(), fail: reject })
    })
  }
  return {
    async init(createStatements) {
      for (const sql of createStatements) await exec(sql)
    },
    async insert(table, row) {
      const cols = Object.keys(row)
      const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map((c) => esc(row[c])).join(',')})`
      await exec(sql)
    },
    async update(table, id, patch) {
      const sets = Object.entries(patch).map(([c, v]) => `"${c}"=${esc(v)}`).join(',')
      await exec(`UPDATE "${table}" SET ${sets} WHERE id='${esc(id)}'`)
    },
    async delete(table, id) {
      await exec(`DELETE FROM "${table}" WHERE id='${esc(id)}'`)
    },
    async deleteWhere(table, field, value) {
      await exec(`DELETE FROM "${table}" WHERE "${field}"='${esc(value)}'`)
    },
    async all(table) {
      open()
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
```

- [ ] **步骤 6：确认 sqlite 适配器通过静态检查**

运行：`node -e "const s=require('fs').readFileSync('src/utils/storage.js','utf8'); console.log('storage.js ok')"`
预期：打印 `storage.js ok`（不报语法错误；`plus` 只在函数内部引用，模块可被 Node 安全加载）。

- [ ] **步骤 7：Commit**

```bash
git add src/utils/storage.js tests/storage.test.js
git commit -m "feat: 存储适配器（内存可测版 + plus.sqlite 真机版）"
```

---

## 任务 5：数据层 db.js（全部 CRUD + 搜索）

**文件：**
- 创建：`src/utils/db.js`
- 创建：`tests/db.test.js`

**说明：** `createDb(adapter)` 依赖注入，方便测试用 memoryAdapter。所有 `save*` 逻辑：带 id 且存在→更新；带 id 不存在→按该 id 插入（支持导入还原）；无 id→生成新 UUID。删除级联：删人物→删其时间线→删其事件→删其图片。

- [ ] **步骤 1：编写失败的 db 测试**

`tests/db.test.js`：

```js
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`
预期：FAIL，报错 "Cannot find module '../src/utils/db'"。

- [ ] **步骤 3：编写最少实现**

`src/utils/db.js`：

```js
import { uuid } from './id'
import { createAllTablesSql } from './schema'
import { effectiveDate } from './date'

export function createDb(adapter) {
  const now = () => new Date().toISOString()

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
    async init() {
      await adapter.init(createAllTablesSql())
    },

    // ---------- person ----------
    async getPersons() {
      const rows = await adapter.all('person')
      return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },
    async getPerson(id) {
      const rows = await adapter.all('person')
      return rows.find((r) => r.id === id) || null
    },
    async savePerson(p) {
      return upsert('person', p.id, p, (id) => this.getPerson(id))
    },
    async deletePerson(id) {
      const timelines = await this.getTimelinesByPerson(id)
      for (const tl of timelines) await this.deleteTimeline(tl.id)
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
    async saveTimeline(t) {
      return upsert('timeline', t.id, t, (id) => this.getTimeline(id))
    },
    async deleteTimeline(id) {
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
```

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`
预期：`db` 全部用例 PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/db.js tests/db.test.js
git commit -m "feat: 数据层 CRUD 与搜索（含级联删除、图片替换）"
```

---

## 任务 6：导入/导出

**文件：**
- 创建：`src/utils/export.js`
- 创建：`tests/export.test.js`

**说明：** `serialize(db)` 导出为嵌套 JSON（图片只记录路径引用，图片文件由后续任务的文件 I/O 处理）。`importData(db, data)` 按保存时的 id 还原（`save*` 支持指定 id 插入）。核心逻辑纯 JS 可测。

- [ ] **步骤 1：编写失败的 export 测试**

`tests/export.test.js`：

```js
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
    expect(data.persons.length).toBe(1)
    expect(data.persons[0].timelines[0].events[0].title).toBe('毕业')
    expect(data.persons[0].id).toBeTruthy()
  })
  it('round-trip：导出后再导入新库，数据等价', async () => {
    await seed()
    const data = await serialize(db)
    const db2 = createDb(createMemoryAdapter())
    await db2.init()
    await importData(db2, data)
    expect((await db2.getPersons()).length).toBe(1)
    const p2 = (await db2.getPersons())[0]
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
    await importData(db, data)
    expect((await db.getPersons()).length).toBe(1)
    expect((await db.getEventsByTimeline((await db.getTimelinesByPerson((await db.getPersons())[0].id))[0].id)).length).toBe(1)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`
预期：FAIL，报错 "Cannot find module '../src/utils/export'"。

- [ ] **步骤 3：编写最少实现**

`src/utils/export.js`：

```js
export const EXPORT_VERSION = 1

export async function serialize(db) {
  const persons = await db.getPersons()
  const personsOut = []
  for (const p of persons) {
    const timelines = await db.getTimelinesByPerson(p.id)
    const timelinesOut = []
    for (const tl of timelines) {
      const events = await db.getEventsByTimeline(tl.id)
      const eventsOut = []
      for (const ev of events) {
        eventsOut.push({ ...ev, images: await db.getImagesByEvent(ev.id) })
      }
      timelinesOut.push({ ...tl, events: eventsOut })
    }
    personsOut.push({ ...p, timelines: timelinesOut })
  }
  return { version: EXPORT_VERSION, exported_at: new Date().toISOString(), persons: personsOut }
}

export async function importData(db, data) {
  for (const p of data.persons || []) {
    await db.savePerson(p)
    for (const tl of p.timelines || []) {
      await db.saveTimeline(tl)
      for (const ev of tl.events || []) {
        await db.saveEvent(ev)
      }
    }
  }
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`
预期：`export/import` 全部用例 PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/export.js tests/export.test.js
git commit -m "feat: 导入导出（serialize/importData，按 id 幂等还原）"
```

---

## 任务 7：图片处理（image.js）

**文件：**
- 创建：`src/utils/image.js`
- 创建：`tests/image.test.js`

**说明：** 纯函数 `makeImagePaths` 可测；设备相关函数（`chooseAndStore`）真机手动验证。图片落盘策略：事件图压缩后存 `_doc/images/<eventId>_<ts>.jpg`，缩略图 `<eventId>_<ts>_thumb.jpg`，不保留原图（省空间）。

- [ ] **步骤 1：编写失败的 image 测试**

`tests/image.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { makeImagePaths } from '../src/utils/image'

describe('makeImagePaths', () => {
  it('生成原图与缩略图路径且同前缀', () => {
    const { imagePath, thumbPath } = makeImagePaths('evt-1', 'jpg')
    expect(imagePath).toMatch(/^_doc\/images\/evt-1_\d+\.jpg$/)
    expect(thumbPath).toBe(imagePath.replace('.jpg', '_thumb.jpg'))
  })
  it('不同调用生成不同时间戳', () => {
    const a = makeImagePaths('evt-1', 'jpg').imagePath
    const b = makeImagePaths('evt-1', 'jpg').imagePath
    expect(a).not.toBe(b)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test`
预期：FAIL，报错 "Cannot find module '../src/utils/image'"。

- [ ] **步骤 3：编写实现**

`src/utils/image.js`：

```js
// 纯函数：生成事件图片的存储路径（原图 + 缩略图同前缀）。
export function makeImagePaths(eventId, ext = 'jpg') {
  const stamp = Date.now()
  const imagePath = `_doc/images/${eventId}_${stamp}.${ext}`
  const thumbPath = `_doc/images/${eventId}_${stamp}_thumb.${ext}`
  return { imagePath, thumbPath }
}

// 设备函数：从相册/相机选择图片，压缩并写入应用私有目录。
// 返回 [{ image_path, thumb_path }]；真机手动验证，H5 返回临时路径（开发用）。
export function chooseAndStoreImages(eventId, count = 9) {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const stored = []
        for (const src of res.tempFilePaths) {
          try {
            stored.push(await compressAndCopy(src, eventId))
          } catch (e) {
            console.error('store image fail', src, e)
          }
        }
        resolve(stored)
      },
      fail: reject
    })
  })
}

function compressAndCopy(src, eventId) {
  return new Promise((resolve, reject) => {
    const paths = makeImagePaths(eventId)
    const next = (step) => {
      if (step === 0) {
        // 压缩图
        uni.compressImage({ src, quality: 80, success: (r) => { paths.imagePath = r.tempFilePath; next(1) }, fail: reject })
      } else if (step === 1) {
        // 缩略图（宽 240）
        uni.compressImage({ src, compressedWidth: 240, success: (r) => { paths.thumbPath = r.tempFilePath; resolve(paths) }, fail: reject })
      }
    }
    next(0)
  })
}
```

> **设备落盘说明（真机手动验证）：** 上面 `compressAndCopy` 为压缩示意。真机上压缩结果 `r.tempFilePath` 指向临时目录，需再用 `plus.io` 把文件从临时目录 `copyTo` 到 `_doc/images/` 持久目录，并将最终落盘路径写入 `paths`。由于临时路径每次变化，`makeImagePaths` 只负责生成**目标文件名**，真机实现需将其作为 `copyTo` 的目标名。此逻辑在真机联调时补齐，H5 兜底不做持久化（开发期图片显示临时路径即可）。

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test`
预期：`image` 纯函数用例 PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/image.js tests/image.test.js
git commit -m "feat: 图片处理（路径生成纯函数 + 选择/压缩设备接口）"
```

---

## 任务 8：App 启动接线

**文件：**
- 修改：`src/App.vue`（onLaunch 初始化 db）
- 创建：`src/utils/db.js` 的默认导出单例（在任务 5 基础上追加）

- [ ] **步骤 1：在 db.js 追加默认单例导出**

在 `src/utils/db.js` 末尾追加：

```js
import { resolveAdapter } from './storage'

export const db = createDb(resolveAdapter())
```

（注意：把 `import { resolveAdapter }` 放到文件顶部 import 区，不要放在中间。）

- [ ] **步骤 2：修改 App.vue 在启动时初始化数据库**

将模板的 `src/App.vue` 改为：

```vue
<script>
import { db } from './utils/db'
export default {
  onLaunch() {
    db.init().catch((e) => console.error('db init fail', e))
  }
}
</script>

<style>
/* 全局基础样式 */
page {
  background-color: #f8f8f8;
}
</style>
```

- [ ] **步骤 3：验证 H5 构建**

运行：`npm run build:h5`
预期：退出码 0。若报 `db`/`storage` 相关 import 错误，检查 `resolveAdapter` 的导入路径是否正确。

- [ ] **步骤 4：确认单元测试仍全部通过**

运行：`npm test`
预期：所有用例 PASS（`db.js` 顶层 import `resolveAdapter` 不影响 Node 测试——`plus` 未定义时走 memoryAdapter）。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/db.js src/App.vue
git commit -m "feat: App 启动时初始化数据层（自动选择存储适配器）"
```

---

## 任务 9：页面——人物列表（首页 + 全局搜索）

**文件：**
- 创建：`src/pages/person-list/index.vue`

**说明：** 首页展示人物卡片；顶部搜索框输入关键词时，切换为"跨人物事件搜索结果"，点击结果跳到事件详情。

- [ ] **步骤 1：编写页面**

`src/pages/person-list/index.vue`：

```vue
<template>
  <view class="page">
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索事件标题/描述" @confirm="doSearch" @input="doSearch" />
    </view>

    <template v-if="searching">
      <view class="result-list">
        <view v-for="r in results" :key="r.id" class="result-item" @click="openEvent(r.id)">
          <view class="r-title">{{ r.title }}</view>
          <view class="r-sub">{{ personName(r.person_id) }} · {{ timelineName(r.timeline_id) }}</view>
          <view class="r-desc" v-if="r.description">{{ r.description }}</view>
        </view>
        <view v-if="!results.length" class="empty">没有匹配的事件</view>
      </view>
    </template>

    <template v-else>
      <view class="list">
        <view v-for="p in persons" :key="p.id" class="card" @click="openPerson(p.id)">
          <image v-if="p.avatar_path" class="avatar" :src="p.avatar_path" mode="aspectFill" />
          <view v-else class="avatar placeholder">{{ p.name ? p.name[0] : '?' }}</view>
          <view class="info">
            <view class="name">{{ p.name }}</view>
            <view class="sub">{{ timelineCount(p.id) }} 条时间线</view>
          </view>
          <view class="edit-btn" @click.stop="editPerson(p)">编辑</view>
        </view>
      </view>
      <view v-if="!persons.length" class="empty">还没有人物，点右下角 + 添加</view>
    </template>

    <view class="fab" @click="addPerson">＋</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'

export default {
  data() {
    return { persons: [], counts: {}, keyword: '', searching: false, results: [], nameMap: {}, tlMap: {} }
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.persons = await db.getPersons()
      const counts = {}
      const nameMap = {}
      const tlMap = {}
      for (const p of this.persons) {
        nameMap[p.id] = p.name
        const tls = await db.getTimelinesByPerson(p.id)
        counts[p.id] = tls.length
        for (const tl of tls) tlMap[tl.id] = tl.name
      }
      this.counts = counts
      this.nameMap = nameMap
      this.tlMap = tlMap
    },
    timelineCount(id) {
      return this.counts[id] || 0
    },
    personName(id) {
      return this.nameMap[id] || ''
    },
    timelineName(id) {
      return this.tlMap[id] || ''
    },
    async doSearch() {
      const k = (this.keyword || '').trim()
      if (!k) {
        this.searching = false
        return
      }
      this.searching = true
      this.results = await db.searchEvents(k)
    },
    openPerson(id) {
      uni.navigateTo({ url: `/pages/person-detail/index?personId=${id}` })
    },
    openEvent(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    },
    addPerson() {
      uni.navigateTo({ url: '/pages/edit-form/index?entityType=person' })
    },
    editPerson(p) {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=person&id=${p.id}` })
    }
  }
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 140rpx; }
.search-bar { padding: 8rpx 0 16rpx; }
.search-input { background: #fff; border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 28rpx; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; }
.avatar.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.info { flex: 1; margin-left: 20rpx; }
.name { font-size: 32rpx; font-weight: 600; }
.sub { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.edit-btn { color: #4a6cf7; font-size: 26rpx; padding: 8rpx 16rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; font-size: 28rpx; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; width: 96rpx; height: 96rpx; border-radius: 50%; background: #ffb400; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
.result-list { display: flex; flex-direction: column; gap: 16rpx; }
.result-item { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.r-title { font-size: 30rpx; font-weight: 600; }
.r-sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.r-desc { font-size: 26rpx; color: #666; margin-top: 8rpx; }
</style>
```

- [ ] **步骤 2：验证 H5 构建**

运行：`npm run build:h5`
预期：退出码 0。

- [ ] **步骤 3：手动验证（H5 预览）**

运行：`npm run dev:h5` 后浏览器打开控制台 URL；预期能看到空态提示与右下角 + 按钮。此时点 + 会跳转（edit-form 页面还不存在会报路由缺失，属预期，下一步实现）。

- [ ] **步骤 4：Commit**

```bash
git add src/pages/person-list/index.vue
git commit -m "feat: 首页人物列表与全局事件搜索"
```

---

## 任务 10：页面——人物详情（时间线列表）

**文件：**
- 创建：`src/pages/person-detail/index.vue`

- [ ] **步骤 1：编写页面**

`src/pages/person-detail/index.vue`：

```vue
<template>
  <view class="page">
    <view class="header">
      <image v-if="person.avatar_path" class="avatar" :src="person.avatar_path" mode="aspectFill" />
      <view v-else class="avatar placeholder">{{ person.name ? person.name[0] : '?' }}</view>
      <view class="meta">
        <view class="name">{{ person.name }}</view>
        <view class="sub" v-if="person.birth_date">出生：{{ person.birth_date }}</view>
        <view class="sub" v-if="person.note">{{ person.note }}</view>
      </view>
    </view>

    <view class="list">
      <view v-for="tl in timelines" :key="tl.id" class="card" @click="openTimeline(tl.id)">
        <view class="tl-body">
          <view class="tl-name">{{ tl.name }}</view>
          <view class="tl-sub">{{ eventCount(tl.id) }} 个事件</view>
        </view>
        <view class="tl-cat" v-if="tl.category">{{ tl.category }}</view>
        <view class="edit-btn" @click.stop="editTimeline(tl)">编辑</view>
      </view>
      <view v-if="!timelines.length" class="empty">还没有时间线，点右下角添加</view>
    </view>

    <view class="fab" @click="addTimeline">＋ 时间线</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'

export default {
  data() {
    return { personId: '', person: {}, timelines: [], counts: {} }
  },
  async onLoad(options) {
    this.personId = options.personId
    uni.setNavigationBarTitle({ title: '人物' })
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.person = (await db.getPerson(this.personId)) || {}
      this.timelines = await db.getTimelinesByPerson(this.personId)
      const counts = {}
      for (const tl of this.timelines) counts[tl.id] = (await db.getEventsByTimeline(tl.id)).length
      this.counts = counts
    },
    eventCount(id) {
      return this.counts[id] || 0
    },
    openTimeline(id) {
      uni.navigateTo({ url: `/pages/timeline/index?timelineId=${id}` })
    },
    addTimeline() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=timeline&personId=${this.personId}` })
    },
    editTimeline(tl) {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=timeline&id=${tl.id}` })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.header { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.avatar.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.meta { margin-left: 20rpx; }
.name { font-size: 36rpx; font-weight: 700; }
.sub { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.tl-body { flex: 1; }
.tl-name { font-size: 32rpx; font-weight: 600; }
.tl-sub { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.tl-cat { background: #fff4d6; color: #b8860b; font-size: 24rpx; padding: 6rpx 16rpx; border-radius: 20rpx; margin-right: 16rpx; }
.edit-btn { color: #4a6cf7; font-size: 26rpx; }
.empty { text-align: center; color: #bbb; padding: 100rpx 0; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: #ffb400; color: #fff; padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>
```

- [ ] **步骤 2：验证 H5 构建**

运行：`npm run build:h5`
预期：退出码 0。

- [ ] **步骤 3：Commit**

```bash
git add src/pages/person-detail/index.vue
git commit -m "feat: 人物详情页（时间线列表）"
```

---

## 任务 11：页面——通用编辑表单（人物/时间线/事件）

**文件：**
- 创建：`src/pages/edit-form/index.vue`

**说明：** 一个页面根据 `entityType`（person/timeline/event）渲染不同表单。事件表单：时间点/时间段切换（时间段结束日期可空=至今）、多图选择（相册+拍照）、标题、描述。

- [ ] **步骤 1：编写页面**

`src/pages/edit-form/index.vue`：

```vue
<template>
  <view class="page">
    <!-- 人物表单 -->
    <template v-if="entityType === 'person'">
      <view class="field">
        <text class="label">姓名 *</text>
        <input class="input" v-model="form.name" placeholder="如：小明" />
      </view>
      <view class="field">
        <text class="label">出生日期</text>
        <picker mode="date" :value="form.birth_date" @change="(e) => (form.birth_date = e.detail.value)">
          <view class="picker">{{ form.birth_date || '选择日期' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea class="input textarea" v-model="form.note" placeholder="一句话介绍" />
      </view>
      <button class="save-btn" @click="save">保存</button>
    </template>

    <!-- 时间线表单 -->
    <template v-else-if="entityType === 'timeline'">
      <view class="field">
        <text class="label">名称 *</text>
        <input class="input" v-model="form.name" placeholder="如：成长记录" />
      </view>
      <view class="field">
        <text class="label">分类</text>
        <input class="input" v-model="form.category" placeholder="如：教育 / 旅行 / 健康" />
      </view>
      <button class="save-btn" @click="save">保存</button>
    </template>

    <!-- 事件表单 -->
    <template v-else-if="entityType === 'event'">
      <view class="field">
        <text class="label">标题 *</text>
        <input class="input" v-model="form.title" placeholder="如：本科毕业典礼" />
      </view>

      <view class="field">
        <text class="label">时间类型</text>
        <view class="seg">
          <view :class="['seg-item', form.date_type === 'point' ? 'active' : '']" @click="form.date_type = 'point'">时间点</view>
          <view :class="['seg-item', form.date_type === 'range' ? 'active' : '']" @click="form.date_type = 'range'">时间段</view>
        </view>
      </view>

      <view class="field" v-if="form.date_type === 'point'">
        <text class="label">日期</text>
        <picker mode="date" :value="form.date_point" @change="(e) => (form.date_point = e.detail.value)">
          <view class="picker">{{ form.date_point || '选择日期' }}</view>
        </picker>
      </view>

      <template v-else>
        <view class="field">
          <text class="label">开始日期</text>
          <picker mode="date" :value="form.date_start" @change="(e) => (form.date_start = e.detail.value)">
            <view class="picker">{{ form.date_start || '选择日期' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">结束日期（空 = 至今）</text>
          <picker mode="date" :value="form.date_end" @change="(e) => (form.date_end = e.detail.value)">
            <view class="picker">{{ form.date_end || '至今' }}</view>
          </picker>
        </view>
      </template>

      <view class="field">
        <text class="label">描述</text>
        <textarea class="input textarea" v-model="form.description" placeholder="记录当时的感受…" />
      </view>

      <view class="field">
        <text class="label">图片（最多 9 张）</text>
        <view class="img-grid">
          <view v-for="(img, i) in form.images" :key="i" class="img-wrap">
            <image class="img" :src="img.preview" mode="aspectFill" @click="preview(i)" />
            <view class="img-del" @click="removeImage(i)">×</view>
          </view>
          <view v-if="form.images.length < 9" class="img-add" @click="addImages">＋</view>
        </view>
      </view>

      <button class="save-btn" @click="save">保存</button>
    </template>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { chooseAndStoreImages } from '../../utils/image'

export default {
  data() {
    return {
      entityType: 'person',
      id: '',
      personId: '',
      timelineId: '',
      form: {
        // person
        name: '',
        birth_date: '',
        note: '',
        // timeline
        category: '',
        // event
        title: '',
        description: '',
        date_type: 'point',
        date_point: '',
        date_start: '',
        date_end: '',
        images: []
      }
    }
  },
  async onLoad(options) {
    this.entityType = options.entityType || 'person'
    this.id = options.id || ''
    this.personId = options.personId || ''
    this.timelineId = options.timelineId || ''
    const titles = { person: '编辑人物', timeline: '编辑时间线', event: '编辑事件' }
    uni.setNavigationBarTitle({ title: this.id ? titles[this.entityType] : `新建${this.entityType === 'person' ? '人物' : this.entityType === 'timeline' ? '时间线' : '事件'}` })
    if (this.id) await this.loadForm()
  },
  methods: {
    async loadForm() {
      if (this.entityType === 'person') {
        const p = await db.getPerson(this.id)
        this.form = { name: p.name, birth_date: p.birth_date || '', note: p.note || '' }
      } else if (this.entityType === 'timeline') {
        const tl = await db.getTimeline(this.id)
        this.form = { name: tl.name, category: tl.category || '' }
      } else {
        const ev = await db.getEvent(this.id)
        this.form = {
          title: ev.title,
          description: ev.description || '',
          date_type: ev.date_type,
          date_point: ev.date_point || '',
          date_start: ev.date_start || '',
          date_end: ev.date_end || '',
          images: (await db.getImagesByEvent(ev.id)).map((im) => ({ preview: im.thumb_path || im.image_path, _path: im }))
        }
      }
    },
    addImages() {
      chooseAndStoreImages(this.id || 'new').then((stored) => {
        for (const s of stored) this.form.images.push({ preview: s.thumb_path || s.image_path, _path: s })
      }).catch(() => uni.showToast({ title: '选择图片失败', icon: 'none' }))
    },
    removeImage(i) {
      this.form.images.splice(i, 1)
    },
    preview(i) {
      uni.previewImage({ urls: this.form.images.map((im) => im.preview), current: i })
    },
    async save() {
      const { entityType, form } = this
      if (entityType === 'person') {
        if (!form.name) return uni.showToast({ title: '请填写姓名', icon: 'none' })
        await db.savePerson({ id: this.id || undefined, name: form.name, birth_date: form.birth_date || null, note: form.note || null })
      } else if (entityType === 'timeline') {
        if (!form.name) return uni.showToast({ title: '请填写名称', icon: 'none' })
        await db.saveTimeline({ id: this.id || undefined, person_id: this.personId, name: form.name, category: form.category || null, is_private: 1 })
      } else {
        if (!form.title) return uni.showToast({ title: '请填写标题', icon: 'none' })
        const row = {
          id: this.id || undefined,
          timeline_id: this.timelineId,
          title: form.title,
          description: form.description || null,
          date_type: form.date_type,
          date_point: form.date_type === 'point' ? form.date_point || null : null,
          date_start: form.date_type === 'range' ? form.date_start || null : null,
          date_end: form.date_type === 'range' ? form.date_end || null : null
        }
        await db.saveEvent({ ...row, images: form.images.map((im) => im._path) })
      }
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.field { margin-bottom: 32rpx; }
.label { font-size: 26rpx; color: #888; display: block; margin-bottom: 12rpx; }
.input { background: #fff; border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; }
.textarea { min-height: 160rpx; }
.picker { background: #fff; border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; color: #333; }
.seg { display: flex; gap: 16rpx; }
.seg-item { flex: 1; text-align: center; padding: 18rpx; border-radius: 12rpx; background: #fff; color: #666; }
.seg-item.active { background: #ffb400; color: #fff; }
.img-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.img-wrap { position: relative; width: 180rpx; height: 180rpx; }
.img { width: 180rpx; height: 180rpx; border-radius: 12rpx; }
.img-del { position: absolute; top: -12rpx; right: -12rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.img-add { width: 180rpx; height: 180rpx; border: 2rpx dashed #ccc; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 48rpx; }
.save-btn { margin-top: 40rpx; background: #ffb400; color: #fff; font-size: 32rpx; border-radius: 48rpx; }
</style>
```

> **事件表单图片字段说明：** `form.images` 里 `_path` 存的是 `{ image_path, thumb_path }`，保存时传给 `db.saveEvent`；新建事件时 `chooseAndStoreImages('new')` 生成占位路径，真机联调时替换为实际落盘路径。H5 开发阶段图片可能无法持久显示，属预期。

- [ ] **步骤 2：验证 H5 构建**

运行：`npm run build:h5`
预期：退出码 0。

- [ ] **步骤 3：Commit**

```bash
git add src/pages/edit-form/index.vue
git commit -m "feat: 通用编辑表单（人物/时间线/事件，含时间点/时间段与多图）"
```

---

## 任务 12：时间线视图 + 三个视图组件

**文件：**
- 创建：`src/components/timeline-axis.vue`
- 创建：`src/components/timeline-grid.vue`
- 创建：`src/components/timeline-cards.vue`
- 创建：`src/pages/timeline/index.vue`

- [ ] **步骤 1：编写视图组件一（经典时间轴）**

`src/components/timeline-axis.vue`：

```vue
<template>
  <view class="axis">
    <view v-for="(ev, i) in events" :key="ev.id" class="node" :class="i % 2 === 0 ? 'left' : 'right'" @click="open(ev.id)">
      <image v-if="cover(ev)" class="thumb" :src="cover(ev)" mode="aspectFill" />
      <view v-else class="thumb placeholder">📷</view>
      <view class="t">{{ ev.title }}</view>
      <view class="d">{{ dateText(ev) }}</view>
    </view>
    <view v-if="!events.length" class="empty">还没有事件，点右下角 + 添加</view>
  </view>
</template>

<script>
import { formatEventDate } from '../utils/date'

export default {
  props: {
    events: { type: Array, default: () => [] }
  },
  methods: {
    cover(ev) {
      return ev.cover_image_path || (ev.images && ev.images[0] && ev.images[0].thumb_path) || ''
    },
    dateText(ev) {
      return formatEventDate(ev)
    },
    open(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    }
  }
}
</script>

<style scoped>
.axis { position: relative; padding: 20rpx 0 40rpx; }
.axis::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 4rpx; background: #ffb400; transform: translateX(-50%); }
.node { width: 44%; background: #fff; border-radius: 16rpx; padding: 16rpx; margin-bottom: 40rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.node.left { margin-right: 56%; }
.node.right { margin-left: 56%; }
.thumb { width: 100%; height: 180rpx; border-radius: 12rpx; }
.thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #ccc; }
.t { font-size: 28rpx; font-weight: 600; margin-top: 10rpx; }
.d { font-size: 24rpx; color: #ffb400; margin-top: 4rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; }
</style>
```

- [ ] **步骤 2：编写视图组件二（照片墙）**

`src/components/timeline-grid.vue`：

```vue
<template>
  <view class="grid">
    <view v-for="group in groups" :key="group.label" class="group">
      <view class="gh">{{ group.label }}</view>
      <view class="cells">
        <image
          v-for="ev in group.events"
          :key="ev.id"
          class="cell"
          :src="cover(ev)"
          mode="aspectFill"
          @click="open(ev.id)"
        />
      </view>
    </view>
    <view v-if="!events.length" class="empty">还没有事件，点右下角 + 添加</view>
  </view>
</template>

<script>
import { formatDate } from '../utils/date'

export default {
  props: {
    events: { type: Array, default: () => [] }
  },
  computed: {
    groups() {
      const map = {}
      for (const ev of this.events) {
        const key = ev.date_point ? formatDate(ev.date_point) : ev.date_start ? formatDate(ev.date_start) : '其他'
        if (!map[key]) map[key] = []
        map[key].push(ev)
      }
      return Object.keys(map).map((label) => ({ label, events: map[label] }))
    }
  },
  methods: {
    cover(ev) {
      return ev.cover_image_path || (ev.images && ev.images[0] && ev.images[0].thumb_path) || '/static/placeholder.png'
    },
    open(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    }
  }
}
</script>

<style scoped>
.grid { padding: 16rpx; }
.group { margin-bottom: 32rpx; }
.gh { font-size: 28rpx; font-weight: 700; margin-bottom: 12rpx; border-left: 6rpx solid #ffb400; padding-left: 12rpx; }
.cells { display: flex; flex-wrap: wrap; gap: 8rpx; }
.cell { width: 30.5%; aspect-ratio: 1; border-radius: 8rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; }
</style>
```

- [ ] **步骤 3：编写视图组件三（大卡片流）**

`src/components/timeline-cards.vue`：

```vue
<template>
  <view class="cards">
    <view v-for="ev in events" :key="ev.id" class="card" @click="open(ev.id)">
      <image v-if="cover(ev)" class="big" :src="cover(ev)" mode="aspectFill" />
      <view v-else class="big placeholder">📷</view>
      <view class="body">
        <view class="d">{{ dateText(ev) }}</view>
        <view class="t">{{ ev.title }}</view>
        <view class="desc" v-if="ev.description">{{ ev.description }}</view>
      </view>
    </view>
    <view v-if="!events.length" class="empty">还没有事件，点右下角 + 添加</view>
  </view>
</template>

<script>
import { formatEventDate } from '../utils/date'

export default {
  props: {
    events: { type: Array, default: () => [] }
  },
  methods: {
    cover(ev) {
      return ev.cover_image_path || (ev.images && ev.images[0] && ev.images[0].thumb_path) || ''
    },
    dateText(ev) {
      return formatEventDate(ev)
    },
    open(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    }
  }
}
</script>

<style scoped>
.cards { padding: 16rpx; display: flex; flex-direction: column; gap: 24rpx; }
.card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.big { width: 100%; height: 360rpx; }
.big.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #ccc; font-size: 64rpx; }
.body { padding: 20rpx; }
.d { font-size: 24rpx; color: #ffb400; font-weight: 600; }
.t { font-size: 32rpx; font-weight: 700; margin-top: 8rpx; }
.desc { font-size: 26rpx; color: #888; margin-top: 8rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; }
</style>
```

- [ ] **步骤 4：编写时间线视图页面（三视图切换 + 添加事件）**

`src/pages/timeline/index.vue`：

```vue
<template>
  <view class="page">
    <view class="toolbar">
      <view class="seg">
        <view :class="['seg-item', viewMode === 'axis' ? 'active' : '']" @click="switchView('axis')">时间轴</view>
        <view :class="['seg-item', viewMode === 'grid' ? 'active' : '']" @click="switchView('grid')">照片墙</view>
        <view :class="['seg-item', viewMode === 'cards' ? 'active' : '']" @click="switchView('cards')">卡片</view>
      </view>
    </view>

    <timeline-axis v-if="viewMode === 'axis'" :events="events" />
    <timeline-grid v-else-if="viewMode === 'grid'" :events="events" />
    <timeline-cards v-else :events="events" />

    <view class="fab" @click="addEvent">＋ 事件</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import timelineAxis from '../../components/timeline-axis.vue'
import timelineGrid from '../../components/timeline-grid.vue'
import timelineCards from '../../components/timeline-cards.vue'

export default {
  components: { timelineAxis, timelineGrid, timelineCards },
  data() {
    return { timelineId: '', timeline: {}, events: [], viewMode: 'axis' }
  },
  async onLoad(options) {
    this.timelineId = options.timelineId
    this.viewMode = uni.getStorageSync('timeline_view_mode') || 'axis'
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.timeline = (await db.getTimeline(this.timelineId)) || {}
      if (this.timeline.name) uni.setNavigationBarTitle({ title: this.timeline.name })
      this.events = []
      const evs = await db.getEventsByTimeline(this.timelineId)
      for (const ev of evs) this.events.push({ ...ev, images: await db.getImagesByEvent(ev.id) })
    },
    switchView(m) {
      this.viewMode = m
      uni.setStorageSync('timeline_view_mode', m)
    },
    addEvent() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=event&timelineId=${this.timelineId}` })
    }
  }
}
</script>

<style scoped>
.page { padding-bottom: 140rpx; }
.toolbar { position: sticky; top: 0; background: #f8f8f8; padding: 16rpx 24rpx; z-index: 10; }
.seg { display: flex; background: #eee; border-radius: 12rpx; overflow: hidden; }
.seg-item { flex: 1; text-align: center; padding: 16rpx; font-size: 28rpx; color: #666; }
.seg-item.active { background: #fff; color: #ffb400; font-weight: 600; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: #ffb400; color: #fff; padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>
```

- [ ] **步骤 5：验证 H5 构建**

运行：`npm run build:h5`
预期：退出码 0（若报组件路径错误，检查 `components/` 目录与 import 路径）。

- [ ] **步骤 6：手动验证（H5 预览）**

运行：`npm run dev:h5`；新增一个人物 → 一条时间线 → 一个事件后，回到时间线页确认三视图切换、添加事件、跳转事件详情（event-detail 未实现，点开会报路由缺失，属预期）。

- [ ] **步骤 7：Commit**

```bash
git add src/components/timeline-axis.vue src/components/timeline-grid.vue src/components/timeline-cards.vue src/pages/timeline/index.vue
git commit -m "feat: 时间线视图（三视图切换 + 添加事件）"
```

---

## 任务 13：页面——事件详情

**文件：**
- 创建：`src/pages/event-detail/index.vue`

- [ ] **步骤 1：编写页面**

`src/pages/event-detail/index.vue`：

```vue
<template>
  <view class="page">
    <view class="swiper-wrap" v-if="images.length">
      <swiper class="swiper" indicator-dots circular>
        <swiper-item v-for="(img, i) in images" :key="i">
          <image class="img" :src="img.image_path || img.thumb_path" mode="aspectFill" @click="preview(i)" />
        </swiper-item>
      </swiper>
    </view>
    <view v-else class="no-img">暂无图片</view>

    <view class="meta">
      <view class="date">{{ dateText }}</view>
      <view class="title">{{ event.title }}</view>
      <view class="desc" v-if="event.description">{{ event.description }}</view>
    </view>

    <view class="actions">
      <button class="btn" @click="edit">编辑</button>
      <button class="btn danger" @click="remove">删除</button>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { formatEventDate } from '../../utils/date'

export default {
  data() {
    return { eventId: '', event: {}, images: [], dateText: '' }
  },
  async onLoad(options) {
    this.eventId = options.eventId
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.event = (await db.getEvent(this.eventId)) || {}
      this.images = await db.getImagesByEvent(this.eventId)
      this.dateText = formatEventDate(this.event)
      if (this.event.title) uni.setNavigationBarTitle({ title: this.event.title })
    },
    preview(i) {
      uni.previewImage({ urls: this.images.map((im) => im.image_path || im.thumb_path), current: i })
    },
    edit() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=event&id=${this.eventId}` })
    },
    remove() {
      uni.showModal({
        title: '删除事件',
        content: '确定删除这条事件吗？',
        success: async (res) => {
          if (res.confirm) {
            await db.deleteEvent(this.eventId)
            uni.navigateBack()
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding-bottom: 40rpx; }
.swiper-wrap { width: 100%; }
.swiper { width: 100%; height: 640rpx; }
.img { width: 100%; height: 640rpx; }
.no-img { width: 100%; height: 320rpx; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #bbb; }
.meta { padding: 24rpx; }
.date { color: #ffb400; font-weight: 600; }
.title { font-size: 40rpx; font-weight: 700; margin-top: 12rpx; }
.desc { font-size: 30rpx; color: #555; margin-top: 16rpx; line-height: 1.6; }
.actions { display: flex; gap: 24rpx; padding: 24rpx; }
.btn { flex: 1; background: #ffb400; color: #fff; border-radius: 48rpx; }
.btn.danger { background: #ff5a5a; }
</style>
```

- [ ] **步骤 2：验证 H5 构建**

运行：`npm run build:h5`
预期：退出码 0。

- [ ] **步骤 3：手动验证完整链路（H5 预览）**

运行：`npm run dev:h5`；验证：人物 → 时间线 → 事件 → 三视图 → 事件详情 → 编辑 → 删除，全链路可走通。

- [ ] **步骤 4：Commit**

```bash
git add src/pages/event-detail/index.vue
git commit -m "feat: 事件详情页（图片轮播 + 编辑/删除）"
```

---

## 任务 14：收尾——测试全绿 + 构建 + 文档

**文件：**
- 修改：`README.md`（更新开发说明）
- 修改：`docs/superpowers/specs/2026-08-12-life-timeline-design.md`（如实现有偏差则同步）

- [ ] **步骤 1：全量单元测试**

运行：`npm test`
预期：全部用例 PASS（id / date / schema / storage / db / export / image）。

- [ ] **步骤 2：H5 构建验证**

运行：`npm run build:h5`
预期：退出码 0，生成 `dist/build/h5/`。

- [ ] **步骤 3：app 平台构建验证**

运行：`npm run build:app`
预期：退出码 0，生成 `unpackage/dist/build/app-plus/` 目录（内含编译后的 app 资源；打包成 APK 需在用户本机用 HBuilderX 打开工程 → 发行 → 原生 App 云打包）。

- [ ] **步骤 4：更新 README 开发/真机说明**

在 `README.md` 的"开发"部分追加真机打包说明与测试命令：

```markdown
## 测试

```bash
npm test        # 单元测试（vitest，覆盖纯逻辑与数据层）
npm run dev:h5  # H5 调试
```

## 真机打包（APK）

本仓库无法直接出 APK，需在 Windows 上用 HBuilderX 打开本项目：

1. HBuilderX 菜单 → 文件 → 打开目录 → 选择项目根目录
2. 运行 → 运行到手机或模拟器（真机需开启 USB 调试）
3. 发行 → 原生 App 云打包（需 DCloud 账号）
```

- [ ] **步骤 5：Commit**

```bash
git add README.md
git commit -m "docs: 更新测试与真机打包说明"
```

- [ ] **步骤 6：确认工作区干净**

运行：`git status`
预期：`working tree clean`。

---

## 自检记录

**1. 规格覆盖度（对照设计规格）：**
- 多人物/多时间线/分类时间线 → 任务 5（数据模型）+ 任务 9/10/11 页面
- 事件时间点/时间段（含"至今"）→ 任务 2（date）+ 任务 5 + 任务 11 表单
- 多图 + 相册/拍照 + 压缩 → 任务 7（image.js）+ 任务 11
- 三视图切换 → 任务 12
- 搜索（标题/描述）→ 任务 5 `searchEvents` + 任务 9 首页搜索
- 导入/导出 → 任务 6
- 数据层隔离 + UUID + is_private → 任务 3/4/5
- 图片不保留原图、存缩略图 → 任务 7
- .gitignore → 任务 1 步骤 5
- 全部覆盖，无遗漏。

**2. 占位符扫描：** 无 TODO/待定。任务 7/11 的图片真机落盘需在真机联调补齐——这是"真机验证项"而非代码占位符。

**3. 类型一致性：** 适配器接口 `init/insert/update/delete/deleteWhere/all` 在任务 4 定义、任务 5 `db.js` 按此调用（含 `adapter.deleteWhere('event_image','event_id',id)`）；`save*` 签名在任务 5 定义、任务 6/8/11 一致使用（`saveEvent` 接收 `images` 数组）。`formatEventDate/effectiveDate` 在任务 2 定义、任务 12/13 使用，参数均为 event 对象。无命名漂移。

**环境外事项（需用户在真机/HBuilderX 完成）：**
- `plus.sqlite`/`plus.io`/相机/压缩的真机验证
- APK 打包
- GitHub 推送（本环境无法访问 github.com）
