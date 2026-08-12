<template>
  <view class="page">
    <!-- 当前用户：右上角切换其他用户 -->
    <view class="header" @click="openCurrentPerson">
      <image v-if="currentPerson.avatar_path" class="avatar" :src="currentPerson.avatar_path" mode="aspectFill" />
      <view v-else class="avatar placeholder">{{ currentPerson.name ? currentPerson.name[0] : '?' }}</view>
      <view class="info">
        <view class="name">{{ currentPerson.name }}</view>
        <view class="sub" v-if="currentPerson.birth_date">出生：{{ currentPerson.birth_date }}</view>
        <view class="sub" v-else>点击查看详情</view>
      </view>
      <view class="switch-btn" @click.stop="switchUser">切换</view>
    </view>

    <!-- 主线 -->
    <view class="section" v-if="currentPerson.id && mainTimeline.id">
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

    <!-- 其他时间线 -->
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

    <view class="fab" v-if="currentPerson.id" @click="addTimeline">＋ 时间线</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'

export default {
  data() {
    return { currentPerson: {}, mainTimeline: {}, otherTimelines: [], eventCounts: {}, needInitPoint: false }
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.currentPerson = (await db.getDefaultPerson()) || {}
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
      uni.setNavigationBarTitle({ title: this.currentPerson.name || '人生时间线' })
    },
    openCurrentPerson() {
      if (this.currentPerson.id) {
        uni.navigateTo({ url: `/pages/person-detail/index?personId=${this.currentPerson.id}` })
      }
    },
    async switchUser() {
      const persons = await db.getPersons()
      const others = persons.filter((p) => p.id !== this.currentPerson.id)
      if (!others.length) {
        uni.showToast({ title: '暂无其他用户，可在「我的」页添加', icon: 'none' })
        return
      }
      uni.showActionSheet({
        itemList: others.map((p) => p.name),
        success: async (res) => {
          await db.setDefaultPerson(others[res.tapIndex].id)
          await this.load()
        }
      })
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
.header { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 32rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.avatar.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.info { flex: 1; margin-left: 24rpx; }
.name { font-size: 36rpx; font-weight: 700; }
.sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.switch-btn { padding: 12rpx 28rpx; border-radius: 32rpx; background: #fff4d6; color: #b8860b; font-size: 26rpx; }

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

.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: #ffb400; color: #fff; padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>
