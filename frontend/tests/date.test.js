import { describe, it, expect } from 'vitest'
import { formatEventDate, effectiveDate, formatDate } from '../src/utils/date'

describe('formatDate', () => {
  it('把 ISO 日期格式化为 2019.06', () => {
    expect(formatDate('2019-06-30')).toBe('2019.06')
  })
  it('空值返回空串', () => {
    expect(formatDate(null)).toBe('')
  })
})

describe('formatEventDate', () => {
  it('时间点事件显示单日期', () => {
    expect(formatEventDate({ date_type: 'point', date_point: '2020-01-05' })).toBe('2020.01')
  })
  it('时间段事件显示起止', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2015-09-01', date_end: '2019-06-30' })).toBe('2015.09 ~ 2019.06')
  })
  it('时间段无结束日期显示"至今"', () => {
    expect(formatEventDate({ date_type: 'range', date_start: '2019-08-01', date_end: null })).toBe('2019.08 ~ 至今')
  })
})

describe('effectiveDate', () => {
  it('时间点取 date_point，时间段取 date_start，用于排序', () => {
    expect(effectiveDate({ date_type: 'point', date_point: '2020-01-05' })).toBe('2020-01-05')
    expect(effectiveDate({ date_type: 'range', date_start: '2015-09-01' })).toBe('2015-09-01')
  })
  it('缺失日期时返回空串（排最前）', () => {
    expect(effectiveDate({ date_type: 'point' })).toBe('')
  })
})
