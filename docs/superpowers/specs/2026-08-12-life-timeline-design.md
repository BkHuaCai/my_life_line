# 时光档案 App 设计规格

日期：2026-08-12
状态：已批准（头脑风暴完成）

## 1. 背景与目标

一个**本地记录**的时光档案安卓 App：以「档案」为中心（人物、宠物、设备等）记录其重要时刻（时间、图片、文字），同一个档案可拥有多条分类时间线。

- 平台：仅安卓
- 前期：数据全部存储在用户手机本地，完全离线、私有
- 后期（预留）：用户可将时间线分享给他人、维护社区；Python 做后端
- 核心要求：**前期私有，但要考虑拓展性**

### 用户技术背景
Java、Python、Vue、JS、HTML 均熟悉。选定技术路线：**uni-app（Vue 3）+ 本地 SQLite**，后期 Python 后端。

## 2. 两期架构

### 前期（本期实现）—— 纯本地 App
- uni-app（Vue 3 CLI 工程）编译为安卓 App
- 数据存手机本地 SQLite（`plus.sqlite`）
- 图片存手机应用私有目录（`plus.io`），自动压缩
- 无任何网络依赖，完全离线可用

### 后期（仅设计预留，本期不实现）—— Python 社区后端
- Python（FastAPI）+ 数据库作为社区服务器
- 功能：账号、分享时间线、社区浏览、同步
- 本期代码保证"加同步层"时不重写 App

## 3. 数据模型

所有实体使用 **UUID 主键**（为将来对外分享铺路）。

```
Person 人物（UUID）
  ├── 姓名、头像、出生日期、备注
  └── Timeline 时间线（UUID）
        ├── 名称、分类（可选）、可见性 is_private（默认 true）
        └── Event 动态（UUID）
              ├── 时间：时间点 或 起止时间段（date_type = point | range）
              ├── 图片：多张（相册/拍照，压缩后存储）
              ├── 标题
              └── 描述文字
```

## 4. 页面结构与功能清单

### 页面流程（当前实现）

```
tabBar-主页：当前档案总览（时光机 / 本月活动 / 主线与其他时间线 / 全局搜索 / 右上角档案切换）
tabBar-我的：当前档案卡片 + 数据概览统计带 + 我的档案列表 + 最近动态 + 回收站入口 + 主题配色
  └── 档案详情：该档案的全部时间线（卡片列表）
        └── 时间线视图：核心页面（三种布局可切换；第一条动态即初始点，仅支持时间点）
              └── 动态详情：大图（有图才渲染）+ 标题 + 描述 + 前后浏览
        └── 编辑表单：新建/编辑 时间线、动态
我的 → 回收站页：已删除时间线/动态（恢复确认弹窗 / 彻底删除 / 勾选批量删除）
非 tab 页统一使用 nav-bar 自定义返回栏（navigationStyle: custom）
```

### 功能清单

**核心功能**
1. 人物管理：新增/编辑/删除人物（姓名、头像、出生日期、备注）
2. 时间线管理：每人可建多条时间线，可命名、可选分类（成长/教育/旅行/健康等）
3. 动态管理：增删改；支持**时间点或时间段**、**多张图片**（相册+拍照）、标题、描述
4. **三种视图切换**：时间轴 / 照片墙 / 卡片流，切换状态记忆
5. 图片自动压缩（存缩略图 + 压缩图），控制存储占用

**拓展性功能**
6. ~~导入/导出~~（已取消：用户确认手机端暂时用不上，UI 入口已移除；`export.js` 的 serialize/importData 工具保留，作为未来分享的数据载体）
7. 数据层接口隔离：本地存储封装为统一接口，将来加同步不动业务代码

**搜索**
8. 按标题/描述关键词搜索动态。

