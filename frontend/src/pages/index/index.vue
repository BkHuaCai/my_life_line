<template>
  <view class="page">
    <!-- 顶部用户信息 -->
    <view class="header" @click="openCurrentPerson">
      <image v-if="currentPerson.avatar_path" class="avatar" :src="currentPerson.avatar_path" mode="aspectFill" />
      <view v-else class="avatar placeholder">{{ currentPerson.name ? currentPerson.name[0] : '?' }}</view>
      <view class="info">
        <view class="name">{{ currentPerson.name || '添加用户' }}</view>
        <view class="sub" v-if="currentPerson.birth_date">出生：{{ currentPerson.birth_date }}</view>
        <view class="sub" v-else>点击添加用户</view>
      </view>
      <view class="add-btn" @click.stop="addPerson">＋</view>
    </view>

    <!-- 时间线入口 -->
    <view class="section" v-if="currentPerson.id">
      <view class="section-title">我的时间线</view>
      <view class="timeline-list">
        <view v-for="tl in timelines" :key="tl.id" class="timeline-card" @click="openTimeline(tl.id)">
          <view class="tl-name">{{ tl.name }}</view>
          <view class="tl-meta">
            <text class="tl-cat" v-if="tl.category">{{ tl.category }}</text>
            <text class="tl-count">{{ eventCounts[tl.id] || 0 }} 个事件</text>
          </view>
        </view>
        <view v-if="!timelines.length" class="empty-tip" @click="addTimeline">
          还没有时间线，点此添加
        </view>
      </view>
      <view class="fab" @click="addTimeline">＋ 时间线</view>
    </view>

    <!-- 无用户时的提示 -->
    <view class="no-user" v-else>
      <view class="tip">还没有添加用户</view>
      <view class="tip-sub">点击右上角 + 添加您的第一个用户</view>
      <view class="fab" @click="addPerson">＋ 添加用户</view>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'

export default {
  data() {
    return { currentPerson: {}, timelines: [], eventCounts: {} }
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      // 获取默认用户
      this.currentPerson = (await db.getDefaultPerson()) || {}

      if (this.currentPerson.id) {
        // 获取该用户的时间线
        this.timelines = await db.getTimelinesByPerson(this.currentPerson.id)

        // 获取每个时间线的事件数
        const counts = {}
        for (const tl of this.timelines) {
          const events = await db.getEventsByTimeline(tl.id)
          counts[tl.id] = events.length
        }
        this.eventCounts = counts

        // 设置导航栏标题
        uni.setNavigationBarTitle({ title: this.currentPerson.name || '人生时间线' })
      } else {
        this.timelines = []
        uni.setNavigationBarTitle({ title: '人生时间线' })
      }
    },
    openCurrentPerson() {
      if (this.currentPerson.id) {
        uni.navigateTo({ url: `/pages/person-detail/index?personId=${this.currentPerson.id}` })
      }
    },
    addPerson() {
      uni.navigateTo({ url: '/pages/edit-form/index?entityType=person' })
    },
    addTimeline() {
      if (!this.currentPerson.id) {
        uni.showToast({ title: '请先添加用户', icon: 'none' })
        return
      }
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
.add-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: #ffb400; color: #fff; font-size: 36rpx; display: flex; align-items: center; justify-content: center; }

.section { margin-top: 32rpx; }
.section-title { font-size: 32rpx; font-weight: 600; margin-bottom: 20rpx; }
.timeline-list { display: flex; flex-direction: column; gap: 16rpx; }
.timeline-card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.tl-name { font-size: 30rpx; font-weight: 600; }
.tl-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.tl-cat { background: #fff4d6; color: #b8860b; font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 12rpx; }
.tl-count { font-size: 24rpx; color: #999; }
.empty-tip { text-align: center; color: #bbb; padding: 32rpx; }

.no-user { text-align: center; padding: 120rpx 0; }
.tip { font-size: 32rpx; color: #666; }
.tip-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; }

.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: #ffb400; color: #fff; padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>