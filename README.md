# 时光档案 App（my_life_line）

一个**本地记录**的时光档案安卓应用。以「档案」为中心（可以是人物、宠物、设备等），记录其重要时刻——时间、照片、文字。同一个档案可以拥有多条分类时间线。

## 核心特性

- **多档案**：可同时记录自己、家人、宠物等多个人物；主页右上角下拉框一键切换当前档案
- **多时间线**：每个档案可建多条时间线，并按主题分类（成长、教育、旅行、健康…）；每人自动生成一条不可删除的「主线」
- **三种视图**：时间轴 / 照片墙 / 卡片流，随时切换；时间轴节点带主色圆点锚，更有看头
- **事件记录**：支持「时间点」或「起止时间段」（含"至今"），多张图片（相册 + 拍照）、标题、描述
- **图片压缩**：自动压缩并生成缩略图，控制手机存储占用
- **时光机**：主页展示「历史上同月同日」的事件轮播，每日打开都有新内容
- **本月概览**：主页「本月新增」主色进度条 + 我的页「最活跃时间线」数据脉动
- **下拉刷新**：主页支持下拉刷新数据，符合主流应用习惯
- **事件前后浏览**：事件详情页底部「←上一个 / 下一个→」，无需返回列表即可连贯浏览
- **主题配色**：6 个预设主色 + 自定义调色盘，全局跟随（tabBar、卡片、按钮、时间轴等）
- **搜索**：按标题 / 描述关键词搜索事件（300ms debounce，避免高频查询）
- **导入 / 导出**：一键备份为 JSON + 图片包，可完整恢复
- **完全离线私有**：数据只存手机本地 SQLite，不依赖网络

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | uni-app（Vue 3）→ 编译为安卓 App |
| 存储 | 手机本地 SQLite（`plus.sqlite`） |
| 图片 | 应用私有目录（`plus.io`），压缩图 + 缩略图 |
| 后端（后期预留） | Python（FastAPI）+ 数据库，社区分享 |

## 数据模型

```
Person 档案（UUID，is_default 标记当前用户）
  └── Timeline 时间线（UUID，可分类，is_main 标记主线）
        └── Event 事件（UUID）
              ├── 时间：时间点 或 时间段（date_end 空表示"至今"）
              ├── 图片：多张（event_image，sort_order 排序）
              ├── 标题
              └描述
```

所有实体使用 **UUID 主键**，为将来"分享时间线 / 社区功能"铺路。

## 开发

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

**Node 要求**：使用 Node ≥ 22.12（vitest 4.1.x 的配置加载用 CJS `require('std-env')`，而 std-env 4.x 纯 ESM，Node 20 会报 `ERR_REQUIRE_ESM`）。nvm 已装 `v22.23.2`。

## 测试

```bash
npm test        # 单元测试（vitest，覆盖纯逻辑与数据层）
npm run dev:h5  # H5 调试
```

测试覆盖 `src/utils/` 下的纯逻辑（date、db、export、id、image、schema、storage、theme）与 SQLite 适配器的 SQL 生成。无组件/页面测试。

## 真机打包（APK）

本仓库无法直接出 APK，需在 Windows 上用 HBuilderX 打开本项目：

1. HBuilderX 菜单 → 文件 → 打开目录 → 选择项目根目录
2. 运行 → 运行到手机或模拟器（真机需开启 USB 调试）
3. 发行 → 原生 App 云打包（需 DCloud 账号）

**tabBar 图标**：必须用 PNG（81×81），App 原生 tabBar 不支持 SVG；如要改图标，替换 `src/static/tab-*.png` 并在 `src/pages.json` 更新路径即可。

详细设计见 `docs/superpowers/specs/2026-08-12-life-timeline-design.md`。

## 路线图

- [x] 设计规格
- [x] 前端：纯本地 App（uni-app + SQLite）
- [x] 体验优化：时光机、本月概览、主题配色、下拉刷新、前后事件浏览
- [ ] 后期：Python 后端 + 社区分享（预留）
