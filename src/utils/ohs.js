// OHS helper functions — pure utilities, no JSX, no hooks
import { todayStr } from './time'

export function ohsRiskColour(score) {
  if (score >= 15) return '#ef4444'
  if (score >= 9)  return '#f97316'
  if (score >= 4)  return '#eab308'
  return '#22c55e'
}

export function ohsSeverityLabel(v) {
  const labels = { 1: 'Negligible', 2: 'Minor', 3: 'Moderate', 4: 'Major', 5: 'Catastrophic' }
  return labels[v] || v
}

export function ohsLikelihoodLabel(v) {
  const labels = { 1: 'Rare', 2: 'Unlikely', 3: 'Possible', 4: 'Likely', 5: 'Almost Certain' }
  return labels[v] || v
}

export function countOhsActions(incident) {
  const actions = incident.correctiveActions || []
  return { total: actions.length, done: actions.filter(a => a.status === 'Done').length }
}

export function ohsStatusStyle(status) {
  const map = {
    'Open':        { background: '#fef3c7', color: '#92400e' },
    'Assigned':    { background: '#ede9fe', color: '#5b21b6' },
    'In Progress': { background: '#dbeafe', color: '#1e40af' },
    'Resolved':    { background: '#dcfce7', color: '#166534' },
    'Closed':      { background: '#f3f4f6', color: '#374151' },
  }
  return map[status] || { background: '#f3f4f6', color: '#374151' }
}

export function ohsActionStatusStyle(status) {
  const map = {
    'Open':        { background: '#fef3c7', color: '#92400e' },
    'In Progress': { background: '#dbeafe', color: '#1e40af' },
    'Done':        { background: '#dcfce7', color: '#166534' },
  }
  return map[status] || { background: '#f3f4f6', color: '#374151' }
}

export function ohsInspectionStatusStyle(status) {
  const map = {
    'Scheduled':   { background: '#ede9fe', color: '#5b21b6' },
    'In Progress': { background: '#dbeafe', color: '#1e40af' },
    'Complete':    { background: '#dcfce7', color: '#166534' },
    'Cancelled':   { background: '#f3f4f6', color: '#374151' },
  }
  return map[status] || { background: '#f3f4f6', color: '#374151' }
}

export function inspectionScorePercent(inspection) {
  if (inspection.maxScore === 0 || inspection.maxScore == null) return null
  return Math.round((inspection.score / inspection.maxScore) * 100)
}

export function inspectionScoreColour(pct) {
  if (pct >= 80) return '#22c55e'
  if (pct >= 60) return '#eab308'
  return '#ef4444'
}

export function ohsAlertSeverityStyle(severity) {
  if (severity === 'High') return { border: '#ef4444', bg: '#fef2f2', text: '#991b1b' }
  return { border: '#f97316', bg: '#fff7ed', text: '#9a3412' }
}

export function daysAgoStr(daysBack) {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000 - daysBack * 86400000)
  return d.toISOString().slice(0, 10)
}

export function riskRatingFromScore(score) {
  if (score >= 13) return 'Critical'
  if (score >= 7)  return 'High'
  if (score >= 4)  return 'Medium'
  return 'Low'
}

export function riskRatingColour(rating) {
  const map = {
    'Low':      { bg: '#dcfce7', text: '#166534' },
    'Medium':   { bg: '#fef3c7', text: '#92400e' },
    'High':     { bg: '#ffedd5', text: '#9a3412' },
    'Critical': { bg: '#fef2f2', text: '#991b1b' },
  }
  return map[rating] || map['Low']
}

export function heatmapFill(count) {
  if (count === 0) return '#f0fdf4'
  if (count === 1) return '#fef9c3'
  if (count === 2) return '#fed7aa'
  if (count <= 4)  return '#fca5a5'
  return '#f87171'
}

export function incidentsForZone(zone, ohsData) {
  return ohsData.filter(inc =>
    inc.location && inc.location.toLowerCase().includes(zone.name.toLowerCase())
  ).length
}

