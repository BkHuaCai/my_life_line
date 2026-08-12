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

    <!-- 主线初始点：主线还没有任何事件时，必须先填写初始点 -->
    <view class="mask" v-if="needInitialPoint">
      <view class="init-card">
        <view class="init-title">填写初始点</view>
        <view class="init-desc">「{{ timeline.name }}」还没有任何事件，请先填写这条时间线的起点（如出生日期），保存后才能继续使用。</view>
        <view class="field">
          <text class="label">标题</text>
          <input class="input" v-model="initForm.title" placeholder="如：出生" />
        </view>
        <view class="field">
          <text class="label">日期 *</text>
          <picker mode="date" :value="initForm.date" @change="(e) => (initForm.date = e.detail.value)">
            <view class="picker">{{ initForm.date || '选择日期' }}</view>
          </picker>
        </view>
        <button class="save-btn" @click="saveInitialPoint">保存初始点</button>
      </view>
    </view>
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
    return {
      timelineId: '',
      timeline: {},
      events: [],
      viewMode: 'axis',
      needInitialPoint: false,
      initForm: { title: '', date: '' }
    }
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
      // 主线没有任何事件时，必须填写初始点
      this.needInitialPoint = this.timeline.is_main === 1 && this.events.length === 0
    },
    switchView(m) {
      this.viewMode = m
      uni.setStorageSync('timeline_view_mode', m)
    },
    addEvent() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=event&timelineId=${this.timelineId}` })
    },
    async saveInitialPoint() {
      if (!this.initForm.date) {
        uni.showToast({ title: '请选择日期', icon: 'none' })
        return
      }
      const title = (this.initForm.title || '').trim() || '起点'
      await db.saveEvent({
        timeline_id: this.timelineId,
        title,
        description: null,
        date_type: 'point',
        date_point: this.initForm.date
      })
      this.initForm = { title: '', date: '' }
      await this.load()
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

/* 初始点覆盖层 */
.mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.init-card { width: 100%; background: #fff; border-radius: 20rpx; padding: 40rpx; }
.init-title { font-size: 36rpx; font-weight: 700; margin-bottom: 12rpx; }
.init-desc { font-size: 26rpx; color: #888; margin-bottom: 32rpx; line-height: 1.6; }
.field { margin-bottom: 28rpx; }
.label { font-size: 26rpx; color: #888; display: block; margin-bottom: 12rpx; }
.input { background: #f5f5f5; border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; height: 84rpx; min-height: 84rpx; }
.picker { background: #f5f5f5; border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; color: #333; }
.save-btn { margin-top: 16rpx; background: #ffb400; color: #fff; font-size: 32rpx; border-radius: 48rpx; }
</style>
