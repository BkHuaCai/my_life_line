# CLAUDE.md

Guidance for AI coding agents working in this repository. This is the only project-instruction file the agent loads (no `.atomcode.md` / `AGENTS.md` exists).

## Project Overview

A **local-first Android app** for recording life timeline moments (time, photos, text) — UI 术语叫「动态」，代码里仍是 `event`/`event_image` 表与 `db.*Event*` 接口，两者等价。Built with uni-app (Vue 3), compiles to native Android APK. Data is stored locally in SQLite with no network dependency. The repo is a frontend/backend monorepo; only the frontend is implemented so far.

## Repository Layout

- `frontend/` — the uni-app (Vue 3) app. All npm commands run from here.
- `backend/` — placeholder for a future FastAPI sync/community server. No Python code yet; don't implement it in this phase.
- `docs/` — `build-apk.md`（Windows 打包 APK 指南）、`superpowers/specs/2026-08-12-life-timeline-design.md`（权威设计文档）。历史上零散的 plan/design 文档已随功能演进删除，以代码为准。

## Common Commands (from `frontend/`)

```bash
npm install        # install dependencies
npm run dev:h5     # H5 dev server (debugging)
npm run build:app  # build Android resources → dist/
npm test           # vitest unit tests (Node env, no DOM)
```

No lint or format tooling is configured (no ESLint/Prettier config anywhere) — `npm test` is the only automated check. `npm run test:coverage` prints a coverage summary; `npm run test:watch` reruns on changes.

**Node requirement**: use Node ≥ 22.12 (nvm has `v22.23.2`). vitest 4.1.10 loads its config via CJS `require('std-env')`, but std-env 4.x is ESM-only, so Node 20 fails with `ERR_REQUIRE_ESM`.

**APK**: this repo produces Android resources only. Building an APK requires HBuilderX on Windows: import `frontend/`（不是仓库根目录）→ Run to device, or Release → Native App Cloud Build (needs a DCloud account). 详见 `docs/build-apk.md`。

## Architecture

- **Data layer**: all CRUD goes through `src/utils/db.js` (`createDb(adapter)`); a module-level `db = createDb(resolveAdapter())` singleton is created at import time.
- **Storage adapter**: `src/utils/storage.js` — `createSqliteAdapter()` wraps `plus.sqlite` (App only; DB `my_life_line` at path `_doc`), `createMemoryAdapter()` backs tests/H5. `resolveAdapter()` detects the environment via the global `plus`; code touching `plus.*` crashes outside a real App runtime. `plus.sqlite.openDatabase` 是异步的，适配器内缓存 open Promise，所有 SQL 都等数据库真正打开后再执行。
- **Images**: `image.js` 选择图片后压缩，压缩图与缩略图经 `uni.saveFile` 持久化到 App 私有目录（不能只存临时路径，否则 App 重启后图片丢失）；H5 无 saveFile 时退回临时路径（开发用）。
- **Schema**: `schema.js` defines tables `person`, `timeline`, `event`, `event_image`. All entities use UUID PKs (`id.js`). 动态是 `date_type = 'point'` 或 `'range'`（`date_end = null` 表示"至今"）。`timeline`/`event` 有 `deleted_at` 软删列（回收站用），`event` 另有 `trash_tl_name` 快照列（软删时记录所属时间线名，供回收站恢复时提示「时间线已不存在/已改名」）；老库由 `adapter.migrate` 在 init 时 ALTER 补列。
- **Theme**: `theme.js` — `applyTheme(primary)` writes CSS vars to the current page's `documentElement` and calls `uni.setTabBarStyle` (with a `fail` callback to swallow the async "not TabBar page" reject on H5/non-tabBar pages). App 端每个 vue 页面是独立 webview，所以每页 `onShow` 都要 `applyTheme(getThemePrimary())` 重应用主题，否则切页后仍是默认色。`PRESET_COLORS` 是 11 个预设色，`saveThemePrimary/getThemePrimary` 持久化到 `uni.setStorageSync`。
- **Pages**: every page must be registered in `src/pages.json` (including tabBar entries). tabBar icons live at `src/static/tab-*.png` — must be PNG (81×81), because the App 原生 tabBar 不支持 SVG；如要改图标，替换 PNG 并在 pages.json 更新路径即可。Pages live at `src/pages/<name>/index.vue`; shared views in `src/components/`. 非 tab 页（档案/时间线/动态详情/编辑/回收站）统一用 `components/nav-bar.vue` 自定义返回栏（标题 + 返回按钮），对应页面在 pages.json 配 `navigationStyle: custom`。
- **Init race**: `db.init()` 是异步的（建表 + 迁移 + 插默认用户「我」+ 建主线 + 清理过期回收站），真机 SQLite 慢于首屏渲染。`db.ready` 暴露这个 Promise（单例，只跑一次）；每个页面 `onShow` 必须先 `if (db.ready) await db.ready.catch(() => {})` 再查询，否则首次启动会因竞态导致 `currentPerson.id` 为空、整块 `v-if` 消失。
- **Home page extras**: 主页有「时光机」卡片（仅展示一年前及更早的同月同日动态，`db.getTodayEvents` 已排除当年记录；无历史动态时整块隐藏）、「本月活动」主色进度条 + 下拉刷新（`pages.json` 开了 `enablePullDownRefresh`，`onPullDownRefresh` 重查）、右上角档案切换器（选择列表首项是「选择档案」标题，不参与切换）、主线卡顶部主色渐变封面条、其他时间线卡左缩略图五色循环点缀、按标题/描述关键词搜索（`db.searchEvents`，300ms debounce）。
- **Event detail**: 动态详情页底部有「←上一个 / 下一个→」浏览，`db.getAdjacentEvents` 返回同时间线按日期排序的前后动态，`goAdjacent(id)` 不返回列表直接刷新本页内容；顶部图片区仅在有图时渲染（无图直接展示内容）；删除动态确认后立即 `navigateBack`（不做撤回条，恢复走回收站）。
- **初始点**: 任何时间线的第一条动态即初始点——空时间线点「＋ 动态」打开「填写初始点」弹窗（`addEvent()` 判断 `events.length === 0`），仅支持时间点（日期 + 可选时间精度 + 「当前时间」按钮），不支持时间段；主线为空时打开页面自动弹窗。

