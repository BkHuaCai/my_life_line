import { getThemePrimary, buildTheme } from './theme'

// 主题 CSS 变量 mixin：把主题色通过 Vue 响应式 :style 绑定到页面根节点。
// uni-app App 部分运行时直接写 document 的 CSS 变量不生效（uni.* 存储/样式 API 缺失、
// 文档写入不落地），而 Vue 渲染器的 :style 绑定更新可靠，故统一用此 mixin 兜底。
export default {
  data() {
    return { themePrimary: getThemePrimary() }
  },
  computed: {
    themeVars() {
      const t = buildTheme(this.themePrimary)
      return {
        '--primary': t.primary,
        '--primary-dark': t.primaryDark,
        '--primary-soft': t.primarySoft,
        '--primary-contrast': t.primaryContrast
      }
    }
  },
  onShow() {
    // 每次进入页面刷新主题（主题可能在[我的]页被修改）
    this.themePrimary = getThemePrimary()
  }
}
