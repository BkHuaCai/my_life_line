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
    <view v-if="!events.length" class="empty">还没有动态，点右下角 + 添加</view>
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
/* 节点占满整行：卡片用 margin 让到左/右，圆点固定在轴线上 */
.node { position: relative; width: 100%; margin-bottom: 40rpx; }
.card { width: 44%; box-sizing: border-box; background: var(--bg-card); border-radius: 16rpx; padding: 16rpx; box-shadow: var(--shadow-card); }
.node.left .card { margin-right: 56%; }
.node.right .card { margin-left: 56%; }
/* 中线上的主色圆点：作为时间轴的视觉锚，水平居中于轴线（left 50% 相对整行节点） */
.dot { position: absolute; top: 24rpx; left: 50%; width: 20rpx; height: 20rpx; border-radius: 50%; background: var(--primary); box-shadow: 0 0 0 6rpx var(--primary-soft); transform: translateX(-50%); }
.thumb { width: 100%; height: 180rpx; border-radius: 12rpx; }
.t { font-size: 28rpx; font-weight: 600; margin-top: 10rpx; }
.d { font-size: 24rpx; color: var(--primary); margin-top: 4rpx; }
.empty { text-align: center; color: var(--text-light); padding: 120rpx 0; }
</style>
