<template>
  <view class="axis">
    <view v-for="(ev, i) in events" :key="ev.id" class="node" :class="i % 2 === 0 ? 'left' : 'right'" @click="open(ev.id)">
      <image v-if="cover(ev)" class="thumb" :src="cover(ev)" mode="aspectFill" />
      <view v-else class="thumb placeholder">📷</view>
      <view class="t">{{ ev.title }}</view>
      <view class="d">{{ dateText(ev) }}</view>
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
.axis::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 4rpx; background: #ffb400; transform: translateX(-50%); }
.node { width: 44%; background: #fff; border-radius: 16rpx; padding: 16rpx; margin-bottom: 40rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.node.left { margin-right: 56%; }
.node.right { margin-left: 56%; }
.thumb { width: 100%; height: 180rpx; border-radius: 12rpx; }
.thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #ccc; }
.t { font-size: 28rpx; font-weight: 600; margin-top: 10rpx; }
.d { font-size: 24rpx; color: #ffb400; margin-top: 4rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; }
</style>
