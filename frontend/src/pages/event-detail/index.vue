<template>
  <view class="page">
    <view class="swiper-wrap" v-if="images.length">
      <swiper class="swiper" indicator-dots indicator-active-color="var(--primary)" indicator-color="rgba(0,0,0,.2)" circular>
        <swiper-item v-for="(img, i) in images" :key="i">
          <image class="img" :src="img.image_path || img.thumb_path" mode="aspectFill" @click="preview(i)" />
        </swiper-item>
      </swiper>
      <view class="img-count">{{ images.length }} 张</view>
    </view>
    <view v-else class="no-img">
      <view class="no-img-icon">🖼️</view>
      <view class="no-img-text">暂无图片</view>
    </view>

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
import { applyTheme, getThemePrimary } from '../../utils/theme'

export default {
  data() {
    return { eventId: '', event: {}, images: [], dateText: '' }
  },
  async onLoad(options) {
    this.eventId = options.eventId
  },
  async onShow() {
    applyTheme(getThemePrimary())
    if (db.ready) await db.ready.catch(() => {})
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
.swiper-wrap { position: relative; width: 100%; }
.swiper { width: 100%; height: 640rpx; }
.img { width: 100%; height: 640rpx; }
.img-count { position: absolute; right: 24rpx; bottom: 24rpx; background: rgba(0,0,0,.5); color: #fff; font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; }
.no-img { width: 100%; height: 400rpx; background: var(--bg-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.no-img-icon { font-size: 80rpx; }
.no-img-text { color: var(--text-light); font-size: 26rpx; margin-top: 16rpx; }
.meta { padding: 32rpx 24rpx 24rpx; }
.date { color: var(--primary); font-size: 26rpx; font-weight: 600; }
.title { font-size: 42rpx; font-weight: 800; margin-top: 12rpx; }
.desc { font-size: 30rpx; color: var(--text-sub); margin-top: 16rpx; line-height: 1.6; }
.actions { display: flex; gap: 24rpx; padding: 24rpx; }
.btn { flex: 1; background: var(--primary); color: var(--primary-contrast); border-radius: 48rpx; font-size: 30rpx; }
.btn.danger { background: var(--danger); }
.btn::after { border: none; }
</style>
