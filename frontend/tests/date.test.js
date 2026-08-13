import { describe, it, expect } from 'vitest'
import { formatEventDate, effectiveDate, formatDate, formatFullDate, parseEventDate, buildEventDate } from '../src/utils/date'

describe('formatDate', () => {
  it('按年月格式化用于照片墙分组', () => {
    expect(formatDate('2019-06-30')).toBe('2019.06')
    expect(formatDate('2019-06-30 14:30')).toBe('2019.06')
  })
  it('空值返回空串', () => {
    expect(formatDate(null)).toBe('')
  })
})

describe('formatFullDate', () => {
  it('仅日期原样返回', () => {
    expect(formatFullDate('2019-06-30')).toBe('2019-06-30')
  })
  it('带可选时间原样返回（选了才展示）', () => {
    expect(formatFullDate('2019-06-30 14')).toBe('2019-06-30 14')
    expect(formatFullDate('2019-06-30 14:30')).toBe('2019-06-30 14:30')
    expect(formatFullDate('2019-06-30 14:30:05')).toBe('2019-06-30 14:30:05')
  })
  it('空值返回空串', () => {
    expect(formatFullDate(null)).toBe('')
  })
})

describe('parseEventDate', () => {
  it('解析不同时间精度', () => {
    expect(parseEventDate('2020-01-05')).toEqual({ date: '2020-01-05', time: '', precision: 'none' })
    expect(parseEventDate('2020-01-05 14')).toEqual({ date: '2020-01-05', time: '14', precision: 'hour' })
    expect(parseEventDate('2020-01-05 14:30')).toEqual({ date: '2020-01-05', time: '14:30', precision: 'minute' })
    expect(parseEventDate('2020-01-05 14:30:05')).toEqual({ date: '2020-01-05', time: '14:30:05', precision: 'second' })
  })
  it('空值返回 none', () => {
    expect(parseEventDate('')).toEqual({ date: '', time: '', precision: 'none' })
  })
})

describe('buildEventDate', () => {
  it('按精度拼接，未选的时分秒不出现', () => {
    expect(buildEventDate('2020-01-05', 'none')).toBe('2020-01-05')
    expect(buildEventDate('2020-01-05', 'hour', 14)).toBe('2020-01-05 14')
    expect(buildEventDate('2020-01-05', 'minute', 9, 5)).toBe('2020-01-05 09:05')
    expect(buildEventDate('2020-01-05', 'second', 9, 5, 3)).toBe('2020-01-05 09:05:03')
  })
  it('空日期返回空串', () => {
    expect(buildEventDate('', 'hour', 14)).toBe('')
  })
})

describe('formatEventDate', () => {
  it('时间点事件显示完整日期', () => {
    expect(formatEventDate({ date_type: 'point', date_point: '2020-01-05' })).toBe('2020-01-05')
  })
  it('时间点事件按所选精度展示时/分/秒', () => {
    expect(formatEventDate({ date_type: 'point', date_point: '2020-01-05 14' })).toBe('2020-01-05 14')
    expect(formatEventDate({ date_type: 'point', date_point: '2020-01-05 14:30:05' })).toBe('2020-01-05 14:30:05')
  })
  it('时间段事件显示起止', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2015-09-01', date_end: '2019-06-30' })).toBe('2015-09-01 ~ 2019-06-30')
  })
  it('时间段事件按精度展示开始/结束的时/分/秒', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2015-09-01 08', date_end: '2019-06-30 18' })).toBe('2015-09-01 08 ~ 2019-06-30 18')
    expect(formatEventDate({ date_type: 'range', date_start: '2015-09-01 08:30', date_end: '2019-06-30 18:45' })).toBe('2015-09-01 08:30 ~ 2019-06-30 18:45')
    expect(formatEventDate({ date_type: 'range', date_start: '2015-09-01 08:30:05', date_end: '2019-06-30 18:45:09' })).toBe('2015-09-01 08:30:05 ~ 2019-06-30 18:45:09')
  })
  it('时间段带结束时间、无结束日期显示"至今"', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2019-08-01 09:00', date_end: null })).toBe('2019-08-01 09:00 ~ 至今')
  })
  it('时间段无结束日期显示"至今"', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2019-08-01', date_end: null })).toBe('2019-08-01 ~ 至今')
  })
})

describe('effectiveDate', () => {
  it('时间点取 date_point，时间段取 date_start，用于排序', () => {
    expect(effectiveDate({ date_type: 'point', date_point: '2020-01-05' })).toBe('2020-01-05')
    expect(effectiveDate({ date_type: 'range', date_start: '2015-09-01' })).toBe('2015-09-01')
  })
  it('带时间部分时仍按字符串比较排序（同日先后、跨日顺序）', () => {
    const a = { date_type: 'point', date_point: '2020-01-05' }
    const b = { date_type: 'point', date_point: '2020-01-05 09:30' }
    const c = { date_type: 'point', date_point: '2020-01-05 14:30:05' }
    const d = { date_type: 'point', date_point: '2020-01-06' }
    expect(effectiveDate(a) < effectiveDate(b)).toBe(true)
    expect(effectiveDate(b) < effectiveDate(c)).toBe(true)
    expect(effectiveDate(c) < effectiveDate(d)).toBe(true)
  })
  it('缺失日期时返回空串（排最前）', () => {
    expect(effectiveDate({ date_type: 'point' })).toBe('')
  })
})