export function equipRiskLabel(level) {
  return { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' }[level] || 'Low'
}

export function equipRiskColour(level) {
  const map = {
    1: { bg: '#dcfce7', text: '#166534' },
    2: { bg: '#fef3c7', text: '#92400e' },
    3: { bg: '#ffedd5', text: '#9a3412' },
    4: { bg: '#fef2f2', text: '#991b1b' },
  }
  return map[level] || map[1]
}

// ─── Legal Appointments ───────────────────────────────────

export function appointmentStatusColour(expiryDate) {
  if (!expiryDate) return { bg: '#e8f5e9', text: '#2e7d32' } // permanent
  const today = todayStr()
  if (expiryDate < today) return { bg: '#ffebee', text: '#c62828' } // expired
  const msPerDay = 86400000
  const daysLeft = Math.round((Date.parse(expiryDate) - Date.parse(today)) / msPerDay)
  if (daysLeft <= 60) return { bg: '#fff8e1', text: '#f57f17' } // expiring soon
  return { bg: '#e8f5e9', text: '#2e7d32' } // ok
}

export function appointmentExpiryLabel(expiryDate) {
  if (!expiryDate) return 'No expiry'
  const today = todayStr()
  if (expiryDate < today) return `EXPIRED ${expiryDate}`
  return `Expires ${expiryDate}`
}

// ─── Service Intervals ────────────────────────────────────

export function serviceStatusColour(nextServiceDate) {
  if (!nextServiceDate) return { bg: '#f5f5f5', text: '#9e9e9e' } // no schedule
  const today = todayStr()
  if (nextServiceDate < today) return { bg: '#ffebee', text: '#c62828' } // overdue
  const msPerDay = 86400000
  const daysLeft = Math.round((Date.parse(nextServiceDate) - Date.parse(today)) / msPerDay)
  if (daysLeft <= 30) return { bg: '#fff8e1', text: '#f57f17' } // due soon
  return { bg: '#e8f5e9', text: '#2e7d32' } // ok
}

export function serviceStatusLabel(nextServiceDate) {
  if (!nextServiceDate) return 'No schedule set'
  const today = todayStr()
  if (nextServiceDate < today) return `OVERDUE since ${nextServiceDate}`
  return `Due ${nextServiceDate}`
}

export function calcNextServiceDate(lastServiceDate, intervalDays) {
  if (!lastServiceDate || !intervalDays) return null
  const d = new Date(lastServiceDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + Number(intervalDays))
  return d.toISOString().slice(0, 10)
}

// ─── Inspection Templates ─────────────────────────────────

export function assembleChecklist(templates, cadence) {
  const weekly    = (templates?.weekly    || []).filter(q => q.active !== false)
  const monthly   = (templates?.monthly   || []).filter(q => q.active !== false)
  const quarterly = (templates?.quarterly || []).filter(q => q.active !== false)
  if (cadence === 'weekly')    return weekly
  if (cadence === 'monthly')   return [...weekly, ...monthly]
  if (cadence === 'quarterly') return [...weekly, ...monthly, ...quarterly]
  return weekly
}

export function inspectionProgress(inspection) {
  const total    = (inspection?.questions || []).length
  const answered = (inspection?.questions || []).filter(q => q.response != null).length
  const percent  = total > 0 ? Math.round(answered / total * 100) : 0
  return { answered, total, percent }
}

export function inspectionStatusColour(status) {
  if (status === 'pending')     return { bg: '#e3f2fd', text: '#1565c0' }
  if (status === 'in-progress') return { bg: '#fff8e1', text: '#f57f17' }
  if (status === 'completed')   return { bg: '#e8f5e9', text: '#2e7d32' }
  return { bg: '#f5f5f5', text: '#9e9e9e' }
}

// ─── Risk Review ──────────────────────────────────────────

export function reviewStatusColour(status) {
  if (status === 'ok')       return { bg: '#dcfce7', text: '#166534' }
  if (status === 'due')      return { bg: '#fef3c7', text: '#92400e' }
  if (status === 'overdue')  return { bg: '#fef2f2', text: '#991b1b' }
  return { bg: '#f3f4f6', text: '#374151' }
}

export function reviewStatusLabel(status) {
  if (status === 'ok')       return 'Up to date'
  if (status === 'due')      return 'Review due'
  if (status === 'overdue')  return 'Overdue'
  return status
}

export function calcNextReviewDate(lastDate, intervalDays) {
  if (!lastDate || !intervalDays) return null
  const d = new Date(lastDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + Number(intervalDays))
  return d.toISOString().slice(0, 10)
}

export function isReviewOverdue(nextReviewDate) {
  if (!nextReviewDate) return false
  const today = new Date().toISOString().slice(0, 10)
  return nextReviewDate < today
}

// ─── Zone helpers ─────────────────────────────────────────

export function zoneIncidentCount(zoneId, incidents) {
  return (incidents || []).filter(inc => inc.zoneId === zoneId).length
}

export function equipmentForZone(zoneId, equipment) {
  return (equipment || []).filter(eq => eq.zoneId === zoneId)
}