**回收站**
9. 删除动态/时间线先进回收站（软删 `deleted_at`，保留 5 天到期自动彻底清除）：可恢复（恢复前弹窗确认目标时间线与日期，时间线已删除/改名时提示）、可勾选 + 全选批量删除、全选后「删除全部」。

## 5. 技术细节

### 工程栈
- uni-app + Vue 3（CLI 工程，便于 git 管理）
- 存储：`plus.sqlite`（原生 SQLite）
- 图片：应用私有目录（`plus.io`），每张图存压缩图 + 小缩略图（列表用）。**不保留原图**（压缩图即日常显示用图，节省手机空间）

### 数据库表设计

```
person      (id UUID PK, name, avatar_path, birth_date, note, is_default, created_at)
timeline    (id UUID PK, person_id FK, name, category, is_private, is_main, created_at, deleted_at)
event       (id UUID PK, timeline_id FK, title, description,
             date_type['point'|'range'], date_point, date_start, date_end,  -- date_end 可为空，表示"至今"
             cover_image_path, created_at, deleted_at, trash_tl_name)       -- 软删 + 时间线名快照（回收站恢复提示用）
event_image (id UUID PK, event_id FK, thumb_path, image_path, sort_order)
```

### 数据层隔离
- `utils/db.js`：统一封装所有增删改查 + 数据库初始化
- `utils/export.js`：导入/导出逻辑
- 页面只调用 `db.js` 接口；将来加同步时改 `db.js` 内部实现，UI 不动

### 导入/导出格式
- 导出：一个文件夹含 `data.json`（全部结构化数据）+ `images/`（图片文件），可压缩为 zip
- 导入：选择 zip 或文件夹，完整还原

## 6. 拓展性设计（为社区预留）

### 后期路径
```
前期（纯本地）──→ 增加"同步层"──→ 后期（社区）
  本地 SQLite             db.js 加同步实现       Python 后端 + 数据库
  私有                    可选"公开"              账号/分享/浏览社区
```

### 前期必须做对的 4 件事
1. **UUID 主键**：人物/时间线/动态全部 UUID，对外分享不冲突
2. **`is_private` 字段**：时间线默认私有，后期"公开分享"只改一个值 + 上传
3. **序列化即分享载体**：`export.js` 的 `serialize()` 产物（JSON + 图片路径）后期直接成为"时间线快照"；导入/导出 UI 已按用户要求取消（`export.js` 工具与测试保留备用），分享/发布可复用同一套序列化逻辑
4. **数据层隔离**：`db.js` 是唯一数据出口，后期加同步只动它

### 明确不做（YAGNI）
- 账号系统、分享链接、社区浏览：后期再说，本期不写相关代码
- 冲突合并、双向同步：等真正需要时再设计

## 6.1 社区共享时间线设计（后期，本期不实现）

后期社区功能分两种"对外"时间线，概念必须区分：

| 类型 | 本地时间线（私有） | 分享时间线（发布） | 共享时间线（多人写） |
| --- | --- | --- | --- |
| 谁能写 | 本人 | 只有本人 | 社区任何登录用户 |
| 谁能读 | 本人 | 社区任何人 | 社区任何人 |
| 是否可改 | 是 | 本人改后重发新版本快照 | 创建者审核他人提交 |
| 存哪 | 本地 SQLite | 后端 DB（只读快照） | 后端 DB（含待审动态表） |

**本地时间线**=本地私有；**分享时间线**=把本地时间线发布一份只读快照到后端，本人更新就重发新版本；**共享时间线**=后端新建或由本地时间线复制一份转为共享，他人可往里提交动态，创建者审核是否展示。

### 后端数据模型（新增表）

