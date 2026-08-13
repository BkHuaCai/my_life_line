<template>
  <view class="grid">
    <view v-for="group in groups" :key="group.label" class="group">
      <view class="gh">{{ group.label }}</view>
      <view class="cells">
        <image
          v-for="ev in group.events"
          :key="ev.id"
          class="cell"
          :src="cover(ev)"
          mode="aspectFill"
          @click="open(ev.id)"
        />
      </view>
    </view>
    <view v-if="!events.length" class="empty">还没有事件，点右下角 + 添加</view>
  </view>
</template>

<script>
import { formatDate } from '../utils/date'

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
      return ev.cover_image_path || (ev.images && ev.images[0] && ev.images[0].thumb_path) || '/static/placeholder.png'
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
.empty { text-align: center; color: var(--text-light); padding: 120rpx 0; }
</style>
