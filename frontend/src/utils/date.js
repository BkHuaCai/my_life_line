// 日期统一存 "YYYY-MM-DD"，可附带可选时间部分 " HH" / " HH:mm" / " HH:mm:ss"（选了才存、才展示）。
// 排序时直接按字符串比较：前缀短的日期在前，可选时间不影响同日排序。

// 按年月展示（照片墙分组用）。
export function formatDate(iso) {
  if (!iso) return ''
  return iso.slice(0, 7).replace('-', '.')
}

// 展示完整日期：返回存储原样（仅日期，或带可选时/分/秒）。
export function formatFullDate(iso) {
  if (!iso) return ''
  return iso
}

// 解析存储日期 → { date, time, precision }；precision: 'none' | 'hour' | 'minute' | 'second'
export function parseEventDate(iso) {
  if (!iso) return { date: '', time: '', precision: 'none' }
  const [date, time] = iso.split(' ')
  if (!time) return { date, time: '', precision: 'none' }
  const parts = time.split(':')
  if (parts.length === 1) return { date, time, precision: 'hour' }
  if (parts.length === 2) return { date, time, precision: 'minute' }
  return { date, time, precision: 'second' }
}

// 按精度拼接存储字符串；未选的时/分/秒不出现。
export function buildEventDate(date, precision, hour, minute, second) {
  if (!date) return ''
  const hh = String(hour == null ? 0 : hour).padStart(2, '0')
  if (precision === 'hour') return `${date} ${hh}`
  const mm = String(minute == null ? 0 : minute).padStart(2, '0')
  if (precision === 'minute') return `${date} ${hh}:${mm}`
  const ss = String(second == null ? 0 : second).padStart(2, '0')
  if (precision === 'second') return `${date} ${hh}:${mm}:${ss}`
  return date
}

// 当前时刻（用于「当前时间」按钮回填日期与时间）；时分秒始终给出，
// 展示时由时间精度控制渲染哪些，存储时 buildEventDate 按精度取舍。
export function nowParts() {
  const d = new Date()
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds()
  }
}

export function formatEventDate(event) {
  if (event.date_type === 'range') {
    const start = formatFullDate(event.date_start)
    const end = event.date_end ? formatFullDate(event.date_end) : '至今'
    return `${start} ~ ${end}`
  }
  return formatFullDate(event.date_point)
}

// 排序用：时间点取 date_point，时间段取 date_start；空串排最前。
export function effectiveDate(event) {
  if (event.date_type === 'range') return event.date_start || ''
  return event.date_point || ''
}
