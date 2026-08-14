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
        <view class="name">{{ currentPerson.name || '请选择档案' }}</view>
        <view class="sub" v-if="currentPerson.birth_date">起始：{{ currentPerson.birth_date }}</view>
        <view class="sub" v-if="currentPerson.note">{{ currentPerson.note }}</view>
      </view>
      <view class="arrow">›</view>
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
import { serialize, importData } from '../../utils/export'
import { PRESET_COLORS, getThemePrimary, saveThemePrimary, applyTheme } from '../../utils/theme'
import ColorPicker from '../../components/color-picker.vue'

export default {
  components: { ColorPicker },
  data() {
    return {
      currentPerson: {},
      persons: [],
      timelineCounts: {},
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
      this.themePrimary = getThemePrimary()
      this.customSelected = !this.presetColors.includes(this.themePrimary)
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
    pickPreset(primary) {
      this.customSelected = false
      this.selectTheme(primary)
    },
    selectTheme(primary) {
      this.themePrimary = primary
      saveThemePrimary(primary)
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
        const fileName = `export_${Date.now()}.json`
        // #ifdef H5
        // H5 无原生文件系统，触发浏览器下载
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        uni.showModal({
          title: '导出成功',
          content: `数据已导出：${fileName}\n\n请到浏览器下载目录中查找该文件。`,
          showCancel: false
        })
        // #endif
        // #ifndef H5
        // App 使用 uni.writeFile（基于 plus.io），不能用小程序专属的 getFileSystemManager
        const filePath = `_doc/${fileName}`
        await new Promise((resolve, reject) => {
          uni.writeFile({
            filePath,
            data: jsonStr,
            encoding: 'utf8',
            success: () => resolve(),
            fail: (err) => reject(err)
          })
        })
        uni.showModal({
          title: '导出成功',
          content: `数据已导出到：${filePath}\n\n请在文件管理中找到该文件并备份。`,
          showCancel: false
        })
        // #endif
      } catch (e) {
        console.error('export fail', e)
        uni.showToast({ title: '导出失败', icon: 'none' })
      }
    },
    doImport() {
      uni.chooseFile({
        count: 1,
        extension: ['json'],
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0]
          if (!file || !file.path) return
          uni.showLoading({ title: '导入中' })
          const fs = uni.getFileSystemManager()
          fs.readFile({
            filePath: file.path,
            encoding: 'utf8',
            success: async (r) => {
              try {
                const data = JSON.parse(r.data)
                await importData(db, data)
                uni.hideLoading()
                uni.showToast({ title: '导入成功', icon: 'success' })
                this.load()
              } catch (e) {
                console.error('import fail', e)
                uni.hideLoading()
                uni.showToast({ title: '导入失败，文件格式不正确', icon: 'none' })
              }
            },
            fail: () => {
              uni.hideLoading()
              uni.showToast({ title: '读取文件失败', icon: 'none' })
            }
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.header-title { font-size: 44rpx; font-weight: 800; }
.settings-btn { font-size: 40rpx; color: var(--text-sub); padding: 8rpx 16rpx; }

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