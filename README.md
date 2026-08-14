<div align="center">

<img src="frontend/src/static/app-icon-1024.png" width="120" alt="时光档案" />

# 时光档案 · my_life_line

**本地优先 · 离线可用 · 隐私自掌** 的时光档案安卓 App

以「档案」为中心（人物、宠物、设备皆可），记录其重要时刻——时间、照片、文字。

<p>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node-%E2%A5%9022.12-339933?logo=node.js&logoColor=white" alt="Node ≥22.12" /></a>
  <a href="https://vuejs.org/"><img src="https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white" alt="Vue 3" /></a>
  <a href="https://uniapp.dcloud.io/"><img src="https://img.shields.io/badge/uni--app-2B2D4A?logo=data:command" alt="uni-app" /></a>
  <a href="https://www.sqlite.org/"><img src="https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white" alt="SQLite" /></a>
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/License-私有-lightgrey" alt="License" />
</p>

<p>
  <img src="https://img.shields.io/badge/时光机-✓-4a6cf7" alt="时光机" />
  <img src="https://img.shields.io/badge/本月概览-✓-4a6cf7" alt="本月概览" />
  <img src="https://img.shields.io/badge/主题配色-✓-4a6cf7" alt="主题配色" />
  <img src="https://img.shields.io/badge/前后浏览-✓-4a6cf7" alt="前后浏览" />
  <img src="https://img.shields.io/badge/导入导出-✓-4a6cf7" alt="导入导出" />
</p>

</div>

---

## ✨ 核心特性

<table>
  <tr>
    <td width="50%" valign="top">

#### 📚 多档案 · 多时间线

- 同时记录自己、家人、宠物等多个档案
- 主页右上角下拉框一键切换当前档案
- 每个档案可建多条时间线，按主题分类（成长 / 教育 / 旅行 / 健康…）
- 每人自动生成一条不可删除的「主线」

    </td>
    <td width="50%" valign="top">

#### 🕯️ 时光机 · 本月概览

- **时光机**：主页轮播「历史上同月同日」的事件，每日打开都有新内容
- **本月活动彩条**：主色进度条展示本月新增占比，首页有数据脉动
- **我的页概览**：本月新增事件数 + 最活跃时间线
- **下拉刷新**：主页支持下拉重查，符合主流应用习惯

    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">

#### 📝 事件记录 · 三种视图

- **时间点** 或 **起止时间段**（`date_end` 空表示"至今"）
- 多张图片（相册 + 拍照，最多 9 张），自动压缩 + 缩略图
- 标题 + 描述，事件详情页底部可「←上一个 / 下一个→」连贯浏览
- **时间轴 / 照片墙 / 卡片流** 三种视图随时切换，时间轴节点带主色圆点锚

    </td>
    <td width="50%" valign="top">

#### 🎨 主题配色 · 离线私有

- 6 个预设主色 + 自定义调色盘
- 主题切换全局跟随（tabBar、卡片、按钮、时间轴、输入框…）
- 每页面 `onShow` 重新应用主题，跨页一致
- **完全离线**：数据只存手机本地 SQLite，不依赖网络

    </td>
  </tr>
</table>

> 📌 **导入 / 导出**：一键备份为 JSON + 图片包，可完整恢复
> 📌 **搜索**：按标题 / 描述关键词搜索事件（300ms debounce）

---

## 🛠 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | uni-app（Vue 3） | 编译为安卓 App |
| 存储 | 手机本地 SQLite（`plus.sqlite`） | App 端专用，H5/测试用内存适配器 |
| 图片 | 应用私有目录（`plus.io`） | 压缩图 + 缩略图 |
| 后端（后期预留） | Python（FastAPI）+ 数据库 | 社区分享，尚未实现 |

---

## 🗂 数据模型

```
Person 档案（UUID，is_default 标记当前用户）
  └ Timeline 时间线（UUID，可分类，is_main 标记主线）
        └ Event 事件（UUID）
              ├── 时间：时间点 或 时间段（date_end 空表示"至今"）
              ├── 图片：多张（event_image，sort_order 排序）
              ├── 标题
              └ 描述
```

所有实体使用 **UUID 主键**，为将来"分享时间线 / 社区功能"铺路。

---

## 🚀 开发

仓库为前后端一体 monorepo：前端 `frontend/`（uni-app），后端 `backend/`（后期社区功能占位）。以下命令均在 `frontend/` 目录内执行。

```bash
cd frontend

# 安装依赖
npm install

# 运行（H5 调试）
npm run dev:h5

# 构建安卓资源
npm run build:app
```

> ⚠️ **Node 要求**：使用 Node ≥ 22.12（vitest 4.1.x 的配置加载用 CJS `require('std-env')`，而 std-env 4.x 纯 ESM，Node 20 会报 `ERR_REQUIRE_ESM`）。nvm 已装 `v22.23.2`。

---

## 🧪 测试

```bash
npm test        # 单元测试（vitest，覆盖纯逻辑与数据层）
npm run dev:h5  # H5 调试
```

测试覆盖 `src/utils/` 下的纯逻辑（date、db、export、id、image、schema、storage、theme）与 SQLite 适配器的 SQL 生成。无组件/页面测试。

---

## 📦 真机打包（APK）

本仓库无法直接出 APK，需在 Windows 上用 HBuilderX 打开本项目：

1. HBuilderX 菜单 → 文件 → 打开目录 → 选择项目根目录
2. 运行 → 运行到手机或模拟器（真机需开启 USB 调试）
3. 发行 → 原生 App 云打包（需 DCloud 账号）

> 📌 **tabBar 图标**：必须用 PNG（81×81），App 原生 tabBar 不支持 SVG；如要改图标，替换 `src/static/tab-*.png` 并在 `src/pages.json` 更新路径即可。

详细设计见 `docs/superpowers/specs/2026-08-12-life-timeline-design.md`。

---

## 🗺 路线图

- [x] 设计规格
- [x] 前端：纯本地 App（uni-app + SQLite）
- [x] 体验优化：时光机、本月概览、主题配色、下拉刷新、前后事件浏览
- [ ] 后期：Python 后端 + 社区分享（预留）

---

<div align="center">

<sub>时光档案 · 本地优先 · 隐私自掌</sub>

</div>
