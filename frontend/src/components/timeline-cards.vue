<template>
  <view class="cards">
    <view v-for="ev in events" :key="ev.id" class="card" @click="open(ev.id)">
      <image v-if="cover(ev)" class="big" :src="cover(ev)" mode="aspectFill" />
      <view v-else class="big placeholder">📷</view>
      <view class="body">
        <view class="d">{{ dateText(ev) }}</view>
        <view class="t">{{ ev.title }}</view>
        <view class="desc" v-if="ev.description">{{ ev.description }}</view>
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
.cards { padding: 16rpx; display: flex; flex-direction: column; gap: 24rpx; }
.card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.big { width: 100%; height: 360rpx; }
.big.placeholder { display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #ccc; font-size: 64rpx; }
.body { padding: 20rpx; }
.d { font-size: 24rpx; color: #ffb400; font-weight: 600; }
.t { font-size: 32rpx; font-weight: 700; margin-top: 8rpx; }
.desc { font-size: 26rpx; color: #888; margin-top: 8rpx; }
.empty { text-align: center; color: #bbb; padding: 120rpx 0; }
</style>
