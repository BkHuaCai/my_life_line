# 时光档案后端（Python）

后期社区功能的后端：账号、时间线分享、社区浏览、数据同步。

**当前状态：** 占位目录。前期（纯本地 App）不使用后端，本期不实现任何 Python 代码。

**技术方向（后期）：** Python（FastAPI）+ 数据库（SQLite 起步，必要时迁移 Postgres）。

**与前端的关系：** 前端 `frontend/` 的数据层（`src/utils/db.js`）预留了适配器接口，后期加同步层时在此接入。

## 社区功能设计（后期，本期不实现）

详见 `docs/superpowers/specs/2026-08-12-life-timeline-design.md` 第 6.1 节。核心区分两种"对外"时间线：

- **分享时间线**：把本地时间线发布一份只读快照到后端，本人更新就重发新版本，其他人只读
- **共享时间线**：后端新建或由本地时间线复制一份转为共享，他人可往里提交事件，创建者审核是否展示

### 数据模型（新增表）

```
account          用户账号（id UUID, username 唯一, password_hash, created_at）
shared_timeline  共享时间线（creator_account_id 唯一审核权, source_timeline_id 仅记录）
shared_event     共享时间线上的事件（author_account_id 提交者, status pending/approved/rejected, reviewed_by, reviewed_at）
share_snapshot   分享时间线只读快照（version 递增, payload = serialize() 产物）
```

### 接口草案（FastAPI）

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
GET    /shared-timeline/{id}      查看共享时间线（仅 approved 事件对外）
POST   /shared-timeline/{id}/event           他人提交事件（status=pending）
GET    /shared-timeline/{id}/event/pending   创建者查看待审事件
POST   /shared-timeline/{id}/event/{eid}/review  创建者审核（approve/reject/delete）
POST   /shared-timeline/{id}/fav  收藏到本地（一次性快照拷贝）
```

### 审核规则

- 审核前事件**只对创建者 + 提交者本人**可见；审核后对所有人可见
- 创建者三选一：通过（approved）/ 拒绝（rejected，附理由）/ 删除（彻底删，提交者收到通知）
- 共享时间线**不在本地 SQLite 落库**，纯后端；"收藏到本地"为一次性快照拷贝，不再同步

