<template>
  <view class="page">
    <nav-bar title="回收站" />
    <view class="tip">
      <text class="tip-text">已删除的时间线和事件保留 5 天，到期自动彻底清除</text>
      <text class="tip-clear" v-if="hasTrash" @click="clearAll">清空</text>
    </view>

    <!-- 已删除时间线 -->
    <view class="section" v-if="trash.timelines.length">
      <view class="section-header">
        <text class="section-title">已删除时间线</text>
      </view>
      <view v-for="tl in trash.timelines" :key="tl.id" class="row">
        <view class="row-body">
          <view class="row-name">{{ tl.name }}</view>
          <view class="row-meta">{{ tl._person }} · {{ formatDeleted(tl.deleted_at) }} 删除</view>
        </view>
        <view class="row-actions">
          <view class="row-btn" @click="restoreTimeline(tl.id)">恢复</view>
          <view class="row-btn danger" @click="purgeTimeline(tl.id)">删除</view>
        </view>
      </view>
    </view>

    <!-- 已删除事件 -->
    <view class="section" v-if="trash.events.length">
      <view class="section-header">
        <text class="section-title">已删除事件</text>
      </view>
      <view v-for="ev in trash.events" :key="ev.id" class="row">
        <view class="row-body">
          <view class="row-name">{{ ev.title }}</view>
          <view class="row-meta">{{ ev._timeline }} · {{ formatDeleted(ev.deleted_at) }} 删除</view>
        </view>
        <view class="row-actions">
          <view class="row-btn" @click="restoreEvent(ev.id)">恢复</view>
          <view class="row-btn danger" @click="purgeEvent(ev.id)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="!hasTrash" class="empty">
      <view class="empty-icon">🗑️</view>
      <view class="empty-text">回收站是空的</view>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { applyTheme, getThemePrimary } from '../../utils/theme'
import NavBar from '../../components/nav-bar.vue'

export default {
  components: { NavBar },
  data() {
    return { trash: { timelines: [], events: [] } }
  },
  computed: {
    hasTrash() {
      return this.trash.timelines.length > 0 || this.trash.events.length > 0
    }
  },
  async onShow() {
    applyTheme(getThemePrimary())
    if (db.ready) await db.ready.catch(() => {})
    await this.load()
  },
  methods: {
    // 每次进入先清理过期项，再刷新列表
    async load() {
      await db.purgeExpiredTrash()
      this.trash = await db.getTrash()
    },
    formatDeleted(iso) {
      const d = new Date(iso)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    restoreTimeline(id) {
      db.restoreTimeline(id).then(() => {
        uni.showToast({ title: '已恢复', icon: 'success' })
        this.load()
      })
    },
    restoreEvent(id) {
      db.restoreEvent(id).then(() => {
        uni.showToast({ title: '已恢复', icon: 'success' })
        this.load()
      })
    },
    purgeTimeline(id) {
      uni.showModal({
        title: '彻底删除',
        content: '删除后无法恢复，确定彻底删除这条时间线吗？',
        success: (res) => {
          if (res.confirm) db.purgeTimeline(id).then(() => this.load())
        }
      })
    },
    purgeEvent(id) {
      uni.showModal({
        title: '彻底删除',
        content: '删除后无法恢复，确定彻底删除这条事件吗？',
        success: (res) => {
          if (res.confirm) db.purgeEvent(id).then(() => this.load())
        }
      })
    },
    clearAll() {
      uni.showModal({
        title: '清空回收站',
        content: '将彻底删除回收站中的全部内容，无法恢复！',
        success: async (res) => {
          if (!res.confirm) return
          for (const tl of this.trash.timelines) await db.purgeTimeline(tl.id)
          for (const ev of this.trash.events) await db.purgeEvent(ev.id)
          await this.load()
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; }
.tip { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 24rpx; box-shadow: var(--shadow-card); }
.tip-text { font-size: 24rpx; color: var(--text-sub); flex: 1; }
.tip-clear { font-size: 26rpx; color: var(--danger); padding: 8rpx 0 8rpx 24rpx; }
.section { margin-top: 24rpx; }
.section-header { margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: var(--text-main); }
.row { display: flex; align-items: center; background: var(--bg-card); border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: var(--shadow-card); }
.row-body { flex: 1; overflow: hidden; }
.row-name { font-size: 30rpx; font-weight: 600; }
.row-meta { font-size: 22rpx; color: var(--text-grey); margin-top: 6rpx; }
.row-actions { display: flex; gap: 16rpx; }
.row-btn { font-size: 26rpx; color: var(--primary); padding: 8rpx 20rpx; border-radius: 24rpx; background: var(--primary-soft); }
.row-btn.danger { color: var(--danger); background: rgba(255, 59, 48, .1); }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 26rpx; color: var(--text-light); margin-top: 16rpx; }
</style>
