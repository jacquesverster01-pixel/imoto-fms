export function getTaskDepartments(task, prefixMappings) {
  if (Array.isArray(task.departments) && task.departments.length > 0) {
    return [...task.departments]
  }
  const components = task.components || []
  if (components.length === 0) return []
  const depts = new Set()
  for (const comp of components) {
    const code = comp.itemCode || ''
    for (const { prefix, department } of prefixMappings) {
      if (code.toUpperCase().startsWith(prefix.toUpperCase())) {
        depts.add(department)
        break
      }
    }
  }
  return [...depts]
}

export function taskOverlapsWeek(task, weekStart, weekEnd) {
  if (!task.startDate || !task.endDate) return false
  const start = new Date(task.startDate)
  const end = new Date(task.endDate)
  return start <= weekEnd && end >= weekStart
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekEnd(weekStart) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function getDisplayStatus(task) {
  if (task?.done === true || task?.kanbanStatus === 'done') return 'done'
  if (task?.kanbanStatus === 'inprogress' || task?.kanbanStatus === 'qc') return 'in-progress'
  return 'todo'
}
