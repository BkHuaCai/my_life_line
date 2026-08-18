<template>
  <view class="page" :style="themeVars">
    <nav-bar title="回收站" />
    <view class="tip">
      <text class="tip-text">已删除的时间线和动态保留 5 天，到期自动彻底清除</text>
      <view class="tip-actions" v-if="hasTrash">
        <text class="tip-link" @click="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</text>
        <text class="tip-clear" :class="{ disabled: !allSelected }" @click="clearAll">删除全部</text>
      </view>
    </view>

    <!-- 已删除时间线 -->
    <view class="section" v-if="trash.timelines.length">
      <view class="section-header">
        <text class="section-title">已删除时间线</text>
      </view>
      <view
        v-for="tl in trash.timelines"
        :key="tl.id"
        class="row"
        :class="{ checked: isSel('tl', tl.id) }"
        @click="toggleSel('tl', tl.id)"
      >
        <view class="row-check">
          <view class="check-box" :class="{ on: isSel('tl', tl.id) }">✓</view>
        </view>
        <view class="row-body">
          <view class="row-name">{{ tl.name }}</view>
          <view class="row-meta">{{ tl._person }} · {{ tl._count || 0 }} 个动态 · {{ formatDeleted(tl.deleted_at) }} 删除</view>
        </view>
        <view class="row-actions" @click.stop>
          <view class="row-btn" @click="restoreTimeline(tl)">恢复</view>
          <view class="row-btn danger" @click="purgeTimeline(tl.id)">删除</view>
        </view>
      </view>
    </view>

    <!-- 已删除动态 -->
    <view class="section" v-if="trash.events.length">
      <view class="section-header">
        <text class="section-title">已删除动态</text>
      </view>
      <view
        v-for="ev in trash.events"
        :key="ev.id"
        class="row"
        :class="{ checked: isSel('ev', ev.id) }"
        @click="toggleSel('ev', ev.id)"
      >
        <view class="row-check">
          <view class="check-box" :class="{ on: isSel('ev', ev.id) }">✓</view>
        </view>
        <view class="row-body">
          <view class="row-name">{{ ev.title }}</view>
          <view class="row-meta">{{ ev._timeline }} · {{ formatEventDate(ev) }}</view>
          <view class="row-meta">{{ formatDeleted(ev.deleted_at) }} 删除</view>
        </view>
        <view class="row-actions" @click.stop>
          <view class="row-btn" @click="restoreEvent(ev)">恢复</view>
          <view class="row-btn danger" @click="purgeEvent(ev.id)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="!hasTrash" class="empty">
      <view class="empty-icon">🗑️</view>
      <view class="empty-text">回收站是空的</view>
    </view>

    <!-- 批量操作栏：勾选后出现 -->
    <view class="batch-bar" v-if="selectedCount > 0">
      <view class="batch-info">已选 {{ selectedCount }} 项</view>
      <view class="batch-cancel" @click="clearSelected">取消</view>
      <view class="batch-delete" @click="deleteSelected">删除选中</view>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { formatEventDate } from '../../utils/date'
import { applyTheme, getThemePrimary } from '../../utils/theme'
import NavBar from '../../components/nav-bar.vue'

import themeMixin from '../../utils/theme-mixin'

