/**
 * 主题系统：默认主流配色 + 自定义主色，运行时通过 CSS 变量应用。
 *
 * - buildTheme / mixColor 为纯函数，可单元测试（Node 环境）
 * - applyTheme 将主色写入根元素 CSS 变量（覆盖 App.vue 中的默认值），
 *   并同步原生层 tabBar 选中色
 * - 用户选择持久化在本地 storage（键：app_theme），仅存主色值
 */

export const STORAGE_KEY = 'app_theme'
// 主题变量兜底 <style> 标签 id（内联变量不级联时的备用写入目标）
const THEME_STYLE_ID = '__theme_vars__'

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

// 存储读写：uni.* 在部分 App 运行时缺失（如特定 webview/修补包），退用 plus.storage 兜底
function storageGet(key) {
  try {
    if (typeof uni !== 'undefined' && typeof uni.getStorageSync === 'function') return uni.getStorageSync(key)
  } catch (e) {}
  try {
    if (typeof plus !== 'undefined' && plus.storage && plus.storage.getItem) return plus.storage.getItem(key)
  } catch (e) {}
  return ''
}
function storageSet(key, value) {
  try {
    if (typeof uni !== 'undefined' && typeof uni.setStorageSync === 'function') return uni.setStorageSync(key, value)
  } catch (e) {}
  try {
    if (typeof plus !== 'undefined' && plus.storage && plus.storage.setItem) return plus.storage.setItem(key, value)
  } catch (e) {}
}

export function getThemePrimary() {
  const v = storageGet(STORAGE_KEY)
  return typeof v === 'string' && v ? v : DEFAULT_PRIMARY
}

export function saveThemePrimary(primary) {
  storageSet(STORAGE_KEY, primary)
  applyTheme(primary)
}

export function applyTheme(primary) {
  const theme = buildTheme(primary)
  // App(webview)/H5：CSS 变量写到多个候选根元素。uni-app App 端 page 编译为 body，
  // 只写 documentElement 时部分环境内联变量不级联（主题切换不实时生效），
  // 因此同时写 html / body / uni-page 包装元素，保证任意环境都能生效。
  if (typeof document !== 'undefined') {
    const setVars = (el) => {
      if (!el) return
      el.style.setProperty('--primary', theme.primary)
      el.style.setProperty('--primary-dark', theme.primaryDark)
      el.style.setProperty('--primary-soft', theme.primarySoft)
      el.style.setProperty('--primary-contrast', theme.primaryContrast)
    }
    setVars(document.documentElement)
    setVars(document.body)
    document.querySelectorAll('uni-page, uni-app').forEach(setVars)
    // 兜底：注入 <style> 重新定义 :root 变量（部分环境内联变量不级联时仍可生效）
    try {
      let styleEl = document.getElementById(THEME_STYLE_ID)
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = THEME_STYLE_ID
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = `:root{--primary:${theme.primary};--primary-dark:${theme.primaryDark};--primary-soft:${theme.primarySoft};--primary-contrast:${theme.primaryContrast}}`
    } catch (e) {}
  }
  // 原生层 tabBar 选中色：H5/异步环境用 fail 回调吞错，避免未在 tabBar 页时报错冒泡
  if (typeof uni !== 'undefined' && uni.setTabBarStyle) {
    try {
      uni.setTabBarStyle({ selectedColor: primary, fail: () => {} })
    } catch (e) {
      // 同步抛错也吞掉（极少数老环境）
    }
  }
}
