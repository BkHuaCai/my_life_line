<template>
  <view class="page">
    <!-- 顶部：左侧标题，右侧用户切换下拉框 -->
    <view class="page-header">
      <view class="page-title">人生时间线</view>
      <picker class="user-dropdown" mode="selector" :range="userOptions" :value="userIndex" @change="onSwitchUser">
        <view class="dropdown-label">
          <text class="dropdown-name">{{ currentPerson.name || '选择用户' }}</text>
          <text class="dropdown-arrow">▾</text>
        </view>
      </picker>
    </view>

    <!-- 顶部搜索：按关键字搜索时间线内容 -->
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索时间线内容（标题/描述）" @confirm="doSearch" @input="doSearch" />
    </view>

    <!-- 搜索结果 -->
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

    <!-- 主线 + 其他时间线 -->
    <template v-else>
      <view class="section" v-if="mainTimeline.id">
        <view class="section-title">主线</view>
        <view class="main-card" @click="openMain">
          <view class="main-info">
            <view class="main-name">{{ mainTimeline.name }} <text class="main-badge">主线</text></view>
            <view class="main-meta">
              {{ eventCounts[mainTimeline.id] || 0 }} 个事件
              <text v-if="needInitPoint" class="main-warn"> · 待填写初始点</text>
            </view>
          </view>
          <view class="arrow">›</view>
        </view>
      </view>

      <view class="section" v-if="currentPerson.id">
        <view class="section-title">其他时间线</view>
        <view class="timeline-list">
          <view v-for="tl in otherTimelines" :key="tl.id" class="timeline-card" @click="openTimeline(tl.id)">
            <view class="tl-name">{{ tl.name }}</view>
            <view class="tl-meta">
              <text class="tl-cat" v-if="tl.category">{{ tl.category }}</text>
              <text class="tl-count">{{ eventCounts[tl.id] || 0 }} 个事件</text>
            </view>
          </view>
          <view v-if="!otherTimelines.length" class="empty-tip" @click="addTimeline">还没有其他时间线，点此添加</view>
        </view>
      </view>
    </template>

    <view class="fab" v-if="currentPerson.id" @click="addTimeline">＋ 时间线</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'

export default {
  data() {
    return {
      currentPerson: {},
      persons: [],
      userOptions: [],
      userIndex: 0,
      mainTimeline: {},
      otherTimelines: [],
      eventCounts: {},
      needInitPoint: false,
      keyword: '',
      searching: false,
      results: [],
      nameMap: {},
      tlMap: {}
    }
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      const persons = await db.getPersons()
      this.persons = persons
      // 下拉框选项：全部用户 + 末尾追加「＋ 添加用户」
      this.userOptions = [...persons.map((p) => p.name), '＋ 添加用户']
      this.currentPerson = (await db.getDefaultPerson()) || persons[0] || {}
      this.userIndex = persons.findIndex((p) => p.id === this.currentPerson.id)
      if (this.userIndex < 0) this.userIndex = 0
      // 构建搜索结果所需的名称映射
      const nameMap = {}
      const tlMap = {}
      for (const p of persons) {
        nameMap[p.id] = p.name
        const tls = await db.getTimelinesByPerson(p.id)
        for (const tl of tls) tlMap[tl.id] = tl.name
      }
      this.nameMap = nameMap
      this.tlMap = tlMap
      if (!this.currentPerson.id) {
        this.mainTimeline = {}
        this.otherTimelines = []
        this.eventCounts = {}
        return
      }
      this.mainTimeline = (await db.getMainTimeline(this.currentPerson.id)) || {}
      const tls = await db.getTimelinesByPerson(this.currentPerson.id)
      this.otherTimelines = tls.filter((t) => t.is_main !== 1)
      const counts = {}
      for (const tl of tls) counts[tl.id] = (await db.getEventsByTimeline(tl.id)).length
      this.eventCounts = counts
      this.needInitPoint = !!this.mainTimeline.id && (counts[this.mainTimeline.id] || 0) === 0
    },
    onSwitchUser(e) {
      const idx = Number(e.detail.value)
      if (idx < this.persons.length) {
        const target = this.persons[idx]
        if (target.id !== this.currentPerson.id) {
          db.setDefaultPerson(target.id).then(() => this.load())
        }
      } else {
        // 最后一个选项：添加用户
        uni.navigateTo({ url: '/pages/edit-form/index?entityType=person' })
      }
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
    personName(id) {
      return this.nameMap[id] || ''
    },
    timelineName(id) {
      return this.tlMap[id] || ''
    },
    openEvent(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    },
    openMain() {
      if (this.mainTimeline.id) {
        uni.navigateTo({ url: `/pages/timeline/index?timelineId=${this.mainTimeline.id}` })
      }
    },
    addTimeline() {
      if (!this.currentPerson.id) return
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=timeline&personId=${this.currentPerson.id}` })
    },
    openTimeline(id) {
      uni.navigateTo({ url: `/pages/timeline/index?timelineId=${id}` })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; }

/* 顶部：左侧标题，右侧用户切换下拉框 */
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 0 24rpx; }
.page-title { font-size: 40rpx; font-weight: 700; }
.dropdown-label { display: flex; align-items: center; background: #fff4d6; color: #b8860b; border-radius: 32rpx; padding: 10rpx 24rpx; font-size: 26rpx; }
.dropdown-arrow { margin-left: 8rpx; font-size: 22rpx; }

/* 搜索 */
.search-bar { margin-top: 8rpx; }
.search-input { background: #fff; border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 28rpx; height: 76rpx; min-height: 76rpx; }

/* 搜索结果 */
.result-list { margin-top: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.result-item { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.r-title { font-size: 30rpx; font-weight: 600; }
.r-sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.r-desc { font-size: 26rpx; color: #666; margin-top: 8rpx; }
.empty { text-align: center; color: #bbb; padding: 60rpx 0; }

.section { margin-top: 32rpx; }
.section-title { font-size: 32rpx; font-weight: 600; margin-bottom: 20rpx; }
.main-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 28rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); border: 2rpx solid #ffe3a3; }
.main-info { flex: 1; }
.main-name { font-size: 32rpx; font-weight: 700; }
.main-badge { display: inline-block; background: #ffb400; color: #fff; font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 12rpx; margin-left: 12rpx; vertical-align: middle; }
.main-meta { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.main-warn { color: #ff5a5a; }
.arrow { font-size: 40rpx; color: #ccc; }

.timeline-list { display: flex; flex-direction: column; gap: 16rpx; }
.timeline-card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.tl-name { font-size: 30rpx; font-weight: 600; }
.tl-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.tl-cat { background: #fff4d6; color: #b8860b; font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 12rpx; }
.tl-count { font-size: 24rpx; color: #999; }
.empty-tip { text-align: center; color: #bbb; padding: 32rpx; }

.fab { position: fixed; right: 40rpx; bottom: 180rpx; background: #ffb400; color: #fff; padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>