## Tests

`npm test` (vitest, `environment: 'node'`) covers pure logic in `src/utils/` (date, db, export, id, image, schema, storage, sqlite-sql, theme). `db.test.js` 覆盖 db 层的 CRUD + 时光机/本月概览/前后动态/回收站（软删/恢复/彻底删/过期清理/trash_tl_name 快照）等查询；`sqlite-sql.test.js` 桩 `plus.sqlite` 校验 App 端生成的 SQL 合法性。No component/page tests exist; `passWithNoTests: true` means an empty run still exits 0.

## Gotchas

- The root-level `package-lock.json` (91 bytes) is a leftover stub — ignore it and never `npm install` at the repo root; real dependencies live under `frontend/`.
- `frontend/package-lock.json` is gitignored yet tracked, so `git status` shows it modified after any install — that's expected, don't revert it.
- SQL values are escaped manually via `esc()` in `storage.js` (no parameter binding); keep new SQL flowing through the same escaping.
- `person.is_default` marks the current user. `db.init()` auto-creates one named "我" when no person exists (first launch); the default user cannot be deleted (`db.deletePerson` throws, page hides the button). The home page's top-right user dropdown (uni picker) calls `setDefaultPerson` to switch the current user; with a single user there is nothing to switch to.
- Every person gets an auto-created main timeline (`timeline.is_main = 1`, name "主线") via `savePerson`/`init`; it can be renamed but not deleted (`db.deleteTimeline` throws; `deletePerson` force-deletes it). 空时间线（含主线）的第一条动态必须通过「填写初始点」弹窗录入（仅时间点）。
- **回收站**: `deleteTimeline`/`deleteEvent` 是软删除（置 `deleted_at`，时间线会连其动态一起进回收站，动态同时快照 `trash_tl_name`）；`db.getTrash`/`restoreTimeline`/`restoreEvent`/`purgeTimeline`/`purgeEvent` 提供查看/恢复/彻底删除，`purgeExpiredTrash()` 清理超过 5 天的项（init 启动时 + 回收站页 onShow 自动调用）。`deletePerson` 仍是物理级联删除（人物删除时其时间线/动态不进回收站）。
- **回收站页 `pages/trash`**: 恢复前弹窗确认（动态显示目标时间线 + 日期；时间线已不存在/已改名时提示，依赖 `trash_tl_name` 快照）；支持勾选 + 全选 + 「删除选中」批量彻底删除；「删除全部」必须先全选，点击后删除的是勾选的数据。
- **撤回提示条**: `components/undo-toast.vue` 仅用于档案页删除时间线后（列表页展示「已删除 + 撤回」，5 秒未操作自动消失）；动态详情页删除后直接返回，不做撤回条。
- **云打包配置（manifest.json）**：依赖的模块必须显式声明，否则真机功能失效。`app-plus.modules` 需含 `SQLite`（数据库）与 `Camera`（相册/拍照选图，HBuilderX 3.6.11+ 默认不再包含）；`app-plus.distribute.android.abiFilters` 需含 `x86`（否则模拟器只能走 ARM 翻译，weex JS 服务起不来 → 白屏）。注意：HBuilderX 云打包实际只产 arm64-v8a/armeabi-v7a/x86，不支持 x86_64；且 API 34 起的模拟器镜像已移除 32 位 x86，真机级验证请用 android-30 镜像。
- **plus.sqlite 路径坑**：`plus.sqlite.openDatabase({name, path})` 的 `path` 必须是含文件名的路径（如 `_doc/my_life_line.db`），不能只传目录 `_doc`，否则 DCloud 5.x 运行时报 `SQLITE_CANTOPEN: Path is a directory`，db.ready 永远 reject、所有页面数据为空。`storage.js` 的 `DB_PATH` 已按此修正。
