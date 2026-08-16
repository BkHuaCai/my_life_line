<template>
  <view class="page">
    <!-- 当前用户信息 -->
    <view class="current-user" @click="openCurrentPerson">
      <image v-if="currentPerson.avatar_path" class="avatar" :src="currentPerson.avatar_path" mode="aspectFill" />
      <view v-else class="avatar placeholder">{{ currentPerson.name ? currentPerson.name[0] : '?' }}</view>
      <view class="info">
        <view class="name">{{ currentPerson.name || '请选择档案' }}</view>
        <view class="sub" v-if="currentPerson.birth_date">起始：{{ currentPerson.birth_date }}</view>
        <view class="sub" v-if="currentPerson.note">{{ currentPerson.note }}</view>
      </view>
      <view class="arrow">›</view>
    </view>

    <!-- 本月概览：本月新增事件数 + 最活跃时间线，让我的页有数据脉动 -->
    <view class="month-overview" v-if="currentPerson.id">
      <view class="mo-cell">
        <view class="mo-num">{{ monthOverview.monthCount }}</view>
        <view class="mo-label">本月新增</view>
      </view>
      <view class="mo-cell mo-active" v-if="monthOverview.activeTimeline" @click="openTimeline(monthOverview.activeTimeline.id)">
        <view class="mo-name">{{ monthOverview.activeTimeline.name }}</view>
        <view class="mo-label">最活跃 · {{ monthOverview.activeCount }} 个事件</view>
      </view>
    </view>

    <!-- 我的档案（点击进入详情，不再切换） -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">我的档案</text>
        <text class="add-user" @click="addPerson">＋ 添加</text>
      </view>
      <view class="user-list">
        <view v-for="p in persons" :key="p.id" class="user-card" @click="openPerson(p.id)">
          <image v-if="p.avatar_path" class="avatar-sm" :src="p.avatar_path" mode="aspectFill" />
          <view v-else class="avatar-sm placeholder">{{ p.name ? p.name[0] : '?' }}</view>
          <view class="user-info">
            <view class="user-name">{{ p.name }}<text v-if="p.is_default === 1" class="me-badge">我</text></view>
            <view class="user-meta">{{ timelineCounts[p.id] || 0 }} 条时间线</view>
          </view>
        </view>
        <view v-if="!persons.length" class="empty-tip">还没有档案，点击添加</view>
      </view>
    </view>

    <!-- 主题配色 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">主题配色</text>
      </view>
      <view class="theme-section">
        <view class="theme-label">预设颜色</view>
        <view class="theme-row">
          <view v-for="c in presetColors" :key="c" class="theme-item" @click="pickPreset(c)">
            <view class="swatch" :class="{ selected: !showPalette && themePrimary === c }" :style="{ background: c }">
              <text v-if="!showPalette && themePrimary === c" class="check">✓</text>
            </view>
          </view>
          <view class="theme-item" @click="customSelected = true">
            <view class="swatch swatch-custom" :class="{ selected: showPalette }">
              <text v-if="showPalette" class="check">✓</text>
            </view>
            <text class="theme-name">自定义</text>
          </view>
        </view>
        <template v-if="showPalette">
          <view class="theme-label">自定义颜色（调色盘）</view>
          <color-picker :value="themePrimary" @change="selectTheme" />
        </template>
      </view>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { PRESET_COLORS, getThemePrimary, saveThemePrimary, applyTheme } from '../../utils/theme'
import ColorPicker from '../../components/color-picker.vue'

