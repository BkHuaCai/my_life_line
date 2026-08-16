<template>
  <view class="grid">
    <view v-for="group in groups" :key="group.label" class="group">
      <view class="gh">{{ group.label }}</view>
      <view class="cells">
        <template v-for="ev in group.events" :key="ev.id">
          <image v-if="cover(ev)" class="cell" :src="cover(ev)" mode="aspectFill" @click="open(ev.id)" />
          <!-- 无图事件不展示图片，改为文字格 -->
          <view v-else class="cell text-cell" @click="open(ev.id)">
            <text class="tc-title">{{ ev.title }}</text>
            <text class="tc-date">{{ dateText(ev) }}</text>
          </view>
        </template>
      </view>
    </view>
    <view v-if="!events.length" class="empty">还没有事件，点右下角 + 添加</view>
  </view>
</template>

<script>
import { formatDate, formatEventDate } from '../utils/date'

export default {
  props: {
    events: { type: Array, default: () => [] }
  },
  computed: {
    groups() {
      const map = {}
      for (const ev of this.events) {
        const key = ev.date_point ? formatDate(ev.date_point) : ev.date_start ? formatDate(ev.date_start) : '其他'
        if (!map[key]) map[key] = []
        map[key].push(ev)
      }
      return Object.keys(map).map((label) => ({ label, events: map[label] }))
    }
  },
  methods: {
    cover(ev) {
      return ev.cover_image_path || (ev.images && ev.images[0] && ev.images[0].thumb_path) || ''
    },
    dateText(ev) {
      return formatEventDate(ev)
    },
    open(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    }
  }
}
</script>

<style scoped>
.grid { padding: 16rpx; }
.group { margin-bottom: 32rpx; }
.gh { font-size: 28rpx; font-weight: 700; margin-bottom: 12rpx; border-left: 6rpx solid var(--primary); padding-left: 12rpx; }
.cells { display: flex; flex-wrap: wrap; gap: 8rpx; }
.cell { width: 30.5%; aspect-ratio: 1; border-radius: 8rpx; }
.text-cell { background: var(--bg-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; padding: 8rpx; box-sizing: border-box; }
.tc-title { font-size: 22rpx; color: var(--text-main); font-weight: 600; text-align: center; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tc-date { font-size: 18rpx; color: var(--text-grey); }
.empty { text-align: center; color: var(--text-light); padding: 120rpx 0; }
</style>
