// SAST time helpers — UTC+2, no DST, hardcoded offset

// Format ISO timestamp as HH:MM in SAST
export function isoToHHMM(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  const h = String((d.getUTCHours() + 2) % 24).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// Extract YYYY-MM-DD date portion from an ISO timestamp, expressed in SAST (UTC+2)
export function dateLabel(isoStr) {
  if (!isoStr) return ''
  return new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// Hours between two ISO timestamps — returns raw number or null
export function calcHours(inIso, outIso) {
  if (!inIso || !outIso) return null
  const diff = (new Date(outIso) - new Date(inIso)) / 3600000
  return diff > 0 ? diff : null
}

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

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export function fmtDDMMM(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`
}

export function fmtHHMMSS(date) {
  const d = new Date(date.getTime() + 2 * 60 * 60 * 1000)
  const h = d.getUTCHours().toString().padStart(2, '0')
  const m = d.getUTCMinutes().toString().padStart(2, '0')
  const s = d.getUTCSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
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
