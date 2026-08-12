<template>
  <view class="page">
    <view class="header">
      <view class="header-title">我的</view>
      <view class="header-actions">
        <view class="settings-btn" @click="showMoreMenu">⋮</view>
      </view>
    </view>

    <!-- 当前用户信息 -->
    <view class="current-user" @click="openCurrentPerson">
      <image v-if="currentPerson.avatar_path" class="avatar" :src="currentPerson.avatar_path" mode="aspectFill" />
      <view v-else class="avatar placeholder">{{ currentPerson.name ? currentPerson.name[0] : '?' }}</view>
      <view class="info">
        <view class="name">{{ currentPerson.name || '请选择用户' }}</view>
        <view class="sub" v-if="currentPerson.birth_date">出生：{{ currentPerson.birth_date }}</view>
        <view class="sub" v-if="currentPerson.note">{{ currentPerson.note }}</view>
      </view>
      <view class="arrow">›</view>
    </view>

    <!-- 我管理的人（点击进入详情，不再切换） -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">我管理的人</text>
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
        <view v-if="!persons.length" class="empty-tip">还没有用户，点击添加</view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索事件标题/描述" @confirm="doSearch" @input="doSearch" />
    </view>

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

    <!-- 功能操作 -->
    <view class="menu-list" v-if="!searching">
      <view class="menu-item" @click="goToPersonList">
        <text class="menu-icon">👥</text>
        <text class="menu-text">管理全部用户</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { serialize, importData } from '../../utils/export'

export default {
  data() {
    return {
      currentPerson: {},
      persons: [],
      timelineCounts: {},
      keyword: '',
      searching: false,
      results: [],
      nameMap: {},
      tlMap: {}
    }
  },
  async onShow() {
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
      const nameMap = {}
      const tlMap = {}
      for (const p of this.persons) {
        nameMap[p.id] = p.name
        const tls = await db.getTimelinesByPerson(p.id)
        counts[p.id] = tls.length
        for (const tl of tls) tlMap[tl.id] = tl.name
      }
      this.timelineCounts = counts
      this.nameMap = nameMap
      this.tlMap = tlMap
    },
    openPerson(id) {
      uni.navigateTo({ url: `/pages/person-detail/index?personId=${id}` })
    },
    openCurrentPerson() {
      if (this.currentPerson.id) {
        uni.navigateTo({ url: `/pages/person-detail/index?personId=${this.currentPerson.id}` })
      }
    },
    addPerson() {
      uni.navigateTo({ url: '/pages/edit-form/index?entityType=person' })
    },
    goToPersonList() {
      // 跳转到一个新的页面管理所有用户
      uni.showToast({ title: '开发中', icon: 'none' })
    },
    personName(id) {
      return this.nameMap[id] || ''
    },
    timelineName(id) {
      return this.tlMap[id] || ''
    },
    async doSearch() {
      const k = (this.keyword || '').trim()
      if (!k) {
        this.searching = false
        return
      }
      this.searching = true
      this.results = await db.searchEvents(k)
    },
    openEvent(id) {
      uni.navigateTo({ url: `/pages/event-detail/index?eventId=${id}` })
    },
    showMoreMenu() {
      uni.showActionSheet({
        itemList: ['导出数据', '导入数据'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.doExport()
          } else if (res.tapIndex === 1) {
            this.doImport()
          }
        }
      })
    },
    async doExport() {
      try {
        const data = await serialize(db)
        const jsonStr = JSON.stringify(data, null, 2)
        const filePath = `_doc/export_${Date.now()}.json`
        const fs = uni.getFileSystemManager()
        await fs.writeFile({
          filePath,
          data: jsonStr,
          encoding: 'utf8'
        })
        uni.showModal({
          title: '导出成功',
          content: `数据已导出到：${filePath}\n\n请在文件管理中找到该文件并备份。`,
          showCancel: false
        })
      } catch (e) {
        console.error('export fail', e)
        uni.showToast({ title: '导出失败', icon: 'none' })
      }
    },
    doImport() {
      uni.showModal({
        title: '导入数据',
        content: '请先在文件管理中找到之前导出的 JSON 文件，选择后导入。\n\n注意：导入会合并到现有数据中。',
        success: (res) => {
          if (res.confirm) {
            uni.showToast({ title: '导入功能开发中', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.header-title { font-size: 40rpx; font-weight: 700; }
.settings-btn { font-size: 40rpx; color: #666; padding: 8rpx 16rpx; }

/* 当前用户 */
.current-user { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 32rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; }
.avatar.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.info { flex: 1; margin-left: 24rpx; }
.name { font-size: 36rpx; font-weight: 700; }
.sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.arrow { font-size: 40rpx; color: #ccc; }

/* 用户列表 */
.section { margin-top: 32rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #666; }
.add-user { color: #ffb400; font-size: 26rpx; }
.user-list { display: flex; flex-direction: column; gap: 12rpx; }
.user-card { display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 20rpx; }
.user-card.active { border: 2rpx solid #ffb400; }
.avatar-sm { width: 64rpx; height: 64rpx; border-radius: 50%; }
.avatar-sm.placeholder { background: #ffb400; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.user-info { flex: 1; margin-left: 16rpx; }
.user-name { font-size: 28rpx; font-weight: 600; }
.me-badge { display: inline-block; background: #ffb400; color: #fff; font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 10rpx; margin-left: 10rpx; }
.user-meta { font-size: 22rpx; color: #999; }
.check-icon { color: #ffb400; font-weight: 600; font-size: 28rpx; }
.empty-tip { text-align: center; color: #bbb; padding: 24rpx; }

/* 搜索 */
.search-bar { margin-top: 32rpx; }
.search-input { background: #fff; border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 28rpx; height: 76rpx; min-height: 76rpx; }

/* 搜索结果 */
.result-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 16rpx; }
.result-item { background: #fff; border-radius: 16rpx; padding: 20rpx; }
.r-title { font-size: 30rpx; font-weight: 600; }
.r-sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }
.r-desc { font-size: 26rpx; color: #666; margin-top: 8rpx; }
.empty { text-align: center; color: #bbb; padding: 60rpx 0; }

/* 菜单 */
.menu-list { margin-top: 32rpx; display: flex; flex-direction: column; gap: 12rpx; }
.menu-item { display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 24rpx; }
.menu-icon { font-size: 36rpx; margin-right: 16rpx; }
.menu-text { flex: 1; font-size: 28rpx; }
.menu-arrow { color: #ccc; font-size: 32rpx; }
</style>