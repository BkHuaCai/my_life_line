# 主页顶部留白 + 档案切换主用户置顶 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 主页顶部留 16rpx 空白；主页右上角档案切换下拉框中主用户（`is_default=1`）永远置顶。

**架构：** 仅修改 `frontend/src/pages/index/index.vue` 一个文件的两处：`.page` 样式的 `padding-top` 改为 `calc(var(--status-bar-height) + 16rpx)`；`load()` 方法取到 persons 后先排序（主用户置顶，其余保持原顺序），再生成 `userOptions` / `userIndex`，使下拉框与切换逻辑自动一致。

**技术栈：** uni-app (Vue 3)，CSS 变量 `--status-bar-height`（uni-app 内置），vitest（回归验证）。

**规格：** `docs/superpowers/specs/2026-08-15-home-top-polish-design.md`

---

### 任务 1：主页顶部留 16rpx 空白

**文件：**
- 修改：`frontend/src/pages/index/index.vue:296`（`.page` 样式）

- [ ] **步骤 1：修改 .page 样式**

将（当前已含任务前一轮的 `padding-top: var(--status-bar-height)`）：

```css
.page { padding: 24rpx; padding-bottom: 140rpx; padding-top: var(--status-bar-height); }
```

改为：

```css
.page { padding: 24rpx; padding-bottom: 140rpx; padding-top: calc(var(--status-bar-height) + 16rpx); }
```

- `padding-top` 仍位于 `padding: 24rpx` 之后，覆盖简写声明的顶部值。
- App 端 = 状态栏高度 + 16rpx；H5 端 = 16rpx。

- [ ] **步骤 2：回归验证**

运行：`cd /d/python/my_life_line/frontend && npm test`
预期：Test Files 9 passed、Tests 59 passed（纯样式改动，无测试变更）。

- [ ] **步骤 3：Commit**

```bash
cd /d/python/my_life_line
git add frontend/src/pages/index/index.vue
git commit -m "$(cat <<'EOF'
feat: 主页顶部留 16rpx 空白，不再贴顶

Co-Authored-By: AtomCode (deepseek-v4-flash) <noreply@atomgit.com>
EOF
)"
```

### 任务 2：档案切换主用户永远置顶

**文件：**
- 修改：`frontend/src/pages/index/index.vue:196-201`（`load()` 方法开头）

- [ ] **步骤 1：修改 load() 的 persons 排序**

当前（第 196-202 行）：

```js
    async load() {
      const persons = await db.getPersons()
      this.persons = persons
      // 下拉框选项：全部用户 + 末尾追加「＋ 添加用户」
      this.userOptions = [...persons.map((p) => p.name), '＋ 添加档案']
      this.currentPerson = (await db.getDefaultPerson()) || persons[0] || {}
      this.userIndex = persons.findIndex((p) => p.id === this.currentPerson.id)
      if (this.userIndex < 0) this.userIndex = 0
```

改为：

```js
    async load() {
      const persons = await db.getPersons()
      // 主用户永远置顶：is_default=1 排最前，其余保持原有 created_at 倒序
      const def = persons.find((p) => p.is_default === 1)
      this.persons = def ? [def, ...persons.filter((p) => p.id !== def.id)] : persons
      // 下拉框选项：主用户在最顶部 + 末尾追加「＋ 添加档案」
      this.userOptions = [...this.persons.map((p) => p.name), '＋ 添加档案']
      this.currentPerson = (await db.getDefaultPerson()) || this.persons[0] || {}
      this.userIndex = this.persons.findIndex((p) => p.id === this.currentPerson.id)
      if (this.userIndex < 0) this.userIndex = 0
```

- `this.persons` 排序后，`userOptions` / `userIndex` / `onSwitchUser`（按 `idx` 取 `this.persons[idx]`）全部基于同一数组，索引一致，无需改动其他方法。
- 单用户场景：`def` 存在，`this.persons` 不变，行为同现状。

- [ ] **步骤 2：回归验证**

运行：`cd /d/python/my_life_line/frontend && npm test`
预期：Test Files 9 passed、Tests 59 passed（页面逻辑改动，无测试变更；数据层 `db.getPersons` 未动）。

- [ ] **步骤 3：Commit**

```bash
cd /d/python/my_life_line
git add frontend/src/pages/index/index.vue
git commit -m "$(cat <<'EOF'
feat: 档案切换下拉框主用户永远置顶

Co-Authored-By: AtomCode (deepseek-v4-flash) <noreply@atomgit.com>
EOF
)"
```

### 任务 3：整体验证

**文件：** 无代码改动。

- [ ] **步骤 1：全量测试 + App 编译**

运行：`cd /d/python/my_life_line/frontend && npm test && npm run build:app`
预期：Tests 59 passed；`DONE Build complete.`

- [ ] **步骤 2：推送 origin/master**

```bash
cd /d/python/my_life_line
git push origin master
```

预期：`master -> master`，推送成功（包含 3 个新提交：设计文档 + 任务 1 + 任务 2）。
