import { describe, it, expect } from 'vitest'
import { buildTheme, mixColor, hexToHsv, hsvToHex, PRESET_COLORS, DEFAULT_PRIMARY } from '../src/utils/theme'

describe('theme', () => {
  it('mixColor 按比例混合颜色', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixColor('#ffffff', '#000000', 0)).toBe('#ffffff')
    expect(mixColor('#ffffff', '#000000', 1)).toBe('#000000')
    expect(mixColor('#4a6cf7', '#ffffff', 1)).toBe('#ffffff')
  })

  it('支持 3 位短十六进制输入', () => {
    expect(mixColor('#fff', '#000000', 0)).toBe('#ffffff')
  })

  it('buildTheme 生成完整主题色板', () => {
    const t = buildTheme('#4a6cf7')
    expect(t.primary).toBe('#4a6cf7')
    expect(t.primaryContrast).toBe('#ffffff')
    expect(t.primaryDark).toMatch(/^#[0-9a-f]{6}$/)
    expect(t.primarySoft).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('primarySoft 更浅、primaryDark 更深', () => {
    const t = buildTheme('#4a6cf7')
    const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const soft = parse(t.primarySoft)
    const dark = parse(t.primaryDark)
    const base = parse(t.primary)
    for (let i = 0; i < 3; i++) {
      expect(soft[i]).toBeGreaterThanOrEqual(base[i])
      expect(dark[i]).toBeLessThanOrEqual(base[i])
    }
    expect(t.primaryDark).not.toBe(t.primary)
    expect(t.primarySoft).not.toBe(t.primary)
  })

  it('预设固定颜色为 11 色且唯一合法', () => {
    expect(PRESET_COLORS.length).toBe(11)
    expect(new Set(PRESET_COLORS).size).toBe(PRESET_COLORS.length)
    for (const c of PRESET_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    }
    expect(DEFAULT_PRIMARY).toBe(PRESET_COLORS[0])
  })

  it('hexToHsv 基础色转换', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 })
    expect(hexToHsv('#00ff00').h).toBe(120)
    expect(hexToHsv('#0000ff').h).toBe(240)
    expect(hexToHsv('#000000').v).toBe(0)
    expect(hexToHsv('#ffffff').s).toBe(0)
  })

  it('hsvToHex 边界色', () => {
    expect(hsvToHex(0, 1, 1)).toBe('#ff0000')
    expect(hsvToHex(120, 1, 1)).toBe('#00ff00')
    expect(hsvToHex(240, 1, 1)).toBe('#0000ff')
    expect(hsvToHex(0, 0, 0)).toBe('#000000')
    expect(hsvToHex(0, 0, 1)).toBe('#ffffff')
    expect(hsvToHex(360, 1, 1)).toBe('#ff0000')
  })

  it('hexToHsv 与 hsvToHex 往返误差不超过 1（含预设主题色）', () => {
    const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const samples = ['#4a6cf7', '#007aff', '#07c160', '#00b578', '#ff9500', '#ff4d8d', '#7c4dff', '#e54d42', '#3a56d4', '#eef1ff']
    for (const hex of samples) {
      const { h, s, v } = hexToHsv(hex)
      const back = hsvToHex(h, s, v)
      const a = parse(hex)
      const b = parse(back)
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(1)
      }
    }
  })
})
