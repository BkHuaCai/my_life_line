<template>
  <view class="axis">
    <view v-for="(ev, i) in events" :key="ev.id" class="node" :class="i % 2 === 0 ? 'left' : 'right'" @click="open(ev.id)">
      <view class="dot"></view>
      <view class="card">
        <image v-if="cover(ev)" class="thumb" :src="cover(ev)" mode="aspectFill" />
        <view class="t">{{ ev.title }}</view>
        <view class="d">{{ dateText(ev) }}</view>
      </view>
    </view>
    <view v-if="!events.length" class="empty">还没有事件，点右下角 + 添加</view>
  </view>
</template>

<script>
import { formatEventDate } from '../utils/date'

export default {
  props: {
    events: { type: Array, default: () => [] }
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
.axis { position: relative; padding: 20rpx 0 40rpx; }
.axis::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 4rpx; background: linear-gradient(var(--primary), var(--primary-dark)); transform: translateX(-50%); }
/* 节点：左/右交错卡 + 中线主色圆点锚 */
.node { position: relative; width: 44%; margin-bottom: 40rpx; }
.node.left { margin-right: 56%; }
.node.right { margin-left: 56%; }
/* 中线上的主色圆点：作为时间轴的视觉锚 */
.dot { position: absolute; top: 24rpx; width: 20rpx; height: 20rpx; border-radius: 50%; background: var(--primary); box-shadow: 0 0 0 6rpx var(--primary-soft); }
.node.left .dot { right: -58%; }
.node.right .dot { left: -58%; }
.card { background: var(--bg-card); border-radius: 16rpx; padding: 16rpx; box-shadow: var(--shadow-card); }
.thumb { width: 100%; height: 180rpx; border-radius: 12rpx; }
.t { font-size: 28rpx; font-weight: 600; margin-top: 10rpx; }
.d { font-size: 24rpx; color: var(--primary); margin-top: 4rpx; }
.empty { text-align: center; color: var(--text-light); padding: 120rpx 0; }
</style>
