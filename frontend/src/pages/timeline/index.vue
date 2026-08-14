<template>
  <view class="page">
    <view class="toolbar">
      <view class="seg">
        <view :class="['seg-item', viewMode === 'axis' ? 'active' : '']" @click="switchView('axis')">时间轴</view>
        <view :class="['seg-item', viewMode === 'grid' ? 'active' : '']" @click="switchView('grid')">照片墙</view>
        <view :class="['seg-item', viewMode === 'cards' ? 'active' : '']" @click="switchView('cards')">卡片</view>
      </view>
    </view>

    <!-- 未填写初始点：时间线暂无法展示 -->
    <view class="no-init-tip" v-if="showNoInitHint">
      <view class="no-init-icon">⚠️</view>
      <view class="no-init-text">尚未填写初始点，时间线内容暂无法展示</view>
      <button class="no-init-btn" @click="reopenInitPoint">填写初始点</button>
    </view>
    <!-- 非主线时间线无事件：引导用户添加第一个事件 -->
    <view class="empty-tl" v-else-if="!events.length">
      <view class="empty-tl-icon">📝</view>
      <view class="empty-tl-title">这里还什么都没有</view>
      <view class="empty-tl-desc">点右下角「＋ 事件」记录这条时间线的第一个时刻</view>
    </view>
    <template v-else>
      <timeline-axis v-if="viewMode === 'axis'" :events="events" />
      <timeline-grid v-else-if="viewMode === 'grid'" :events="events" />
      <timeline-cards v-else :events="events" />
    </template>

    <view class="fab" v-if="!showNoInitHint" @click="addEvent">＋ 事件</view>

    <!-- 主线初始点：主线还没有任何事件时，必须先填写初始点 -->
    <view class="mask" v-if="needInitialPoint">
      <view class="init-card">
        <view class="init-head">
          <view class="init-title">填写初始点</view>
          <view class="init-close" @click="closeInitPoint">×</view>
        </view>
        <view class="init-desc">「{{ timeline.name }}」还没有任何事件，请先填写这条时间线的起点（如出生或开始日期），保存后才能继续使用。</view>
        <view class="field">
          <text class="label">标题</text>
          <input class="input" v-model="initForm.title" placeholder="如：出生、购入" />
        </view>
        <view class="field">
          <text class="label">日期 *</text>
          <picker mode="date" :value="initForm.date" @change="(e) => (initForm.date = e.detail.value)">
            <view class="picker">{{ initForm.date || '选择日期' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">时间精度（可选）</text>
          <view class="pseg">
            <view :class="['pseg-item', initForm.time_precision === 'none' ? 'active' : '']" @click="initForm.time_precision = 'none'">仅日期</view>
            <view :class="['pseg-item', initForm.time_precision === 'hour' ? 'active' : '']" @click="initForm.time_precision = 'hour'">到时</view>
            <view :class="['pseg-item', initForm.time_precision === 'minute' ? 'active' : '']" @click="initForm.time_precision = 'minute'">到分</view>
            <view :class="['pseg-item', initForm.time_precision === 'second' ? 'active' : '']" @click="initForm.time_precision = 'second'">到秒</view>
          </view>
        </view>
        <view class="field" v-if="initForm.time_precision !== 'none'">
          <text class="label">时间</text>
          <view class="time-row">
            <picker class="time-picker" mode="selector" :range="hourRange" :value="initForm.hour" @change="(e) => (initForm.hour = Number(e.detail.value))">
              <view class="picker">{{ pad(initForm.hour) }} 时</view>
            </picker>
            <picker v-if="initForm.time_precision === 'minute' || initForm.time_precision === 'second'" class="time-picker" mode="selector" :range="minuteRange" :value="initForm.minute" @change="(e) => (initForm.minute = Number(e.detail.value))">
              <view class="picker">{{ pad(initForm.minute) }} 分</view>
            </picker>
            <picker v-if="initForm.time_precision === 'second'" class="time-picker" mode="selector" :range="secondRange" :value="initForm.second" @change="(e) => (initForm.second = Number(e.detail.value))">
              <view class="picker">{{ pad(initForm.second) }} 秒</view>
            </picker>
          </view>
        </view>
        <button class="save-btn" @click="saveInitialPoint">保存初始点</button>
      </view>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { buildEventDate } from '../../utils/date'
import { applyTheme, getThemePrimary } from '../../utils/theme'
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
      initForm: { title: '', date: '', time_precision: 'none', hour: 0, minute: 0, second: 0 },
      hourRange: Array.from({ length: 24 }, (_, i) => i),
      minuteRange: Array.from({ length: 60 }, (_, i) => i),
      secondRange: Array.from({ length: 60 }, (_, i) => i)
    }
  },
  computed: {
    // 主线未填初始点且用户已叉掉弹窗时，提示时间线暂无法展示
    showNoInitHint() {
      return this.timeline.is_main === 1 && !this.events.length && !this.needInitialPoint
    }
  },
  async onLoad(options) {
    this.timelineId = options.timelineId
    this.viewMode = uni.getStorageSync('timeline_view_mode') || 'axis'
  },
  async onShow() {
    applyTheme(getThemePrimary())
    if (db.ready) await db.ready.catch(() => {})
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
    pad(n) {
      return String(n == null ? 0 : n).padStart(2, '0')
    },
    closeInitPoint() {
      this.needInitialPoint = false
    },
    reopenInitPoint() {
      this.needInitialPoint = true
    },
    addEvent() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=event&timelineId=${this.timelineId}` })
    },
    async saveInitialPoint() {
      if (!this.initForm.date) {
        uni.showToast({ title: '请选择日期', icon: 'none' })
        return
      }
      try {
        const title = (this.initForm.title || '').trim() || '起点'
        await db.saveEvent({
          timeline_id: this.timelineId,
          title,
          description: null,
          date_type: 'point',
          date_point: buildEventDate(this.initForm.date, this.initForm.time_precision, this.initForm.hour, this.initForm.minute, this.initForm.second)
        })
        this.initForm = { title: '', date: '', time_precision: 'none', hour: 0, minute: 0, second: 0 }
        // 保存成功后直接关闭弹窗，避免依赖重新查询结果
        this.needInitialPoint = false
        await this.load()
      } catch (err) {
        console.error('保存初始点失败', err)
        uni.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page { padding-bottom: 140rpx; }
.toolbar { position: sticky; top: 0; background: var(--bg-page); padding: 16rpx 24rpx; z-index: 10; }
.seg { display: flex; background: var(--bg-muted); border-radius: 12rpx; overflow: hidden; }
.seg-item { flex: 1; text-align: center; padding: 16rpx; font-size: 28rpx; color: var(--text-sub); }
.seg-item.active { background: var(--bg-card); color: var(--primary); font-weight: 600; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: var(--primary); color: var(--primary-contrast); padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }

/* 初始点覆盖层 */
.mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.init-card { width: 100%; background: var(--bg-card); border-radius: 20rpx; padding: 40rpx; }
.init-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.init-title { font-size: 36rpx; font-weight: 700; }
.init-close { font-size: 44rpx; color: var(--text-light); line-height: 1; padding: 4rpx 8rpx; }
.init-desc { font-size: 26rpx; color: var(--text-sub); margin-bottom: 32rpx; line-height: 1.6; }
.field { margin-bottom: 28rpx; }
.label { font-size: 26rpx; color: var(--text-sub); display: block; margin-bottom: 12rpx; }
.input { background: var(--bg-muted); border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; height: 84rpx; min-height: 84rpx; }
.picker { background: var(--bg-muted); border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; color: var(--text-main); }
.save-btn { margin-top: 16rpx; background: var(--primary); color: var(--primary-contrast); font-size: 32rpx; border-radius: 48rpx; }
.pseg { display: flex; gap: 16rpx; }
.pseg-item { flex: 1; text-align: center; padding: 16rpx; border-radius: 12rpx; background: var(--bg-muted); color: var(--text-sub); font-size: 26rpx; }
.pseg-item.active { background: var(--primary); color: var(--primary-contrast); }
.time-row { display: flex; gap: 16rpx; }
.time-picker { flex: 1; }
.time-picker .picker { text-align: center; }

/* 未填写初始点提示 */
.no-init-tip { margin-top: 120rpx; display: flex; flex-direction: column; align-items: center; padding: 0 60rpx; }
.no-init-icon { font-size: 80rpx; }
.no-init-text { font-size: 28rpx; color: var(--text-grey); margin-top: 24rpx; text-align: center; }
.no-init-btn { margin-top: 40rpx; background: var(--primary); color: var(--primary-contrast); font-size: 30rpx; border-radius: 48rpx; border: none; padding: 0 48rpx; height: 80rpx; line-height: 80rpx; }
.no-init-btn::after { border: none; }

/* 非主线时间线无事件引导卡 */
.empty-tl { margin-top: 160rpx; display: flex; flex-direction: column; align-items: center; padding: 0 60rpx; }
.empty-tl-icon { font-size: 88rpx; }
.empty-tl-title { font-size: 32rpx; font-weight: 700; color: var(--text-main); margin-top: 24rpx; }
.empty-tl-desc { font-size: 24rpx; color: var(--text-grey); margin-top: 12rpx; text-align: center; line-height: 1.6; }
</style>
