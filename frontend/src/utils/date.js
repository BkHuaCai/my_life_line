// 日期统一存 ISO 字符串 "YYYY-MM-DD"；展示时截取年月。
export function formatDate(iso) {
  if (!iso) return ''
  return iso.slice(0, 7).replace('-', '.')
}

export function formatEventDate(event) {
  if (event.date_type === 'range') {
    const start = formatDate(event.date_start)
    const end = event.date_end ? formatDate(event.date_end) : '至今'
    return `${start} ~ ${end}`
  }
  return formatDate(event.date_point)
}

// 排序用：时间点取 date_point，时间段取 date_start；空串排最前。
export function effectiveDate(event) {
  if (event.date_type === 'range') return event.date_start || ''
  return event.date_point || ''
}