```
account                        用户账号
  id (UUID)          PK
  username           唯一
  password_hash
  created_at

shared_timeline               共享时间线（社区多人写）
  id (UUID)          PK        新建或由本地 timeline 复制而来
  creator_account_id          创建者（唯一审核权）
  title / category / desc
  source_timeline_id          若由本地复制：原 UUID（仅记录，不作关联）
  created_at / updated_at

shared_event                  共享时间线上的动态
  id (UUID)          PK
  shared_timeline_id          所属
  author_account_id           提交者（不一定等于创建者）
  title / description / date_*
  images                      URL 数组（后端对象存储）
  status                      pending / approved / rejected
  reviewed_by                 审核者 account_id（创建者）
  reviewed_at
  created_at

share_snapshot                分享时间线（只读快照）的版本
  id (UUID)          PK
  account_id                  发布者
  local_timeline_id           本地时间线 UUID
  version                     递增
  payload                     serialize() 产物（data.json + images）
  created_at
```

### 流程

**A. 分享时间线（只读发布）**
1. 本地选一条时间线 → "发布到社区"
2. 前端复用 `serialize()`（已有的导出逻辑）生成 `data.json + images`
3. 后端存为 `share_snapshot`（绑定 account，含版本号）
4. 其他人浏览/查看快照，**不能往里写**
5. 本人本地改了 → 重新发布 = 上传新版本快照

**B. 共享时间线（多人写 + 审核）**
1. 入口二选一：
   - "新建共享时间线" → 后端建一条空 `shared_timeline`
   - "把本地时间线复制为共享" → 本地 `serialize()` 上传，后端插入 `shared_timeline` + 初始 `shared_event`（全部 approved，author=creator）
2. 其他用户打开该共享时间线 → "添加动态" → 提交一条 `shared_event`（status=pending）
3. 创建者收到待审通知 → 进入审核页 → 三选一：
   - **通过**：status=approved，对所有人可见
   - **拒绝**：status=rejected，附理由，提交者收到通知
   - **删除**：彻底删（提交者收到"已删"通知）
4. 审核前动态**只对创建者 + 提交者本人**可见；审核后对所有人可见

**C. 与本地的关系**
- 共享时间线**不在本地 SQLite 落库**，纯后端
- 用户可在共享时间线浏览页"收藏到本地" → 在本地建一条私有 timeline，**一次性快照拷贝**（不再同步，标 `source=shared:<uuid>` 备溯）

### 后端接口草案（FastAPI）

```
POST   /account/register          注册
POST   /account/login             登录，返 token

# 分享时间线（只读快照）
POST   /share/snapshot            上传/重发本地时间线快照
GET    /share/snapshots           列出社区快照
GET    /share/snapshot/{id}       查看某快照详情

# 共享时间线（多人写 + 审核）
POST   /shared-timeline           新建（空）或由本地复制创建
GET    /shared-timeline           列出社区共享时间线
GET    /shared-timeline/{id}      查看共享时间线（仅 approved 动态对外）
POST   /shared-timeline/{id}/event           他人提交动态（status=pending）
GET    /shared-timeline/{id}/event/pending   创建者查看待审动态
POST   /shared-timeline/{id}/event/{eid}/review  创建者审核（approve/reject/delete）
POST   /shared-timeline/{id}/fav  收藏到本地（一次性快照拷贝）
```

### 前期不动但要记的 4 件事（接上文"前期必须做对"）
1. `is_private` 已有；后期再加 `local_origin`（`mine` / `copied_from_shared`）便于"收藏到本地"溯源，**本期不写**
2. 前期 `serialize()` 的产物就是发布/复制共享的载体——已满足，不动
3. 后端 `shared_event` 也用 UUID——和本地 event 不冲突，"收藏到本地"可直接复用原 UUID
4. 前期数据层隔离不动，后期加 `communityAdapter`（后端 HTTP）与现有 `sqliteAdapter`/`memoryAdapter` 并列

## 7. 工程与 Git

- 代码上传 GitHub
- 生成 uni-app 工程规范的 `.gitignore`（忽略 `node_modules`、`unpackage` 构建产物、`.local`、`.DS_Store` 等）
- 初始化 git 仓库并建立规范提交习惯
