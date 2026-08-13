/**
 * 主题系统：默认主流配色 + 自定义主色，运行时通过 CSS 变量应用。
 *
 * - buildTheme / mixColor 为纯函数，可单元测试（Node 环境）
 * - applyTheme 将主色写入根元素 CSS 变量（覆盖 App.vue 中的默认值），
 *   并同步原生层 tabBar 选中色
 * - 用户选择持久化在本地 storage（键：app_theme），仅存主色值
 */

export const STORAGE_KEY = 'app_theme'

// 预设固定颜色（软件主流配色），共 11 色；自定义颜色由[我的]页调色盘选择
export const PRESET_COLORS = [
  '#4a6cf7', '#007aff', '#10aeff', '#07c160', '#00b578',
  '#ffb400', '#ff9500', '#ff3b30', '#ff4d8d', '#7c4dff', '#333333'
]

export const DEFAULT_PRIMARY = PRESET_COLORS[0]

function hexToRgb(hex) {
  const h = (hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (full.length !== 6) return [0, 0, 0]
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

/**
 * 十六进制颜色转 HSV（色相 0~360，饱和度/明度 0~1）。
 * 供调色盘组件与 buildTheme 使用。
 */
export function hexToHsv(hex) {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const v = max / 255
  const d = max - min
  let s = max === 0 ? 0 : d / max
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, v }
}

/** HSV 转十六进制颜色（#rrggbb），h 可为任意实数（自动归一化到 0~360）。 */
export function hsvToHex(h, s, v) {
  h = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to255 = (n) => Math.round((n + m) * 255)
  return '#' + [r, g, b].map((n) => to255(n).toString(16).padStart(2, '0')).join('')
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
