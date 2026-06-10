import { getTaskDepartments, taskOverlapsWeek, flattenJobTasks } from '../../../utils/deptAllocation.js'

export function offsetDate(date, weeks) {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function buildLaneMap(tasks, prefixMappings, weekStart, weekEnd) {
  const map = {}
  for (const task of tasks) {
    const depts = getTaskDepartments(task, prefixMappings)
    const thisWeek = taskOverlapsWeek(task, weekStart, weekEnd)
    const enriched = { ...task, dueThisWeek: thisWeek }
    const lanes = depts.length > 0 ? depts : ['Unassigned']
    for (const dept of lanes) {
      if (!map[dept]) map[dept] = []
      map[dept].push(enriched)
    }
  }
  for (const dept of Object.keys(map)) {
    map[dept].sort((a, b) => {
      if (a.dueThisWeek !== b.dueThisWeek) return a.dueThisWeek ? -1 : 1
      return (a.jobPriority || 99) - (b.jobPriority || 99)
    })
  }
  return map
}

// Flatten jobs → undone tasks → dept lane map + ordered lane name list.
export function buildBoardLanes(jobs, prefixMappings, departments, weekStart, weekEnd) {
  const allTasks = flattenJobTasks(jobs)
  const undoneTasks = allTasks.filter(t => t.kanbanStatus !== 'done' && t.done !== true)
  const laneMap = buildLaneMap(undoneTasks, prefixMappings, weekStart, weekEnd)

  const deptNames = departments.map(d => d.name)
  const extraDepts = Object.keys(laneMap).filter(d => d !== 'Unassigned' && !deptNames.includes(d))
  const laneNames = [...deptNames, ...extraDepts, ...(laneMap['Unassigned'] ? ['Unassigned'] : [])]

  return { laneMap, laneNames }
}
