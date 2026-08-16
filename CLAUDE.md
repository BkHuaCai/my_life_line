# CLAUDE.md

Guidance for AI coding agents working in this repository. This is the only project-instruction file the agent loads (no `.atomcode.md` / `AGENTS.md` exists).

## Project Overview

A **local-first Android app** for recording life timeline events (time, photos, text). Built with uni-app (Vue 3), compiles to native Android APK. Data is stored locally in SQLite with no network dependency. The repo is a frontend/backend monorepo; only the frontend is implemented so far.

## Repository Layout

- `frontend/` — the uni-app (Vue 3) app. All npm commands run from here.
- `backend/` — placeholder for a future FastAPI sync/community server. No Python code yet; don't implement it in this phase.
- `docs/superpowers/` — design spec + plan (`specs/2026-08-12-life-timeline-design.md` is the authoritative design doc).

## Common Commands (from `frontend/`)

```bash
npm install        # install dependencies
npm run dev:h5     # H5 dev server (debugging)
npm run build:app  # build Android resources → dist/
npm test           # vitest unit tests (Node env, no DOM)
```

No lint or format tooling is configured (no ESLint/Prettier config anywhere) — `npm test` is the only automated check. `npm run test:coverage` prints a coverage summary; `npm run test:watch` reruns on changes.

**Node requirement**: use Node ≥ 22.12 (nvm has `v22.23.2`). vitest 4.1.10 loads its config via CJS `require('std-env')`, but std-env 4.x is ESM-only, so Node 20 fails with `ERR_REQUIRE_ESM`.

**APK**: this repo produces Android resources only. Building an APK requires HBuilderX on Windows: open the project root → Run to device, or Release → Native App Cloud Build (needs a DCloud account).

## Architecture

- **Data layer**: all CRUD goes through `src/utils/db.js` (`createDb(adapter)`); a module-level `db = createDb(resolveAdapter())` singleton is created at import time.
- **Storage adapter**: `src/utils/storage.js` — `createSqliteAdapter()` wraps `plus.sqlite` (App only; DB `my_life_line` at path `_doc`), `createMemoryAdapter()` backs tests/H5. `resolveAdapter()` detects the environment via the global `plus`; code touching `plus.*` crashes outside a real App runtime.
- **Images**: `image.js` writes compressed + thumbnail copies into the App private dir via `plus.io`.
- **Schema**: `schema.js` defines tables `person`, `timeline`, `event`, `event_image`. All entities use UUID PKs (`id.js`). Events are `date_type = 'point'` or `'range'` (`date_end = null` means "ongoing"). `timeline`/`event` 有 `deleted_at` 软删列（回收站用），老库由 `adapter.migrate` 在 init 时 ALTER 补列。
- **Theme**: `theme.js` — `applyTheme(primary)` writes CSS vars to the current page's `documentElement` and calls `uni.setTabBarStyle` (with a `fail` callback to swallow the async "not TabBar page" reject on H5/non-tabBar pages). App 端每个 vue 页面是独立 webview，所以每页 `onShow` 都要 `applyTheme(getThemePrimary())` 重应用主题，否则切页后仍是默认色。`PRESET_COLORS` 是 11 个预设色，`saveThemePrimary/getThemePrimary` 持久化到 `uni.setStorageSync`。
- **Pages**: every page must be registered in `src/pages.json` (including tabBar entries). tabBar icons live at `src/static/tab-*.png` — must be PNG (81×81), because the App 原生 tabBar 不支持 SVG；如要改图标，替换 PNG 并在 pages.json 更新路径即可。Pages live at `src/pages/<name>/index.vue`; shared views in `src/components/`. 非 tab 页统一用 `components/nav-bar.vue` 自定义返回栏（标题 + 返回按钮），对应页面在 pages.json 配 `navigationStyle: custom`。
- **Init race**: `db.init()` 是异步的（建表 + 插默认用户「我」+ 建主线），真机 SQLite 慢于首屏渲染。`db.ready` 暴露这个 Promise（单例，只跑一次）；每个页面 `onShow` 必须先 `if (db.ready) await db.ready.catch(() => {})` 再查询，否则首次启动会因竞态导致 `currentPerson.id` 为空、整块 `v-if` 消失。
- **Home page extras**: 主页有「时光机」卡片（历史上同月同日事件轮播，`db.getTodayEvents`）、「本月活动」主色进度条 + 下拉刷新（`pages.json` 开了 `enablePullDownRefresh`，`onPullDownRefresh` 重查）、主线卡顶部主色渐变封面条、其他时间线卡左缩略图五色循环点缀。
- **Event detail**: 事件详情页底部有「←上一个 / 下一个→」浏览，`db.getAdjacentEvents` 返回同时间线按日期排序的前后事件，`goAdjacent(id)` 不返回列表直接刷新本页内容。

## Tests

`npm test` (vitest, `environment: 'node'`) covers pure logic in `src/utils/` (date, db, export, id, image, schema, storage, sqlite-sql, theme). `db.test.js` 覆盖 db 层的 CRUD + 时光机/本月概览/前后事件等查询；`sqlite-sql.test.js` 桩 `plus.sqlite` 校验 App 端生成的 SQL 合法性。No component/page tests exist; `passWithNoTests: true` means an empty run still exits 0.

## Gotchas

- The root-level `package-lock.json` (91 bytes) is a leftover stub — ignore it and never `npm install` at the repo root; real dependencies live under `frontend/`.
- `frontend/package-lock.json` is gitignored yet tracked, so `git status` shows it modified after any install — that's expected, don't revert it.
- SQL values are escaped manually via `esc()` in `storage.js` (no parameter binding); keep new SQL flowing through the same escaping.
- `person.is_default` marks the current user. `db.init()` auto-creates one named "我" when no person exists (first launch); the default user cannot be deleted (`db.deletePerson` throws, page hides the button). The home page's top-right user dropdown (uni picker) calls `setDefaultPerson` to switch the current user; with a single user there is nothing to switch to.
- Every person gets an auto-created main timeline (`timeline.is_main = 1`, name "主线") via `savePerson`/`init`; it can be renamed but not deleted (`db.deleteTimeline` throws; `deletePerson` force-deletes it). A main timeline with zero events shows a mandatory "填写初始点" form when opened.
- **回收站**: `deleteTimeline`/`deleteEvent` 是软删除（置 `deleted_at`，时间线会连其事件一起进回收站）；`db.getTrash`/`restoreTimeline`/`restoreEvent`/`purgeTimeline`/`purgeEvent` 提供查看/恢复/彻底删除，`purgeExpiredTrash()` 清理超过 5 天的项（init 启动时 + 回收站页 onShow 自动调用）。`deletePerson` 仍是物理级联删除（人物删除时其时间线/事件不进回收站）。
