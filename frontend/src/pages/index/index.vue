<template>
  <view class="page">
    <!-- 顶部：问候语 + 用户切换下拉框，右侧右对齐主线标题 -->
    <view class="hero">
      <view class="greet">
        <view class="greet-name">{{ currentPerson.name || '时光档案' }}</view>
        <view class="greet-sub">{{ heroSub }}</view>
      </view>
      <picker class="user-dropdown" mode="selector" :range="userOptions" :value="userIndex" @change="onSwitchUser">
        <view class="dropdown-label">
          <view class="avatar-dot">{{ (currentPerson.name || '?')[0] }}</view>
          <text class="dropdown-name">{{ currentPerson.name || '选择档案' }}</text>
          <text class="dropdown-arrow">▾</text>
        </view>
      </picker>
    </view>

    <!-- 顶部搜索：按关键字搜索时间线内容 -->
    <view class="search-bar">
      <text class="search-icon">🔍</text>
      <input class="search-input" v-model="keyword" placeholder="搜索时间线内容（标题/描述）" @confirm="doSearch" @input="doSearch" />
    </view>

    <!-- 搜索结果 -->
    <template v-if="searching">
      <view class="result-list">
        <view v-for="r in results" :key="r.id" class="result-item" @click="openEvent(r.id)">
          <view class="r-title">{{ r.title }}</view>
          <view class="r-sub">{{ personName(r.person_id) }} · {{ timelineName(r.timeline_id) }}</view>
          <view class="r-desc" v-if="r.description">{{ r.description }}</view>
        </view>
        <view v-if="!results.length" class="empty">没有匹配的事件</view>
      </view>
    </template>

    <!-- 主线 + 其他时间线 -->
    <template v-else>
      <!-- 数据概览：紧贴 hero 的统计带，参考主流首页 dashboard 条 -->
      <view class="stats-band" v-if="currentPerson.id">
        <view class="stat-cell">
          <view class="stat-num">{{ timelineTotal }}</view>
          <view class="stat-label">时间线</view>
        </view>
        <view class="stat-cell">
          <view class="stat-num">{{ eventTotal }}</view>
          <view class="stat-label">事件</view>
        </view>
        <view class="stat-cell">
          <view class="stat-num">{{ persons.length }}</view>
          <view class="stat-label">档案</view>
        </view>
      </view>

      <!-- 时光机：历史上同月同日发生的事件，每日有新内容 -->
      <view class="time-machine" v-if="currentPerson.id && todayEvents.length">
        <view class="tm-head">
          <text class="tm-title">🕯️ 时光机</text>
          <text class="tm-date">历史上的今天 · {{ todayLabel }}</text>
        </view>
        <swiper class="tm-swiper" indicator-dots indicator-active-color="var(--primary)" circular>
          <swiper-item v-for="t in todayEvents" :key="t.id" @click="openEvent(t.id)">
            <view class="tm-card">
              <view class="tm-year">{{ t._year }} 年</view>
              <view class="tm-event">{{ t.title }}</view>
              <view class="tm-tl">{{ tlMap[t.timeline_id] || '' }}</view>
            </view>
          </swiper-item>
        </swiper>
      </view>
      <view class="time-machine tm-empty" v-else-if="currentPerson.id && eventTotal > 0">
        <text class="tm-empty-text">今天还没有历史事件，去打个新事件吧</text>
      </view>

      <!-- 本月活动：主色进度条，让首页有动的数据脉动 -->
      <view class="month-bar" v-if="currentPerson.id">
        <view class="mb-text">
          <text class="mb-label">本月新增</text>
          <text class="mb-count">{{ monthCount }} 个事件</text>
        </view>
        <view class="mb-track">
          <view class="mb-fill" :style="{ width: monthFillWidth }"></view>
        </view>
      </view>

      <view class="section" v-if="mainTimeline.id">
        <view class="section-header">
          <view class="title-wrap">
            <view class="title-bar"></view>
            <text class="section-title">主线</text>
          </view>
        </view>
        <view class="main-card" @click="openMain">
          <view class="main-cover"></view>
          <view class="main-info">
            <view class="main-name">{{ mainTimeline.name }} <text class="main-badge">主线</text></view>
            <view class="main-meta">
              {{ eventCounts[mainTimeline.id] || 0 }} 个事件
              <text v-if="needInitPoint" class="main-warn"> · 待填写初始点</text>
            </view>
          </view>
          <view class="arrow">›</view>
        </view>
      </view>

      <view class="section" v-if="currentPerson.id">
        <view class="section-header">
          <view class="title-wrap">
            <view class="title-bar"></view>
            <text class="section-title">其他时间线</text>
          </view>
          <text class="section-add" @click="addTimeline">＋ 新建</text>
        </view>
        <view class="timeline-list" v-if="otherTimelines.length">
          <view v-for="tl in otherTimelines" :key="tl.id" class="timeline-card" @click="openTimeline(tl.id)">
            <view class="tl-thumb" :class="thumbTheme(tl.id)">{{ tl.name ? tl.name[0] : '〜' }}</view>
            <view class="tl-body">
              <view class="tl-name">{{ tl.name }}</view>
              <view class="tl-meta">
                <text class="tl-cat" v-if="tl.category">{{ tl.category }}</text>
                <text class="tl-count">{{ eventCounts[tl.id] || 0 }} 个事件</text>
              </view>
            </view>
            <view class="tl-arrow">›</view>
          </view>
        </view>
        <view class="empty-state" v-else>
          <view class="empty-icon">🗂️</view>
          <view class="empty-title">还没有其他时间线</view>
          <view class="empty-desc">为教育、旅行、健康等主题创建专属时间线</view>
          <button class="empty-btn" @click="addTimeline">＋ 创建时间线</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { applyTheme, getThemePrimary } from '../../utils/theme'

