<template>
  <view class="page">
    <view class="swiper-wrap" v-if="images.length">
      <swiper class="swiper" indicator-dots circular>
        <swiper-item v-for="(img, i) in images" :key="i">
          <image class="img" :src="img.image_path || img.thumb_path" mode="aspectFill" @click="preview(i)" />
        </swiper-item>
      </swiper>
    </view>
    <view v-else class="no-img">暂无图片</view>

    <view class="meta">
      <view class="date">{{ dateText }}</view>
      <view class="title">{{ event.title }}</view>
      <view class="desc" v-if="event.description">{{ event.description }}</view>
    </view>

    <view class="actions">
      <button class="btn" @click="edit">编辑</button>
      <button class="btn danger" @click="remove">删除</button>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { formatEventDate } from '../../utils/date'

export default {
  data() {
    return { eventId: '', event: {}, images: [], dateText: '' }
  },
  async onLoad(options) {
    this.eventId = options.eventId
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.event = (await db.getEvent(this.eventId)) || {}
      this.images = await db.getImagesByEvent(this.eventId)
      this.dateText = formatEventDate(this.event)
      if (this.event.title) uni.setNavigationBarTitle({ title: this.event.title })
    },
    preview(i) {
      uni.previewImage({ urls: this.images.map((im) => im.image_path || im.thumb_path), current: i })
    },
    edit() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=event&id=${this.eventId}` })
    },
    remove() {
      uni.showModal({
        title: '删除事件',
        content: '确定删除这条事件吗？',
        success: async (res) => {
          if (res.confirm) {
            await db.deleteEvent(this.eventId)
            uni.navigateBack()
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding-bottom: 40rpx; }
.swiper-wrap { width: 100%; }
.swiper { width: 100%; height: 640rpx; }
.img { width: 100%; height: 640rpx; }
.no-img { width: 100%; height: 320rpx; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #bbb; }
.meta { padding: 24rpx; }
.date { color: #ffb400; font-weight: 600; }
.title { font-size: 40rpx; font-weight: 700; margin-top: 12rpx; }
.desc { font-size: 30rpx; color: #555; margin-top: 16rpx; line-height: 1.6; }
.actions { display: flex; gap: 24rpx; padding: 24rpx; }
.btn { flex: 1; background: #ffb400; color: #fff; border-radius: 48rpx; }
.btn.danger { background: #ff5a5a; }
</style>
