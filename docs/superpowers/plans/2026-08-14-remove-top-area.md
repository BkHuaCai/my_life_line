# 移除主页/我的页顶部区域 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 主页与我的页去掉原生导航栏（顶部空白/「档案」标题区），内容顶到状态栏下方；我的页保留 ⋮ 设置按钮（导出/导入入口）。

**架构：** 两个 tabBar 页面在 `pages.json` 中启用 `navigationStyle: "custom"`，页面内 `.page` 用 `padding-top: var(--status-bar-height)` 补偿状态栏（App 端为真实高度、H5 端为 0，自动适配）；我的页删除模板中的 `.header-title` 并把 `.header` 改为右对齐，保留 `.settings-btn`。

**技术栈：** uni-app (Vue 3) + vitest（node 环境，`tests/**/*.test.js` 自动收集，`passWithNoTests: true`）。

**规格：** `docs/superpowers/specs/2026-08-14-remove-top-area-design.md`

---

### 任务 1：pages.json 自定义导航配置（含契约测试）

**文件：**
- 创建：`frontend/tests/pages-config.test.js`
- 修改：`frontend/src/pages.json:3-4`

- [ ] **步骤 1：编写失败测试**

创建 `frontend/tests/pages-config.test.js`：

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// vitest 以 frontend/ 为 cwd 运行，直接读 src/pages.json
const pagesJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/pages.json'), 'utf8'))
const customNavPages = pagesJson.pages.filter((p) => p.style && p.style.navigationStyle === 'custom').map((p) => p.path)

describe('pages.json 顶部区域配置', () => {
  it('主页与我的页启用自定义导航（移除原生导航栏）', () => {
    expect(customNavPages).toEqual(expect.arrayContaining(['pages/index/index', 'pages/person-list/index']))
  })
  it('tabBar 全部页面都启用了自定义导航', () => {
    const tabPaths = pagesJson.tabBar.list.map((t) => t.pagePath)
    for (const t of tabPaths) expect(customNavPages).toContain(t)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`cd frontend && npx vitest run tests/pages-config.test.js`
预期：FAIL（`customNavPages` 为空数组，`toEqual(arrayContaining([...]))` 不匹配）

- [ ] **步骤 3：修改 pages.json**

将 `frontend/src/pages.json` 第 3-4 行改为（各加 `"navigationStyle": "custom"`，其余字段保留）：

```json
    { "path": "pages/index/index", "style": { "navigationBarTitleText": "", "enablePullDownRefresh": true, "navigationStyle": "custom" } },
    { "path": "pages/person-list/index", "style": { "navigationBarTitleText": "档案", "navigationStyle": "custom" } },
```

> 注意：`navigationBarTitleText` 保留不动（自定义导航下无实际作用但无害，符合规格）。

- [ ] **步骤 4：运行测试确认通过**

运行：`cd frontend && npx vitest run tests/pages-config.test.js`
预期：PASS（2 个用例全过）

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/pages.json frontend/tests/pages-config.test.js
git commit -m "feat: 主页与我的页启用自定义导航，移除顶部原生导航栏"
```

> 注意：`frontend/src/manifest.json` 有用户未提交的本地改动，**不要** add 它。

---

### 任务 2：主页顶部状态栏安全区

**文件：**
- 修改：`frontend/src/pages/index/index.vue:296`

- [ ] **步骤 1：修改 .page 样式**

当前（第 296 行）：

```css
.page { padding: 24rpx; padding-bottom: 140rpx; }
```

改为：

```css
.page { padding: 24rpx; padding-bottom: 140rpx; padding-top: var(--status-bar-height); }
```

`padding-top: var(--status-bar-height)` 声明必须放在 `padding: 24rpx` **之后**，覆盖顶部内边距（App 端为状态栏实际高度，H5 端为 0，内容直接顶到顶部）。

- [ ] **步骤 2：回归验证**

运行：`cd frontend && npm test`
预期：全部测试通过（含任务 1 新增的 2 例，总数 59 例）

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/pages/index/index.vue
git commit -m "feat: 主页顶部增加状态栏安全区，内容上移"
```

---

### 任务 3：我的页去标题、保留 ⋮ 按钮

**文件：**
- 修改：`frontend/src/pages/person-list/index.vue:3-8`（模板）、`frontend/src/pages/person-list/index.vue:250`（样式）

- [ ] **步骤 1：修改模板**

当前（第 3-8 行）：

```html
    <view class="header">
      <view class="header-title">我的</view>
      <view class="header-actions">
        <view class="settings-btn" @click="showMoreMenu">⋮</view>
      </view>
    </view>
```

改为（删除 `.header-title`，保留 `.header-actions` 及其中的 ⋮ 按钮）：

```html
    <view class="header">
      <view class="header-actions">
        <view class="settings-btn" @click="showMoreMenu">⋮</view>
      </view>
    </view>
```

- [ ] **步骤 2：修改 .header 样式**

当前（第 250 行）：

```css
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
```

改为（右对齐，⋮ 按钮保持在右上角）：

```css
.header { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 24rpx; }
```

- [ ] **步骤 3：加顶部安全区**

在 `.page` 规则（第 249 行）中增加 `padding-top: var(--status-bar-height)`（放在 `padding: 24rpx` 之后）：

```css
.page { padding: 24rpx; padding-bottom: 140rpx; padding-top: var(--status-bar-height); }
```

- [ ] **步骤 4：回归验证**

运行：`cd frontend && npm test`
预期：全部通过（59 例）。`showMoreMenu` / `doExport` / `doImport` 与 `serialize` / `importData` 导入**原样保留**，不得删除。

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/pages/person-list/index.vue
git commit -m "feat: 我的页去掉「我的」标题，保留右上角设置按钮"
```

---

### 任务 4：整体验证与推送

**文件：** 无（纯验证）

- [ ] **步骤 1：完整测试**

运行：`cd frontend && npm test`
预期：Test Files 9 passed、Tests 59 passed

- [ ] **步骤 2：App 编译检查**

运行：`cd frontend && npm run build:app`
预期：编译成功，`dist/` 生成 Android 资源（若因环境失败，报告失败原因，不得谎报通过）

- [ ] **步骤 3：推送远程**

```bash
git push origin master
```

预期：推送成功（用户偏好：验证通过即提交并推送到 origin/master，无需询问）

---

## 自检结论

- **规格覆盖度**：规格"设计"三节（pages.json、主页、我的页）分别由任务 1/2/3 覆盖；"验证"节由任务 4 覆盖；"非目标"（不动其他页面、不引入依赖、不删导出/导入代码）在任务 3 步骤 4 中显式声明。
- **占位符扫描**：无"待定/TODO/补充细节"；每个改动步骤都包含完整代码块与精确行号。
- **类型一致性**：全程只改 pages.json 与两个 vue 页面；CSS 变量 `--status-bar-height` 为 uni-app 内置，测试通过 JSON 断言而非依赖 vue 组件，无跨任务签名不一致。
