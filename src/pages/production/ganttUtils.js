
// Layout primitives — duplicated in src/pages/production/gantt/* files
// for component locality. If you tune either of these, update all
// gantt/* files together. Stable since the April 2026 verification.
export const ROW_H = 32
export const HDR_H = 48

function flattenAll(tasks) {
  const out = []
  const walk = n => { out.push(n); (n.children || []).forEach(walk) }
  tasks.forEach(walk)
  return out
}

export function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function skipWeekend(date) {
  const d = new Date(date)
  if (d.getDay() === 6) d.setDate(d.getDate() + 2)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  return d
}

export function addWorkingDays(date, n) {
  let d = new Date(date)
  let added = 0
  const step   = n >= 0 ? 1 : -1
  const target = Math.abs(n)
  while (added < target) {
    d.setDate(d.getDate() + step)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d
}

export function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isToday(date) {
  const t = new Date()
  return date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
}

export function getChartBounds(tasks) {
  const starts = tasks.map(t => parseDate(t.startDate)).filter(Boolean)
  const ends   = tasks.map(t => parseDate(t.endDate)).filter(Boolean)
  const today  = new Date()
  today.setHours(0, 0, 0, 0)

  let minDate = starts.length ? new Date(Math.min(...starts)) : today
  let maxDate = ends.length   ? new Date(Math.max(...ends))   : addDays(today, 14)

  if (today < minDate) minDate = today
  if (today > maxDate) maxDate = today

  minDate = addDays(minDate, -3)

  const floor24 = new Date(minDate.getFullYear(), minDate.getMonth() + 24, minDate.getDate())
  if (maxDate < floor24) maxDate = floor24

  maxDate = addDays(maxDate, 5)

  const totalDays = Math.round((maxDate - minDate) / 86400000) + 1
  return { minDate, maxDate, totalDays }
}

export function dateToLeft(date, minDate, totalDays) {
  const dayIndex = Math.round((date - minDate) / 86400000)
  return `${(dayIndex / totalDays) * 100}%`
}

export function dateToWidth(startDate, endDate, totalDays) {
  const days = Math.round((endDate - startDate) / 86400000) + 1
  return `${(days / totalDays) * 100}%`
}

export function cascadeTasksForward(tasks, changedIdx) {
  const updated = tasks.map(t => ({ ...t }))
  const shiftedIds = new Set([updated[changedIdx].id])
  for (let i = changedIdx + 1; i < updated.length; i++) {
    const curr   = updated[i]
    const linked = (curr.dependsOn || []).filter(d => shiftedIds.has(d))
    if (linked.length === 0) continue
    let latestEnd = null
    linked.forEach(d => {
      const dep = updated.find(t => t.id === d)
      if (!dep) return
      const e = parseDate(dep.endDate)
      if (e && (!latestEnd || e > latestEnd)) latestEnd = e
    })
    if (latestEnd) {
      const currStart = parseDate(curr.startDate)
      if (currStart && currStart <= latestEnd) {
        const duration = curr.endDate && curr.startDate
          ? Math.round((parseDate(curr.endDate) - parseDate(curr.startDate)) / 86400000) : 0
        const newStart = addDays(latestEnd, 1)
        updated[i].startDate = toDateStr(newStart)
        updated[i].endDate   = toDateStr(addDays(newStart, duration))
      }
    }
    shiftedIds.add(curr.id)
  }
  return updated
}

export function buildDayColumns(minDate, totalDays) {
  return Array.from({ length: totalDays }, (_, i) => addDays(minDate, i))
}

export function formatDayLabel(date) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${days[date.getDay()]} ${date.getDate()}`
}

export function formatMonthLabel(date) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

export function buildMonthGroups(dayColumns) {
  const groups = []
  for (const d of dayColumns) {
    const label = formatMonthLabel(d)
    if (groups.length && groups[groups.length - 1].label === label) groups[groups.length - 1].count++
    else groups.push({ label, count: 1 })
  }
  return groups
}

export function deriveParentBounds(task) {
  if (!task.children || task.children.length === 0) return task
  const resolvedChildren = task.children.map(c => deriveParentBounds(c))
  const starts = resolvedChildren.map(c => parseDate(c.startDate)).filter(Boolean)
  const ends   = resolvedChildren.map(c => parseDate(c.endDate)).filter(Boolean)
  const pctAvg = Math.round(resolvedChildren.reduce((a, c) => a + (c.pct || 0), 0) / resolvedChildren.length)
  return {
    ...task,
    startDate: starts.length ? toDateStr(new Date(Math.min(...starts))) : task.startDate,
    endDate:   ends.length   ? toDateStr(new Date(Math.max(...ends)))   : task.endDate,
    pct: pctAvg,
    done: pctAvg === 100,
    children: resolvedChildren
  }
}

export function flattenTasksForDisplay(tasks) {
  const rows = []
  function walk(node, depth, parentId) {
    const hasChildren = node.children && node.children.length > 0
    const derived = hasChildren ? deriveParentBounds(node) : node
    rows.push({ task: derived, isParent: hasChildren, isSubTask: depth > 0, parentId, depth })
    if (hasChildren) {
      derived.children.forEach(child => walk(child, depth + 1, node.id))
    }
  }
  tasks.forEach(task => walk(task, 0, null))
  return rows
}

export function collectAllDescendants(tasks) {
  const result = []
  function walk(node) {
    ;(node.children || []).forEach(c => { result.push(c); walk(c) })
  }
  tasks.forEach(walk)
  return result
}

export function collectAllSubTasks(tasks) { return collectAllDescendants(tasks) }

export function getEarliestAllowedStart(taskId, dependsOn, allTasks, allDescendants) {
  if (!dependsOn || dependsOn.length === 0) return null
  const union = [...allTasks, ...(allDescendants || [])]
  let latest = null
  dependsOn.forEach(depId => {
    const dep = union.find(t => t.id === depId)
    if (!dep) return
    const depEnd = dep.children && dep.children.length > 0
      ? parseDate(deriveParentBounds(dep).endDate)
      : parseDate(dep.endDate)
    if (!depEnd) return
    const candidate = addDays(depEnd, 1)
    if (!latest || candidate > latest) latest = candidate
  })
  return latest
}

export function enforceDependencies(tasks) {
  const allDescendants = collectAllDescendants(tasks)
  function adjustNode(node) {
    const earliest = getEarliestAllowedStart(node.id, node.dependsOn, tasks, allDescendants)
    let adjusted = { ...node }
    if (earliest) {
      const nodeStart = parseDate(node.startDate)
      if (nodeStart && nodeStart < earliest) {
        const duration = node.startDate && node.endDate
          ? Math.round((parseDate(node.endDate) - parseDate(node.startDate)) / 86400000) : 0
        adjusted.startDate = toDateStr(earliest)
        adjusted.endDate   = toDateStr(addDays(earliest, duration))
      }
    }
    if (node.children && node.children.length > 0) {
      adjusted.children = node.children.map(c => adjustNode(c))
    }
    return adjusted
  }
  return tasks.map(t => adjustNode(t))
}

export function dependencyArrowPath(predLeft, predWidth, succLeft, predRowY, succRowY, colWidth) {
  const midY1 = predRowY + 10
  const midY2 = succRowY + 10
  const x1    = predLeft + predWidth
  const x2    = succLeft
  const midX  = x1 + Math.min(colWidth * 1.5, Math.max(8, (x2 - x1) / 2))
  return `M${x1},${midY1} L${midX},${midY1} L${midX},${midY2} L${x2},${midY2}`
}

export function isMilestone(task) {
  return task.milestone === true
}

export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export function buildZoomColumns(minDate, maxDate, zoom, zoomScale = 1) {
  const cols = []
  let cursor = new Date(minDate)
  cursor.setHours(0, 0, 0, 0)
  if (zoom === 'day') {
    while (cursor <= maxDate) {
      cols.push({ key: toDateStr(cursor), label: formatMonthLabel(cursor), subLabel: String(cursor.getDate()),
        startDate: new Date(cursor), endDate: new Date(cursor), widthPx: 28 * zoomScale,
        isWeekend: isWeekend(cursor), isToday: isToday(cursor) })
      cursor.setDate(cursor.getDate() + 1)
    }
  } else if (zoom === 'week') {
    const day = cursor.getDay()
    cursor.setDate(cursor.getDate() + (day === 0 ? -6 : 1 - day))
    while (cursor <= maxDate) {
      const weekEnd = addDays(cursor, 6)
      const wn = getISOWeek(cursor)
      const now = new Date()
      cols.push({ key: 'w' + wn + '-' + cursor.getFullYear(), label: formatMonthLabel(cursor),
        subLabel: 'W' + wn, startDate: new Date(cursor), endDate: new Date(weekEnd), widthPx: 120 * zoomScale,
        isWeekend: false, isToday: now >= cursor && now <= weekEnd })
      cursor = addDays(cursor, 7)
    }
  } else {
    cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    while (cursor <= maxDate) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      cols.push({ key: cursor.getFullYear() + '-' + cursor.getMonth(), label: String(cursor.getFullYear()),
        subLabel: MONTHS[cursor.getMonth()], startDate: new Date(cursor), endDate: new Date(monthEnd),
        widthPx: 48 * Math.ceil(monthEnd.getDate() / 7) * zoomScale })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }
  return cols
}

export function taskBarPosition(task, zoomCols) {
  if (!task.startDate || !task.endDate) return { left: 0, width: 0 }
  const start = parseDate(task.startDate)
  const end   = parseDate(task.endDate)
  let left = 0, width = 0, accumX = 0, started = false
  for (const col of zoomCols) {
    const overlap = start <= col.endDate && end >= col.startDate
    if (!started && overlap) { left = accumX; started = true }
    if (overlap) width += col.widthPx
    accumX += col.widthPx
  }
  return { left, width: Math.max(width, (zoomCols[0]?.widthPx || 14) / 2) }
}

export function getTodayScrollX(zoomCols) {
  const now = new Date()
  let x = 0
  for (const col of zoomCols) {
    if (now >= col.startDate && now <= col.endDate) return Math.max(0, x - 200)
    x += col.widthPx
  }
  return 0
}

export function wouldCreateCycle(tasks, allDescendants, predecessorId, dependentId) {
  // Returns true if adding predecessorId → dependentId would create a cycle.
  // Checks whether predecessorId already (transitively) depends on dependentId.
  const allItems = [...tasks, ...allDescendants]
  const visited = new Set()
  function canReach(currentId) {
    if (currentId === dependentId) return true
    if (visited.has(currentId)) return false
    visited.add(currentId)
    const task = allItems.find(t => t.id === currentId)
    return (task?.dependsOn || []).some(depId => canReach(depId))
  }
  return canReach(predecessorId)
}

export function getTaskBarColor(task, allTasks, allDescendants) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (task.done || task.pct === 100) return '#16a34a'
  if (task.dependsOn?.length) {
    const allItems = [...allTasks, ...allDescendants]
    const isBlocked = task.dependsOn.some(depId => {
      const dep = allItems.find(t => t.id === depId)
      return dep && !dep.done && (dep.pct || 0) < 100
    })
    if (isBlocked) return '#dc2626'
  }
  const end = parseDate(task.endDate)
  if (end && end < today) return '#d97706'
  return '#2563eb'
}

export function computeCriticalPath(tasks) {
  const all = flattenAll(tasks)
  const ef = {}
  all.forEach(t => { const e = parseDate(t.endDate); ef[t.id] = e ? e.getTime() : 0 })
  const projectEnd = Math.max(...Object.values(ef))
  const critical = new Set()
  all.forEach(t => { if (ef[t.id] === projectEnd) critical.add(t.id) })
  let changed = true
  while (changed) {
    changed = false
    all.forEach(t => { if (critical.has(t.id) && t.dependsOn) t.dependsOn.forEach(d => { if (!critical.has(d)) { critical.add(d); changed = true } }) })
  }
  return Array.from(critical)
}

export function pixelXToDate(px, colsWithLeft) {
  for (const col of colsWithLeft) {
    if (px >= col.left && px < col.left + col.widthPx) {
      const frac = (px - col.left) / col.widthPx
      const colMs = col.endDate - col.startDate
      return toDateStr(new Date(col.startDate.getTime() + frac * colMs))
    }
  }
  const last = colsWithLeft[colsWithLeft.length - 1]
  if (last) return toDateStr(new Date(last.endDate))
  return toDateStr(new Date())
}