export default {
  mixins: [themeMixin],
  components: { NavBar },
  data() {
    return {
      trash: { timelines: [], events: [] },
      selectedTl: [],
      selectedEv: []
    }
  },
  computed: {
    hasTrash() {
      return this.trash.timelines.length > 0 || this.trash.events.length > 0
    },
    selectedCount() {
      return this.selectedTl.length + this.selectedEv.length
    },
    allSelected() {
      const total = this.trash.timelines.length + this.trash.events.length
      return total > 0 && this.selectedCount === total
    }
  },
  async onShow() {
    applyTheme(getThemePrimary())
    if (db.ready) await db.ready.catch(() => {})
    await this.load()
  },
  methods: {
    // 模板中直接调用的格式化函数：Vue 3 选项式模板只能访问实例方法，
    // 模块导入的 formatEventDate 需在此暴露，否则渲染行时 TypeError 白屏
    formatEventDate(ev) {
      return formatEventDate(ev)
    },
    // 每次进入先清理过期项，再刷新列表，并剔除已失效的勾选
    async load() {
      await db.purgeExpiredTrash()
      this.trash = await db.getTrash()
      this.selectedTl = this.selectedTl.filter((id) => this.trash.timelines.some((t) => t.id === id))
      this.selectedEv = this.selectedEv.filter((id) => this.trash.events.some((e) => e.id === id))
    },
    formatDeleted(iso) {
      const d = new Date(iso)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    // ---- 勾选 ----
    isSel(type, id) {
      return type === 'tl' ? this.selectedTl.includes(id) : this.selectedEv.includes(id)
    },
    toggleSel(type, id) {
      const arr = type === 'tl' ? this.selectedTl : this.selectedEv
      const i = arr.indexOf(id)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(id)
    },
    toggleSelectAll() {
      if (this.allSelected) {
        this.clearSelected()
        return
      }
      this.selectedTl = this.trash.timelines.map((t) => t.id)
      this.selectedEv = this.trash.events.map((e) => e.id)
    },
    clearSelected() {
      this.selectedTl = []
      this.selectedEv = []
    },
    // ---- 恢复（先弹窗确认，含时间线不存在/改名提示）----
    restoreTimeline(tl) {
      db.getPerson(tl.person_id).then((p) => {
        if (!p) {
          uni.showModal({
            title: '无法恢复',
            content: `时间线「${tl.name}」所属档案已不存在，无法恢复。`,
            showCancel: false
          })
          return
        }
        uni.showModal({
          title: '恢复时间线',
          content: `将恢复时间线「${tl.name}」及其 ${tl._count || 0} 个动态到档案「${p.name}」。`,
          success: (res) => {
            if (!res.confirm) return
            db.restoreTimeline(tl.id).then(() => {
              uni.showToast({ title: '已恢复', icon: 'success' })
              this.load()
            })
          }
        })
      })
    },
    restoreEvent(ev) {
      db.getTimeline(ev.timeline_id).then((tl) => {
        if (!tl) {
          uni.showModal({
            title: '无法恢复',
            content: `该动态所属时间线「${ev.trash_tl_name || '未知'}」已不存在或已删除，无法单独恢复。可先在回收站恢复对应时间线。`,
            showCancel: false
          })
          return
        }
        let content = `将恢复动态「${ev.title}」到时间线「${tl.name}」（${formatEventDate(ev)}）`
        if (ev.trash_tl_name && ev.trash_tl_name !== tl.name) {
          content += `\n\n注意：该动态删除时所在时间线名为「${ev.trash_tl_name}」，现已改名为「${tl.name}」。`
        }
        uni.showModal({
          title: '恢复动态',
          content,
          success: (res) => {
            if (!res.confirm) return
            db.restoreEvent(ev.id).then(() => {
              uni.showToast({ title: '已恢复', icon: 'success' })
              this.load()
            })
          }
        })
      })
    },
    // ---- 删除 ----
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
        content: '删除后无法恢复，确定彻底删除这条动态吗？',
        success: (res) => {
          if (res.confirm) db.purgeEvent(id).then(() => this.load())
        }
      })
    },
    // 删除勾选的部分数据
    deleteSelected() {
      if (this.selectedCount === 0) return
      uni.showModal({
        title: '删除选中',
        content: `确定彻底删除选中的 ${this.selectedCount} 项吗？删除后无法恢复！`,
        success: async (res) => {
          if (!res.confirm) return
          for (const id of this.selectedTl) await db.purgeTimeline(id)
          for (const id of this.selectedEv) await db.purgeEvent(id)
          this.clearSelected()
          await this.load()
        }
      })
    },
    // 删除全部：必须先全选（勾选全部数据），点击后删除的是勾选的数据
    clearAll() {
      if (!this.allSelected) {
        uni.showToast({ title: '请先全选', icon: 'none' })
        return
      }
      uni.showModal({
        title: '删除全部',
        content: `将彻底删除勾选的全部 ${this.selectedCount} 项数据，无法恢复！`,
        success: async (res) => {
          if (!res.confirm) return
          for (const id of this.selectedTl) await db.purgeTimeline(id)
          for (const id of this.selectedEv) await db.purgeEvent(id)
          this.clearSelected()
          await this.load()
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 160rpx; }
.tip { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 24rpx; box-shadow: var(--shadow-card); }
.tip-text { font-size: 24rpx; color: var(--text-sub); flex: 1; }
.tip-actions { display: flex; align-items: center; gap: 24rpx; }
.tip-link { font-size: 26rpx; color: var(--primary); padding: 8rpx 0 8rpx 16rpx; }
.tip-clear { font-size: 26rpx; color: var(--danger); padding: 8rpx 0 8rpx 16rpx; }
.tip-clear.disabled { color: var(--text-light); }
.section { margin-top: 24rpx; }
.section-header { margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: var(--text-main); }
.row { display: flex; align-items: center; background: var(--bg-card); border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: var(--shadow-card); }
.row.checked { border: 2rpx solid var(--primary); }
.row-check { margin-right: 16rpx; }
.check-box { width: 36rpx; height: 36rpx; border-radius: 50%; border: 3rpx solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: transparent; box-sizing: border-box; }
.check-box.on { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast); }
.row-body { flex: 1; overflow: hidden; }
.row-name { font-size: 30rpx; font-weight: 600; }
.row-meta { font-size: 22rpx; color: var(--text-grey); margin-top: 6rpx; }
.row-actions { display: flex; gap: 16rpx; }
.row-btn { font-size: 26rpx; color: var(--primary); padding: 8rpx 20rpx; border-radius: 24rpx; background: var(--primary-soft); }
.row-btn.danger { color: var(--danger); background: rgba(255, 59, 48, .1); }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 26rpx; color: var(--text-light); margin-top: 16rpx; }

/* 批量操作栏 */
.batch-bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--bg-card); padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; box-shadow: 0 -4rpx 16rpx rgba(0,0,0,.06); z-index: 20; }
.batch-info { flex: 1; font-size: 28rpx; color: var(--text-main); font-weight: 600; }
.batch-cancel { font-size: 28rpx; color: var(--text-sub); padding: 12rpx 24rpx; }
.batch-delete { font-size: 28rpx; color: #fff; background: var(--danger); border-radius: 40rpx; padding: 14rpx 40rpx; }
</style>
