<template>
  <view class="page">
    <view class="header-bar">
      <view class="title">人生时间线</view>
      <view class="settings-btn" @click="showMoreMenu">⋮</view>
    </view>

    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索事件标题/描述" @confirm="doSearch" @input="doSearch" />
    </view>

    <template v-if="searching">
      <view class="result-list">
        <view v-for="r in results" :key="r.id" class="result-item" @click="openEvent(r.id)">
          <view class="r-title">{{ r.title }}</view>
          <view class="r-sub">{{ personName(r.person_id) }} · {{ timelineName(r.timeline_id) }}</view>
          <view class="r-desc" v-if="r.description">{{ r.description }}</view>
        </view>
        <view v-if="!results.length" class="empty">没有匹配的事件</view>
      </view>
    </template>

    <template v-else>
      <view class="list">
        <view v-for="p in persons" :key="p.id" class="card" @click="openPerson(p.id)">
          <image v-if="p.avatar_path" class="avatar" :src="p.avatar_path" mode="aspectFill" />
          <view v-else class="avatar placeholder">{{ p.name ? p.name[0] : '?' }}</view>
          <view class="info">
            <view class="name">{{ p.name }}</view>
            <view class="sub">{{ timelineCount(p.id) }} 条时间线</view>
          </view>
          <view class="actions">
            <view class="edit-btn" @click.stop="editPerson(p)">编辑</view>
            <view class="delete-btn" @click.stop="deletePerson(p)">删除</view>
          </view>
        </view>
      </view>
      <view v-if="!persons.length" class="empty">还没有人物，点右下角 + 添加</view>
    </template>

    <view class="fab" @click="addPerson">＋</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { serialize, importData } from '../../utils/export'

export default {
  data() {
    return { persons: [], counts: {}, keyword: '', searching: false, results: [], nameMap: {}, tlMap: {}, showMenu: false, exporting: false }
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.persons = await db.getPersons()
      const counts = {}
      const nameMap = {}
      const tlMap = {}
      for (const p of this.persons) {
        nameMap[p.id] = p.name
        const tls = await db.getTimelinesByPerson(p.id)
        counts[p.id] = tls.length
        for (const tl of tls) tlMap[tl.id] = tl.name
      }
      this.counts = counts
      this.nameMap = nameMap
      this.tlMap = tlMap
    },
    timelineCount(id) {
      return this.counts[id] || 0
    },
    personName(id) {
      return this.nameMap[id] || ''
    },
    timelineName(id) {
      return this.tlMap[id] || ''
    },
    async doSearch() {
      const k = (this.keyword || '').trim()
      if (!k) {
        this.searching = false
        return
      }
      this.searching = true
      this.results = await db.searchEvents(k)
    },
    openPerson(id) {
      uni.navigateTo({ url: `/pages/person-detail/index?personId=${id}` })
    },
    openEvent(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    },
    addPerson() {
      uni.navigateTo({ url: '/pages/edit-form/index?entityType=person' })
    },
    editPerson(p) {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=person&id=${p.id}` })
    },
    deletePerson(p) {
      uni.showModal({
        title: '删除人物',
        content: `确定删除「${p.name}」吗？此操作将同时删除该人物的所有时间线和事件，无法恢复！`,
        success: async (res) => {
          if (res.confirm) {
            await db.deletePerson(p.id)
            await this.load()
          }
        }
      })
    },
    showMoreMenu() {
      uni.showActionSheet({
        itemList: ['导出数据', '导入数据'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.doExport()
          } else if (res.tapIndex === 1) {
            this.doImport()
          }
        }
      })
    },
    async doExport() {
      this.exporting = true
      try {
        const data = await serialize(db)
        const jsonStr = JSON.stringify(data, null, 2)
        const filePath = `_doc/export_${Date.now()}.json`
        // 保存到文件
        const fs = uni.getFileSystemManager()
        await fs.writeFile({
          filePath,
          data: jsonStr,
          encoding: 'utf8'
        })
        uni.showModal({
          title: '导出成功',
          content: `数据已导出到：${filePath}\n\n请在文件管理中找到该文件并备份。`,
          showCancel: false
        })
      } catch (e) {
        console.error('export fail', e)
        uni.showToast({ title: '导出失败', icon: 'none' })
      }
      this.exporting = false
    },
    doImport() {
      uni.showModal({
        title: '导入数据',
        content: '请先在文件管理中找到之前导出的 JSON 文件，选择后导入。\n\n注意：导入会合并到现有数据中。',
        success: (res) => {
          if (res.confirm) {
            // 这里需要用户选择文件，uni-app H5 支持 chooseFile，但 App 端需要 plus.io
            // 简化实现：提示用户复制 JSON 内容到剪贴板，或者后续完善
            uni.showToast({ title: '导入功能开发中', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 140rpx; }
.header-bar { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.title { font-size: 40rpx; font-weight: 700; }
.settings-btn { font-size: 40rpx; color: #666; padding: 8rpx 16rpx; }
.search-bar { padding: 8rpx 0 16rpx; }
.search-input { background: #fff; border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 28rpx; height: 76rpx; min-height: 76rpx; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; }
.avatar.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.info { flex: 1; margin-left: 20rpx; }
.name { font-size: 32rpx; font-weight: 600; }
.sub { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.actions { display: flex; gap: 8rpx; }
.edit-btn { color: #4a6cf7; font-size: 26rpx; padding: 8rpx 16rpx; }
.delete-btn { color: #ff5a5a; font-size: 26rpx; padding: 8rpx 16rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; font-size: 28rpx; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; width: 96rpx; height: 96rpx; border-radius: 50%; background: #ffb400; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
.result-list { display: flex; flex-direction: column; gap: 16rpx; }
.result-item { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.r-title { font-size: 30rpx; font-weight: 600; }
.r-sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.r-desc { font-size: 26rpx; color: #666; margin-top: 8rpx; }
</style>
