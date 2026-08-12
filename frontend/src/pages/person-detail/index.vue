<template>
  <view class="page">
    <view class="header">
      <image v-if="person.avatar_path" class="avatar" :src="person.avatar_path" mode="aspectFill" />
      <view v-else class="avatar placeholder">{{ person.name ? person.name[0] : '?' }}</view>
      <view class="meta">
        <view class="name">{{ person.name }}</view>
        <view class="sub" v-if="person.birth_date">出生：{{ person.birth_date }}</view>
        <view class="sub" v-if="person.note">{{ person.note }}</view>
      </view>
      <view class="header-actions">
        <view class="action-btn" @click="editPerson">编辑</view>
        <view class="action-btn danger" @click="deletePerson">删除</view>
      </view>
    </view>

    <view class="list">
      <view v-for="tl in timelines" :key="tl.id" class="card" @click="openTimeline(tl.id)">
        <view class="tl-body">
          <view class="tl-name">{{ tl.name }}</view>
          <view class="tl-sub">{{ eventCount(tl.id) }} 个事件</view>
        </view>
        <view class="tl-cat" v-if="tl.category">{{ tl.category }}</view>
        <view class="actions">
          <view class="action-btn" @click.stop="editTimeline(tl)">编辑</view>
          <view class="action-btn danger" @click.stop="deleteTimeline(tl)">删除</view>
        </view>
      </view>
      <view v-if="!timelines.length" class="empty">还没有时间线，点右下角添加</view>
    </view>

    <view class="fab" @click="addTimeline">＋ 时间线</view>
  </view>
</template>

<script>
import { db } from '../../utils/db'

export default {
  data() {
    return { personId: '', person: {}, timelines: [], counts: {} }
  },
  async onLoad(options) {
    this.personId = options.personId
    uni.setNavigationBarTitle({ title: '人物' })
  },
  async onShow() {
    await this.load()
  },
  methods: {
    async load() {
      this.person = (await db.getPerson(this.personId)) || {}
      this.timelines = await db.getTimelinesByPerson(this.personId)
      const counts = {}
      for (const tl of this.timelines) counts[tl.id] = (await db.getEventsByTimeline(tl.id)).length
      this.counts = counts
    },
    eventCount(id) {
      return this.counts[id] || 0
    },
    openTimeline(id) {
      uni.navigateTo({ url: `/pages/timeline/index?timelineId=${id}` })
    },
    editPerson() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=person&id=${this.personId}` })
    },
    deletePerson() {
      uni.showModal({
        title: '删除人物',
        content: `确定删除「${this.person.name}」吗？此操作将同时删除该人物的所有时间线和事件，无法恢复！`,
        success: async (res) => {
          if (res.confirm) {
            await db.deletePerson(this.personId)
            uni.navigateBack()
          }
        }
      })
    },
    addTimeline() {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=timeline&personId=${this.personId}` })
    },
    editTimeline(tl) {
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=timeline&id=${tl.id}` })
    },
    deleteTimeline(tl) {
      uni.showModal({
        title: '删除时间线',
        content: `确定删除「${tl.name}」吗？此时间线内的所有事件也将被删除，无法恢复！`,
        success: async (res) => {
          if (res.confirm) {
            await db.deleteTimeline(tl.id)
            await this.load()
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.header { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.avatar.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.meta { margin-left: 20rpx; flex: 1; }
.name { font-size: 36rpx; font-weight: 700; }
.sub { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.header-actions { display: flex; flex-direction: column; gap: 8rpx; }
.action-btn { color: #4a6cf7; font-size: 26rpx; padding: 8rpx 16rpx; }
.action-btn.danger { color: #ff5a5a; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.tl-body { flex: 1; }
.tl-name { font-size: 32rpx; font-weight: 600; }
.tl-sub { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.tl-cat { background: #fff4d6; color: #b8860b; font-size: 24rpx; padding: 6rpx 16rpx; border-radius: 20rpx; margin-right: 16rpx; }
.actions { display: flex; flex-direction: column; gap: 4rpx; }
.action-btn { color: #4a6cf7; font-size: 26rpx; padding: 8rpx 16rpx; }
.action-btn.danger { color: #ff5a5a; }
.empty { text-align: center; color: #bbb; padding: 100rpx 0; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: #ffb400; color: #fff; padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>
