<template>
  <view class="page" :style="themeVars">
    <nav-bar title="档案" />
    <view class="header">
      <image v-if="person.avatar_path" class="avatar" :src="person.avatar_path" mode="aspectFill" />
      <view v-else class="avatar placeholder">{{ person.name ? person.name[0] : '?' }}</view>
      <view class="meta">
        <view class="name">{{ person.name }}</view>
        <view class="sub" v-if="person.birth_date">起始：{{ person.birth_date }}</view>
        <view class="sub" v-if="person.note">{{ person.note }}</view>
      </view>
      <view class="header-actions">
        <view class="action-btn" @click="editPerson">编辑</view>
        <view class="action-btn danger" v-if="person.is_default !== 1" @click="deletePerson">删除</view>
      </view>
    </view>

    <view class="list">
      <view v-for="tl in timelines" :key="tl.id" class="card" @click="openTimeline(tl.id)">
        <view class="tl-body">
          <view class="tl-name">{{ tl.name }}</view>
          <view class="tl-sub">{{ eventCount(tl.id) }} 个动态</view>
        </view>
        <view class="tl-cat" v-if="tl.category">{{ tl.category }}</view>
        <view class="tl-cat main-badge" v-if="tl.is_main === 1">主线</view>
        <view class="actions">
          <view class="action-btn" @click.stop="editTimeline(tl)">编辑</view>
          <view class="action-btn danger" v-if="tl.is_main !== 1" @click.stop="deleteTimeline(tl)">删除</view>
        </view>
      </view>
      <view v-if="!timelines.length" class="empty">还没有时间线，点右下角添加</view>
    </view>

    <view class="fab" @click="addTimeline">＋ 时间线</view>

    <undo-toast ref="undoToast" />
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { applyTheme, getThemePrimary } from '../../utils/theme'
import NavBar from '../../components/nav-bar.vue'
import UndoToast from '../../components/undo-toast.vue'

import themeMixin from '../../utils/theme-mixin'

export default {
  mixins: [themeMixin],
  components: { NavBar, UndoToast },
  data() {
    return { personId: '', person: {}, timelines: [], counts: {} }
  },
  async onLoad(options) {
    this.personId = options.personId
  },
  onHide() {
    // 切走时收起撤回提示条，避免残留到下一页
    if (this.$refs.undoToast) this.$refs.undoToast.hide()
  },
  async onShow() {
    applyTheme(getThemePrimary())
    if (db.ready) await db.ready.catch(() => {})
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
        title: '删除档案',
        content: `确定删除「${this.person.name}」吗？此操作将同时删除该档案的所有时间线和动态，无法恢复！`,
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
        content: `确定删除「${tl.name}」吗？此时间线内的所有动态也将被删除，可在回收站中恢复（保留 5 天）。`,
        success: async (res) => {
          if (!res.confirm) return
          const id = tl.id
          const name = tl.name
          await db.deleteTimeline(id)
          await this.load()
          // 展示「已删除 + 撤回」：点撤回恢复时间线及其动态
          this.$refs.undoToast.show(`已删除「${name}」`, async () => {
            await db.restoreTimeline(id)
            await this.load()
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; }
.header { display: flex; align-items: center; background: var(--bg-card); border-radius: 20rpx; padding: 32rpx; margin-bottom: 32rpx; box-shadow: var(--shadow-card); border: 2rpx solid var(--primary-soft); }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.avatar.placeholder { background: var(--primary); color: var(--primary-contrast); display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 700; }
.meta { margin-left: 24rpx; flex: 1; }
.name { font-size: 36rpx; font-weight: 700; }
.sub { font-size: 24rpx; color: var(--text-grey); margin-top: 6rpx; }
.header-actions { display: flex; flex-direction: column; gap: 8rpx; }
.action-btn { color: var(--primary); font-size: 26rpx; padding: 8rpx 16rpx; }
.action-btn.danger { color: var(--danger); }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { display: flex; align-items: center; background: var(--bg-card); border-radius: 20rpx; padding: 24rpx; box-shadow: var(--shadow-card); }
.tl-body { flex: 1; }
.tl-name { font-size: 32rpx; font-weight: 600; }
.tl-sub { font-size: 24rpx; color: var(--text-grey); margin-top: 6rpx; }
.tl-cat { background: var(--primary-soft); color: var(--primary-dark); font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; margin-right: 16rpx; }
.main-badge { background: var(--primary); color: var(--primary-contrast); }
.actions { display: flex; flex-direction: column; gap: 4rpx; }
.empty { text-align: center; color: var(--text-light); padding: 100rpx 0; }
.fab { position: fixed; right: 40rpx; bottom: 60rpx; background: var(--primary); color: var(--primary-contrast); padding: 20rpx 32rpx; border-radius: 48rpx; font-size: 30rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.2); }
</style>
