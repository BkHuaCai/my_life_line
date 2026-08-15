# 设计文档：主页顶部留白 + 档案切换主用户置顶（2026-08-15）

## 背景与目标

上一轮已完成主页/我的页顶部区域移除（`navigationStyle: custom` + 状态栏安全区）。用户进一步反馈三个调整点：

1. **主页顶部留一点空白**：内容完全顶到顶部过于贴边，需要留少量空白区域（经澄清确认为 **16rpx**，App 端为状态栏高度之上再留 16rpx，H5 端为 16rpx）。
2. **主页右上角档案切换，主用户永远在最顶部**：切换下拉框中当前用户（`is_default = 1`）必须始终排在最前面，不受创建时间影响。
3. **导入导出功能暂时取消**：用户确认手机端导入导出用不上、操作不便，本轮不做"按档案层级导出"等任何导出/导入改动。

## 范围

- `frontend/src/pages/index/index.vue`（主页）：
  - `.page` 样式：`padding-top` 由 `var(--status-bar-height)` 改为 `calc(var(--status-bar-height) + 16rpx)`。
  - `load()` 方法：persons 排序，主用户置顶。
- 不改动数据层（`db.js` / `storage.js` / `schema.js`）、不改动其他页面、不新增依赖。
- 导出/导入（`export.js`、我的页 ⋮ 菜单）**保持现状，不做任何改动**。

## 设计

### 1. 主页顶部留 16rpx 空白

`frontend/src/pages/index/index.vue` 样式：

```css
.page { padding: 24rpx; padding-bottom: 140rpx; padding-top: calc(var(--status-bar-height) + 16rpx); }
```

- App 端：`--status-bar-height` 为状态栏实际高度，内容在状态栏下再留 16rpx。
- H5 端：`--status-bar-height` 为 0，即顶部留 16rpx，不再完全贴顶。
- `padding-top` 声明仍放在 `padding: 24rpx` 之后，保证覆盖简写属性。

### 2. 档案切换主用户置顶

`load()` 中取到 persons 后先排序：

```js
const persons = await db.getPersons()
// 主用户永远置顶：is_default=1 排最前，其余保持原有 created_at 倒序
const def = persons.find((p) => p.is_default === 1)
this.persons = def ? [def, ...persons.filter((p) => p.id !== def.id)] : persons
// 下拉框选项：主用户在最顶部 + 末尾追加「＋ 添加档案」
this.userOptions = [...this.persons.map((p) => p.name), '＋ 添加档案']
this.currentPerson = (await db.getDefaultPerson()) || this.persons[0] || {}
this.userIndex = this.persons.findIndex((p) => p.id === this.currentPerson.id)
```

- `userOptions` / `userIndex` / `onSwitchUser` 均基于排序后的 `this.persons`，索引与切换逻辑自动一致，无需改动其他方法。
- 我的页（`person-list/index.vue`）档案列表保持原有顺序，不受影响。

## 兼容性

- H5 与 App 行为一致：顶部均多出 16rpx 空白；App 额外叠加状态栏高度。
- 单用户场景（默认库只有"我"）：排序结果不变，下拉框仍只有一项 + 添加档案，主用户即在顶部。
- 主用户被切换后（`setDefaultPerson` 更新 `is_default`），下次 `load()` 重新排序，新主用户自动置顶。

## 验证

1. `cd frontend && npm test` — 纯 UI/页面逻辑改动，59 例测试应全部通过。
2. `npm run build:app` — 确认 App 端编译通过（可选）。
3. H5 目测：主页顶部与状态栏之间留 16rpx 空白；切换档案后下拉框中主用户始终在第一位。

## 非目标（本期不做）

- 不做任何导出/导入改动（含"按档案层级导出"），`export.js` 与相关测试保持现状。
- 不改我的页档案列表的排序。
- 不改数据层排序逻辑（`db.getPersons` 保持 created_at 倒序，置顶逻辑仅在本页处理）。
