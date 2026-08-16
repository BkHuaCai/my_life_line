<template>
  <view class="nav">
    <view class="nav-row">
      <view class="nav-back" @click="goBack">
        <text class="nav-arrow">‹</text>
      </view>
      <text class="nav-title">{{ title }}</text>
      <view class="nav-right">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script>
// 自定义导航栏：非 tab 页统一使用（页面需在 pages.json 配 navigationStyle: custom）。
// 左侧返回按钮 + 居中标题 + 右侧插槽；自动占用状态栏高度。
export default {
  name: 'NavBar',
  props: {
    title: { type: String, default: '' }
  },
  methods: {
    goBack() {
      uni.navigateBack({
        delta: 1,
        fail: () => uni.switchTab({ url: '/pages/index/index' })
      })
    }
  }
}
</script>

<style scoped>
.nav { position: sticky; top: 0; z-index: 20; background: var(--bg-page, #F6F7FB); padding-top: var(--status-bar-height); }
.nav-row { display: flex; align-items: center; height: 88rpx; padding: 0 16rpx; }
.nav-back { width: 72rpx; height: 72rpx; border-radius: 50%; background: var(--bg-card); box-shadow: var(--shadow-card); display: flex; align-items: center; justify-content: center; }
.nav-arrow { font-size: 44rpx; color: var(--text-main); line-height: 1; margin-top: -6rpx; }
.nav-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 700; color: var(--text-main); margin: 0 8rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.nav-right { width: 72rpx; display: flex; justify-content: flex-end; }
</style>
