/**
 * 主题系统：默认主流配色 + 自定义主色，运行时通过 CSS 变量应用。
 *
 * - buildTheme / mixColor 为纯函数，可单元测试（Node 环境）
 * - applyTheme 将主色写入根元素 CSS 变量（覆盖 App.vue 中的默认值），
 *   并同步原生层 tabBar 选中色
 * - 用户选择持久化在本地 storage（键：app_theme），仅存主色值
 */

export const STORAGE_KEY = 'app_theme'

// 预设主题（软件主流配色）
export const PRESET_THEMES = [
  { id: 'indigo', name: '靛蓝', primary: '#4a6cf7' },
  { id: 'blue', name: '天蓝', primary: '#007aff' },
  { id: 'green', name: '翠绿', primary: '#07c160' },
  { id: 'teal', name: '青碧', primary: '#00b578' },
  { id: 'orange', name: '活力橙', primary: '#ff9500' },
  { id: 'pink', name: '浪漫粉', primary: '#ff4d8d' },
  { id: 'purple', name: '紫罗兰', primary: '#7c4dff' },
  { id: 'red', name: '炽红', primary: '#e54d42' }
]

// 自定义色板：可自由选择的主色
export const CUSTOM_COLORS = [
  '#4a6cf7', '#007aff', '#1677ff', '#10aeff',
  '#00b578', '#07c160', '#52c41a', '#ff9500',
  '#ff3b30', '#ff2d55', '#ff4d8d', '#7c4dff'
]

export const DEFAULT_PRIMARY = PRESET_THEMES[0].primary

function hexToRgb(hex) {
  const h = (hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (full.length !== 6) return [0, 0, 0]
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

/**
 * 将 hex 颜色向 targetHex 方向混合 ratio（0~1），返回 #rrggbb。
 * @param {string} hex 基准颜色
 * @param {string} targetHex 目标颜色（如 #ffffff 变浅、#000000 变深）
 * @param {number} ratio 0 保持原色，1 完全变为目标色
 */
export function mixColor(hex, targetHex, ratio) {
  const from = hexToRgb(hex)
  const to = hexToRgb(targetHex)
  const rgb = from.map((v, i) => Math.round(v + (to[i] - v) * ratio))
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')
}

/**
 * 由主色推导完整主题色板：
 * primaryDark 用于强调文字/按下态，primarySoft 用于浅色标签底。
 */
export function buildTheme(primary) {
  return {
    primary,
    primaryDark: mixColor(primary, '#000000', 0.18),
    primarySoft: mixColor(primary, '#ffffff', 0.9),
    primaryContrast: '#ffffff'
  }
}

export function getThemePrimary() {
  if (typeof uni === 'undefined') return DEFAULT_PRIMARY
  try {
    const v = uni.getStorageSync(STORAGE_KEY)
    return typeof v === 'string' && v ? v : DEFAULT_PRIMARY
  } catch (e) {
    return DEFAULT_PRIMARY
  }
}

export function saveThemePrimary(primary) {
  if (typeof uni !== 'undefined') {
    try {
      uni.setStorageSync(STORAGE_KEY, primary)
    } catch (e) {
      // 存储失败不阻塞界面应用
    }
  }
  applyTheme(primary)
}

export function applyTheme(primary) {
  const theme = buildTheme(primary)
  // App(webview)/H5：写根元素 CSS 变量，覆盖 page 上的默认值
  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement
    root.style.setProperty('--primary', theme.primary)
    root.style.setProperty('--primary-dark', theme.primaryDark)
    root.style.setProperty('--primary-soft', theme.primarySoft)
    root.style.setProperty('--primary-contrast', theme.primaryContrast)
  }
  // 原生层 tabBar 选中色
  if (typeof uni !== 'undefined' && uni.setTabBarStyle) {
    try {
      uni.setTabBarStyle({ selectedColor: primary })
    } catch (e) {
      // 忽略不支持的环境
    }
  }
}