export default {
  components: { ColorPicker },
  data() {
    return {
      currentPerson: {},
      persons: [],
      timelineCounts: {},
      monthOverview: { monthCount: 0, activeTimeline: null, activeCount: 0 },
      presetColors: PRESET_COLORS,
      customSelected: false,
      themePrimary: getThemePrimary()
    }
  },
  computed: {
    // 调色盘仅在选中「自定义」或当前主色不在预设内时展示
    showPalette() {
      return this.customSelected || !this.presetColors.includes(this.themePrimary)
    }
  },
  async onShow() {
    applyTheme(getThemePrimary())
    if (db.ready) await db.ready.catch(() => {})
    await this.load()
  },
  methods: {
    async load() {
      // 获取当前默认用户
      this.currentPerson = (await db.getDefaultPerson()) || {}

      // 获取所有用户
      this.persons = await db.getPersons()

      // 获取每个用户的时间线数量
      const counts = {}
      for (const p of this.persons) {
        const tls = await db.getTimelinesByPerson(p.id)
        counts[p.id] = tls.length
      }
      this.timelineCounts = counts
      // 本月概览：本月新增事件数 + 最活跃时间线
      if (this.currentPerson.id) {
        this.monthOverview = await db.getMonthOverview(this.currentPerson.id)
      }
      this.themePrimary = getThemePrimary()
      this.customSelected = !this.presetColors.includes(this.themePrimary)
    },
    openPerson(id) {
      uni.navigateTo({ url: `/pages/person-detail/index?personId=${id}` })
    },
    openTimeline(id) {
      uni.navigateTo({ url: `/pages/timeline/index?timelineId=${id}` })
    },
    openCurrentPerson() {
      if (this.currentPerson.id) {
        uni.navigateTo({ url: `/pages/person-detail/index?personId=${this.currentPerson.id}` })
      }
    },
    addPerson() {
      uni.navigateTo({ url: '/pages/edit-form/index?entityType=person' })
    },
    pickPreset(primary) {
      this.customSelected = false
      this.selectTheme(primary)
    },
    selectTheme(primary) {
      this.themePrimary = primary
      saveThemePrimary(primary)
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; padding-top: calc(var(--status-bar-height) + 40rpx); }

/* 当前用户：主色淡描边大卡 */
.current-user { display: flex; align-items: center; background: var(--bg-card); border-radius: 20rpx; padding: 36rpx; box-shadow: var(--shadow-card); border: 2rpx solid var(--primary-soft); }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.avatar.placeholder { background: var(--primary); color: var(--primary-contrast); display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 700; }
.info { flex: 1; margin-left: 24rpx; }
.name { font-size: 36rpx; font-weight: 700; }
.sub { font-size: 24rpx; color: var(--text-grey); margin-top: 6rpx; }
.arrow { font-size: 40rpx; color: var(--text-light); }

/* 分区：主色竖条标题统一 */
.section { margin-top: 40rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.title-wrap { display: flex; align-items: center; gap: 16rpx; }
.title-bar { width: 8rpx; height: 28rpx; border-radius: 4rpx; background: var(--primary); }
.section-title { font-size: 30rpx; font-weight: 700; color: var(--text-main); }
.add-user { color: var(--primary); font-size: 26rpx; padding: 8rpx 0 8rpx 24rpx; }
.user-list { display: flex; flex-direction: column; gap: 16rpx; }
.user-card { display: flex; align-items: center; background: var(--bg-card); border-radius: 20rpx; padding: 24rpx; box-shadow: var(--shadow-card); }
.user-card.active { border: 2rpx solid var(--primary); }
.avatar-sm { width: 72rpx; height: 72rpx; border-radius: 50%; }
.avatar-sm.placeholder { background: var(--primary); color: var(--primary-contrast); display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 700; }
.user-info { flex: 1; margin-left: 20rpx; }
.user-name { font-size: 30rpx; font-weight: 600; }
.me-badge { display: inline-block; background: var(--primary); color: var(--primary-contrast); font-size: 20rpx; padding: 2rpx 16rpx; border-radius: 12rpx; margin-left: 10rpx; }
.user-meta { font-size: 22rpx; color: var(--text-grey); margin-top: 6rpx; }
.check-icon { color: var(--primary); font-weight: 600; font-size: 28rpx; }
.empty-tip { text-align: center; color: var(--text-light); padding: 24rpx; }

/* 本月概览：双栏小卡，本月新增数 + 最活跃时间线 */
.month-overview { display: flex; gap: 16rpx; margin-top: 20rpx; }
.mo-cell { flex: 1; background: var(--bg-card); border-radius: 20rpx; padding: 28rpx 24rpx; box-shadow: var(--shadow-card); display: flex; flex-direction: column; }
.mo-cell.mo-active { justify-content: center; }
.mo-num { font-size: 44rpx; font-weight: 800; color: var(--primary); }
.mo-name { font-size: 30rpx; font-weight: 700; color: var(--text-main); }
.mo-label { font-size: 22rpx; color: var(--text-grey); margin-top: 6rpx; }

/* 主题配色 */
.theme-section { background: var(--bg-card); border-radius: 20rpx; padding: 28rpx 24rpx; box-shadow: var(--shadow-card); }
.theme-label { font-size: 24rpx; color: var(--text-sub); margin: 24rpx 0 16rpx; }
.theme-label:first-child { margin-top: 0; }
.theme-row { display: grid; grid-template-columns: repeat(6, 1fr); row-gap: 24rpx; column-gap: 20rpx; }
.theme-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.swatch { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.swatch.selected { border: 4rpx solid var(--text-main); box-sizing: border-box; }
.swatch-custom { background: linear-gradient(135deg, #ff0000, #ff9500, #ffff00, #07c160, #007aff, #7c4dff, #ff4d8d); }
.check { color: #fff; font-size: 30rpx; font-weight: 700; }
.theme-name { font-size: 20rpx; color: var(--text-sub); }
</style>