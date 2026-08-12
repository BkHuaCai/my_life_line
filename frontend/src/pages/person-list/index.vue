<template>
  <view class="page">
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
          <view class="edit-btn" @click.stop="editPerson(p)">编辑</view>
        </view>
      </view>
      <view v-if="!persons.length" class="empty">还没有人物，点右下角 + 添加</view>
    </template>

    <view class="fab" @click="addPerson">＋</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'

export default {
  data() {
    return { persons: [], counts: {}, keyword: '', searching: false, results: [], nameMap: {}, tlMap: {} }
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
    }
  }
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 140rpx; }
.search-bar { padding: 8rpx 0 16rpx; }
.search-input { background: #fff; border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 28rpx; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; }
.avatar.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.info { flex: 1; margin-left: 20rpx; }
.name { font-size: 32rpx; font-weight: 600; }
.sub { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.edit-btn { color: #4a6cf7; font-size: 26rpx; padding: 8rpx 16rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; font-size: 28rpx; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; width: 96rpx; height: 96rpx; border-radius: 50%; background: #ffb400; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
.result-list { display: flex; flex-direction: column; gap: 16rpx; }
.result-item { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.r-title { font-size: 30rpx; font-weight: 600; }
.r-sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.r-desc { font-size: 26rpx; color: #666; margin-top: 8rpx; }
</style>
