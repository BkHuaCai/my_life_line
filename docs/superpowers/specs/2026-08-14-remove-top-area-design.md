# 设计文档：移除主页/我的页顶部区域（2026-08-14）

## 背景与目标

用户反馈主页（`pages/index/index`）顶部"我"字上方的空白区域、以及"我的"页（`pages/person-list/index`）顶部"档案"标题栏区域占位过高，要求去除顶部区域，让内容上移。

经澄清确认（用户两次回答 + 方案选择）：
- 主页顶部：去掉顶部空白区域（原生导航栏空标题区域），内容顶到状态栏下方。
- 我的页顶部：去掉原生导航栏"档案"标题区域；**保留 ⋮ 设置按钮（导出/导入入口）**，仅去掉"我的"大标题文字与原生导航栏。

最终选定方案：**完全去掉顶部**（`navigationStyle: custom`），但保留我的页的导出/导入入口。

## 范围

- `frontend/src/pages.json`：主页、我的页两个 tabBar 页面启用自定义导航。
- `frontend/src/pages/index/index.vue`：顶部加状态栏安全区，内容上移。
- `frontend/src/pages/person-list/index.vue`：顶部加状态栏安全区，去掉"我的"标题，保留 ⋮ 按钮。

不改动数据层、不改动其他页面、不引入新依赖。

## 设计

### 1. pages.json（2 处修改）

两个 tabBar 页面 style 增加 `"navigationStyle": "custom"`：

```json
{ "path": "pages/index/index", "style": { "navigationBarTitleText": "", "enablePullDownRefresh": true, "navigationStyle": "custom" } },
{ "path": "pages/person-list/index", "style": { "navigationBarTitleText": "档案", "navigationStyle": "custom" } }
```

原生导航栏消失后，页面内容从屏幕最顶部开始绘制，需在页面内自行补偿状态栏高度。

### 2. 主页 index/index.vue

- `.page` 增加 `padding-top: var(--status-bar-height)`（uni-app 内置 CSS 变量：App 端为状态栏实际高度，H5 端为 0，自动适配）。
- hero（问候语 + 用户切换下拉）、搜索栏、数据概览、时光机、本月活动、主线/其他时间线等**全部内容保留**，整体上移。
- 下拉刷新（`enablePullDownRefresh`）与自定义导航不冲突，保留。

### 3. 我的页 person-list/index.vue

- `.page` 增加 `padding-top: var(--status-bar-height)`。
- 模板顶部 `.header` 中：删除 `.header-title`（"我的"大标题文字），**保留 `.settings-btn`（⋮ 按钮）**。
- `.header` 容器改为右对齐（`justify-content: flex-end`）或直接保留容器仅去标题，确保 ⋮ 按钮位于右上角。
- `showMoreMenu` / `doExport` / `doImport` 方法及 `serialize` / `importData` 导入**全部保留**（导出/导入入口仍可用）。

## 兼容性

- H5：`--status-bar-height` 为 0，`navigationStyle: custom` 生效，内容直接顶到顶部。
- App：`--status-bar-height` 为状态栏实际高度，内容避开状态栏。
- 自定义导航在 tabBar 页面上无返回按钮问题（tabBar 页面本来就没有返回箭头）。

## 验证

1. `cd frontend && npm test` — 纯 UI 改动，57 例测试应全部通过。
2. `npm run build:app` — 确认 App 端编译通过（可选，若环境允许）。
3. 真机/H5 目测：主页顶部空白消失、内容上移；我的页右上角仍有 ⋮ 按钮且导出/导入可用。

## 非目标（本期不做）

- 不改其他页面（时间线、事件详情、编辑表单）的导航栏。
- 不引入自定义导航组件库。
- 不删除导出/导入相关代码。