export default {
  data() {
    return {
      currentPerson: {},
      persons: [],
      userOptions: [],
      userIndex: 0,
      mainTimeline: {},
      otherTimelines: [],
      eventCounts: {},
      needInitPoint: false,
      keyword: '',
      searching: false,
      results: [],
      nameMap: {},
      tlMap: {},
      _searchTimer: null,
      todayEvents: [],
      todayLabel: '',
      monthCount: 0,
      monthFillWidth: '0%'
    }
  },
  computed: {
    // 数据概览：时间线总数（主线 + 其他）、事件总数
    timelineTotal() {
      return this.otherTimelines.length + (this.mainTimeline.id ? 1 : 0)
    },
    eventTotal() {
      return Object.values(this.eventCounts).reduce((sum, n) => sum + n, 0)
    },
    // 顶部问候语：按事件总数给一句话引导，避免首页空时单调
    heroSub() {
      if (!this.currentPerson.id) return '点击右侧切换或添加档案'
      if (this.needInitPoint) return '主线待填写初始点，先去打个点吧'
      if (this.eventTotal === 0) return '还没有事件，点「主线」开始记录'
      return `共 ${this.timelineTotal} 条时间线 · ${this.eventTotal} 个事件`
    },
    // 其他时间线卡片左缩略图按名称首字符循环分配点缀色，让列表更有层次
    thumbTheme() {
      return (id) => {
        const tl = this.otherTimelines.find((t) => t.id === id)
        const seed = (tl && tl.name ? tl.name.length : 0) % 5
        return ['tone-0', 'tone-1', 'tone-2', 'tone-3', 'tone-4'][seed]
      }
    }
  },
  async onShow() {
    applyTheme(getThemePrimary())
    // 首次启动等 db.init() 完成（建表+插默认用户+主线），否则真机 SQLite 慢于首屏查询时
    // currentPerson.id 为空，导致「其他时间线」「数据概览」两个 v-if 整块消失
    if (db.ready) await db.ready.catch(() => {})
    await this.load()
  },
  methods: {
    async load() {
      const persons = await db.getPersons()
      this.persons = persons
      // 下拉框选项：全部用户 + 末尾追加「＋ 添加用户」
      this.userOptions = [...persons.map((p) => p.name), '＋ 添加档案']
      this.currentPerson = (await db.getDefaultPerson()) || persons[0] || {}
      this.userIndex = persons.findIndex((p) => p.id === this.currentPerson.id)
      if (this.userIndex < 0) this.userIndex = 0
      // 构建搜索结果所需的名称映射
      const nameMap = {}
      const tlMap = {}
      for (const p of persons) {
        nameMap[p.id] = p.name
        const tls = await db.getTimelinesByPerson(p.id)
        for (const tl of tls) tlMap[tl.id] = tl.name
      }
      this.nameMap = nameMap
      this.tlMap = tlMap
      if (!this.currentPerson.id) {
        this.mainTimeline = {}
        this.otherTimelines = []
        this.eventCounts = {}
        return
      }
      this.mainTimeline = (await db.getMainTimeline(this.currentPerson.id)) || {}
      const tls = await db.getTimelinesByPerson(this.currentPerson.id)
      this.otherTimelines = tls.filter((t) => t.is_main !== 1)
      const counts = {}
      for (const tl of tls) counts[tl.id] = (await db.getEventsByTimeline(tl.id)).length
      this.eventCounts = counts
      this.needInitPoint = !!this.mainTimeline.id && (counts[this.mainTimeline.id] || 0) === 0
      // 时光机：历史上同月同日的事件
      const now = new Date()
      this.todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
      this.todayEvents = await db.getTodayEvents(this.currentPerson.id)
      // 本月活动：本月新增事件数 + 进度条（本月新增 / 全年事件总数，上限 100%）
      const overview = await db.getMonthOverview(this.currentPerson.id)
      this.monthCount = overview.monthCount
      const total = this.eventTotal || overview.activeCount || 0
      this.monthFillWidth = (total > 0 ? Math.min(100, Math.round((overview.monthCount / total) * 100)) : 0) + '%'
    },
    onPullDownRefresh() {
      this.load().then(() => {
        uni.stopPullDownRefresh()
        uni.showToast({ title: '已刷新', icon: 'none', duration: 800 })
      }).catch(() => uni.stopPullDownRefresh())
    },
    onSwitchUser(e) {
      const idx = Number(e.detail.value)
      if (idx < this.persons.length) {
        const target = this.persons[idx]
        if (target.id !== this.currentPerson.id) {
          db.setDefaultPerson(target.id).then(() => this.load())
        }
      } else {
        // 最后一个选项：添加用户
        uni.navigateTo({ url: '/pages/edit-form/index?entityType=person' })
      }
    },
    async doSearch() {
      const k = (this.keyword || '').trim()
      if (!k) {
        if (this._searchTimer) { clearTimeout(this._searchTimer); this._searchTimer = null }
        this.searching = false
        return
      }
      // debounce 300ms，避免每输一个字就查一次数据库
      if (this._searchTimer) clearTimeout(this._searchTimer)
      this._searchTimer = setTimeout(async () => {
        this.searching = true
        this.results = await db.searchEvents(k)
        this._searchTimer = null
      }, 300)
    },
    personName(id) {
      return this.nameMap[id] || ''
    },
    timelineName(id) {
      return this.tlMap[id] || ''
    },
    openEvent(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    },
    openMain() {
      if (this.mainTimeline.id) {
        uni.navigateTo({ url: `/pages/timeline/index?timelineId=${this.mainTimeline.id}` })
      }
    },
    addTimeline() {
      if (!this.currentPerson.id) return
      uni.navigateTo({ url: `/pages/edit-form/index?entityType=timeline&personId=${this.currentPerson.id}` })
    },
    openTimeline(id) {
      uni.navigateTo({ url: `/pages/timeline/index?timelineId=${id}` })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; padding-top: var(--status-bar-height); }

/* 顶部 hero：问候语 + 用户切换，参考主流首页个人区 */
.hero { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 4rpx 24rpx; }
.greet-name { font-size: 44rpx; font-weight: 800; color: var(--text-main); }
.greet-sub { font-size: 24rpx; color: var(--text-grey); margin-top: 8rpx; }
.dropdown-label { display: flex; align-items: center; background: var(--primary-soft); color: var(--primary-dark); border-radius: 32rpx; padding: 8rpx 20rpx 8rpx 8rpx; font-size: 26rpx; }
.avatar-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: var(--primary); color: var(--primary-contrast); display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; }
.dropdown-name { margin-left: 12rpx; }
.dropdown-arrow { margin-left: 8rpx; font-size: 22rpx; }

/* 搜索：带图标圆角，参考主流搜索条 */
.search-bar { display: flex; align-items: center; background: var(--bg-card); border-radius: 40rpx; padding: 0 24rpx; box-shadow: var(--shadow-card); }
.search-icon { font-size: 26rpx; color: var(--text-grey); margin-right: 12rpx; }
.search-input { flex: 1; font-size: 28rpx; height: 76rpx; min-height: 76rpx; }

/* 搜索结果 */
.result-list { margin-top: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.result-item { background: var(--bg-card); border-radius: 16rpx; padding: 24rpx; box-shadow: var(--shadow-card); }
.r-title { font-size: 30rpx; font-weight: 600; }
.r-sub { font-size: 24rpx; color: var(--text-grey); margin-top: 6rpx; }
.r-desc { font-size: 26rpx; color: var(--text-sub); margin-top: 8rpx; }
.empty { text-align: center; color: var(--text-light); padding: 60rpx 0; }

/* 统计带：紧贴 hero 的三栏 dashboard，参考主流首页数字条 */
.stats-band { display: flex; margin-top: 24rpx; background: var(--bg-card); border-radius: 20rpx; box-shadow: var(--shadow-card); overflow: hidden; }
.stat-cell { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 28rpx 0; }
.stat-cell:not(:last-child) { border-right: 2rpx solid var(--border); }
.stat-num { font-size: 44rpx; font-weight: 800; color: var(--primary); }
.stat-label { font-size: 24rpx; color: var(--text-grey); margin-top: 6rpx; }

/* 时光机：历史上同月同日的事件轮播，每日有新内容 */
.time-machine { margin-top: 24rpx; background: var(--bg-card); border-radius: 20rpx; padding: 24rpx; box-shadow: var(--shadow-card); }
.tm-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.tm-title { font-size: 30rpx; font-weight: 700; color: var(--text-main); }
.tm-date { font-size: 22rpx; color: var(--text-grey); }
.tm-swiper { height: 180rpx; }
.tm-card { display: flex; flex-direction: column; justify-content: center; height: 100%; padding: 0 8rpx; }
.tm-year { font-size: 24rpx; color: var(--primary); font-weight: 600; }
.tm-event { font-size: 32rpx; font-weight: 700; color: var(--text-main); margin-top: 8rpx; }
.tm-tl { font-size: 22rpx; color: var(--text-grey); margin-top: 6rpx; }
.time-machine.tm-empty { padding: 28rpx 24rpx; display: flex; justify-content: center; }
.tm-empty-text { font-size: 24rpx; color: var(--text-grey); }

/* 本月活动：主色进度条，让首页有数据脉动 */
.month-bar { margin-top: 24rpx; background: var(--bg-card); border-radius: 20rpx; padding: 24rpx; box-shadow: var(--shadow-card); }
.mb-text { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.mb-label { font-size: 24rpx; color: var(--text-sub); }
.mb-count { font-size: 26rpx; color: var(--primary); font-weight: 600; }
.mb-track { width: 100%; height: 16rpx; background: var(--bg-muted); border-radius: 8rpx; overflow: hidden; }
.mb-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-dark)); border-radius: 8rpx; transition: width .4s; }

