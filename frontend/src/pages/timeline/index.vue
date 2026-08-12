<template>
  <view class="page">
    <view class="toolbar">
      <view class="seg">
        <view :class="['seg-item', viewMode === 'axis' ? 'active' : '']" @click="switchView('axis')">时间轴</view>
        <view :class="['seg-item', viewMode === 'grid' ? 'active' : '']" @click="switchView('grid')">照片墙</view>
        <view :class="['seg-item', viewMode === 'cards' ? 'active' : '']" @click="switchView('cards')">卡片</view>
      </view>
    </view>

    <timeline-axis v-if="viewMode === 'axis'" :events="events" />
    <timeline-grid v-else-if="viewMode === 'grid'" :events="events" />
    <timeline-cards v-else :events="events" />

    <view class="fab" @click="addEvent">＋ 事件</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import timelineAxis from '../../components/timeline-axis.vue'
import timelineGrid from '../../components/timeline-grid.vue'
import timelineCards from '../../components/timeline-cards.vue'

export default {
  components: { timelineAxis, timelineGrid, timelineCards },
  data() {
    return { timelineId: '', timeline: {}, events: [], viewMode: 'axis' }
  },
  async onLoad(options) {
    this.timelineId = options.timelineId
    this.viewMode = uni.getStorageSync('timeline_view_mode') || 'axis'
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.timeline = (await db.getTimeline(this.timelineId)) || {}
      if (this.timeline.name) uni.setNavigationBarTitle({ title: this.timeline.name })
      this.events = []
      const evs = await db.getEventsByTimeline(this.timelineId)
      for (const ev of evs) this.events.push({ ...ev, images: await db.getImagesByEvent(ev.id) })
    },
    switchView(m) {
      this.viewMode = m
      uni.setStorageSync('timeline_view_mode', m)
    },
    addEvent() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=event&timelineId=${this.timelineId}` })
    }
  }
}
</script>

<style scoped>
.page { padding-bottom: 140rpx; }
.toolbar { position: sticky; top: 0; background: #f8f8f8; padding: 16rpx 24rpx; z-index: 10; }
.seg { display: flex; background: #eee; border-radius: 12rpx; overflow: hidden; }
.seg-item { flex: 1; text-align: center; padding: 16rpx; font-size: 28rpx; color: #666; }
.seg-item.active { background: #fff; color: #ffb400; font-weight: 600; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: #ffb400; color: #fff; padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>
