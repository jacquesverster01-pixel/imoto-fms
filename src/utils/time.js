// SAST time helpers — UTC+2, no DST, hardcoded offset

export function nowSAST() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000)
}

export function todayStr() {
  return nowSAST().toISOString().slice(0, 10)
}

export function monthStr() {
  return nowSAST().toISOString().slice(0, 7)
}

export function fmtTime(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000)
  const h = d.getUTCHours().toString().padStart(2, '0')
  const m = d.getUTCMinutes().toString().padStart(2, '0')
  return h + ':' + m
}

export function fmtDateShort(isoStr) {
  if (!isoStr) return ''
  return new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function isLate(timestamp) {
  if (!timestamp) return false
  const d = new Date(new Date(timestamp).getTime() + 2 * 60 * 60 * 1000)
  return d.getUTCHours() > 8 || (d.getUTCHours() === 8 && d.getUTCMinutes() > 0)
}

export function daysAgoStr(n) {
  return new Date(nowSAST().getTime() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function todaySAST() {
  return todayStr()
}

export function relativeTime(isoStr) {
  if (!isoStr) return ''
  const diffMs = nowSAST().getTime() - new Date(isoStr).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)  return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24)  return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}