/* 分区：左侧主色竖条 + 标题，更有节奏感 */
.section { margin-top: 40rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.title-wrap { display: flex; align-items: center; gap: 16rpx; }
.title-bar { width: 8rpx; height: 32rpx; border-radius: 4rpx; background: var(--primary); }
.section-title { font-size: 32rpx; font-weight: 700; color: var(--text-main); }
.section-add { color: var(--primary); font-size: 26rpx; padding: 8rpx 0 8rpx 24rpx; }

/* 主线卡：顶部主色渐变封面条 + 主色淡描边 + 右箭头 */
.main-card { position: relative; display: flex; align-items: center; background: var(--bg-card); border-radius: 20rpx; padding: 32rpx; box-shadow: var(--shadow-card); border: 2rpx solid var(--primary-soft); overflow: hidden; }
.main-cover { position: absolute; top: 0; left: 0; right: 0; height: 16rpx; background: linear-gradient(90deg, var(--primary), var(--primary-dark)); }
.main-info { flex: 1; }
.main-name { font-size: 34rpx; font-weight: 700; }
.main-badge { display: inline-block; background: var(--primary); color: var(--primary-contrast); font-size: 20rpx; padding: 2rpx 16rpx; border-radius: 12rpx; margin-left: 12rpx; vertical-align: middle; }
.main-meta { font-size: 24rpx; color: var(--text-grey); margin-top: 10rpx; }
.main-warn { color: var(--danger); }
.arrow { font-size: 40rpx; color: var(--text-light); }

/* 其他时间线卡：左缩略图色块 + 标题 + 元信息 + 右箭头 */
.timeline-list { display: flex; flex-direction: column; gap: 16rpx; }
.timeline-card { display: flex; align-items: center; background: var(--bg-card); border-radius: 20rpx; padding: 20rpx 24rpx; box-shadow: var(--shadow-card); }
.tl-thumb { width: 72rpx; height: 72rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; font-weight: 700; color: #fff; flex-shrink: 0; }
.tl-body { flex: 1; margin-left: 20rpx; }
.tl-name { font-size: 30rpx; font-weight: 600; }
.tl-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.tl-cat { background: var(--primary-soft); color: var(--primary-dark); font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 12rpx; }
.tl-count { font-size: 24rpx; color: var(--text-grey); }
.tl-arrow { font-size: 36rpx; color: var(--text-light); margin-left: 12rpx; }
/* 五色循环点缀，让列表更有层次（不走主题色，避免与主色冲突） */
.tl-thumb.tone-0 { background: #f55; }
.tl-thumb.tone-1 { background: #f90; }
.tl-thumb.tone-2 { background: #3c9; }
.tl-thumb.tone-3 { background: #39c; }
.tl-thumb.tone-4 { background: #96c; }

/* 空状态：居中引导 + 主色按钮 */
.empty-state { background: var(--bg-card); border-radius: 20rpx; padding: 56rpx 32rpx; display: flex; flex-direction: column; align-items: center; box-shadow: var(--shadow-card); }
.empty-icon { font-size: 80rpx; }
.empty-title { font-size: 30rpx; font-weight: 600; margin-top: 20rpx; }
.empty-desc { font-size: 24rpx; color: var(--text-grey); margin-top: 10rpx; }
.empty-btn { margin-top: 32rpx; background: var(--primary); color: var(--primary-contrast); font-size: 30rpx; border-radius: 48rpx; border: none; padding: 0 48rpx; height: 80rpx; line-height: 80rpx; }
.empty-btn::after { border: none; }
</style>
