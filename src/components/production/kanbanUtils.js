import { getDepartmentForCode, getPhaseForCode, isUnallocated } from '../../utils/codeParser.js'

const STATUSES = ['todo', 'inprogress', 'qc', 'done']

export function flattenTasks(jobs) {
  if (!Array.isArray(jobs)) return []
  const out = []
  for (const job of jobs) {
    if (!Array.isArray(job?.tasks)) continue
    for (const task of job.tasks) {
      out.push({ ...task, jobId: job.id, jobTitle: job.title })
    }
  }
  return out
}

export function getKanbanStatus(task) {
  if (task?.kanbanStatus && STATUSES.includes(task.kanbanStatus)) return task.kanbanStatus
  if (task?.done === true) return 'done'
  return 'todo'
}

export function groupTasks(jobs, prefixes) {
  const flat = flattenTasks(jobs)
  const groups = { unallocated: { todo: [], inprogress: [], qc: [], done: [] } }
  for (const p of (prefixes || [])) {
    groups[p.department] = { todo: [], inprogress: [], qc: [], done: [] }
  }
  for (const task of flat) {
    const status = getKanbanStatus(task)
    const dept = getDepartmentForCode(task.assemblyCode, prefixes)
    if (!dept) {
      groups.unallocated[status].push(task)
    } else {
      if (!groups[dept.department]) groups[dept.department] = { todo: [], inprogress: [], qc: [], done: [] }
      groups[dept.department][status].push(task)
    }
  }
  return groups
}

export function checkDependency(task, allTasksInJob, assemblyPhases) {
  const phase = getPhaseForCode(task.assemblyCode, assemblyPhases)
  if (phase !== 'installation') return { status: 'ok', missing: [] }
  const dependsOn = task.dependsOnAssembly
  if (!dependsOn) return { status: 'ok', missing: [] }
  const codes = Array.isArray(dependsOn) ? dependsOn : [dependsOn]
  const missing = []
  for (const code of codes) {
    const predecessor = allTasksInJob.find(t => t.assemblyCode === code)
    if (!predecessor || getKanbanStatus(predecessor) !== 'done') {
      missing.push(code)
    }
  }
  return { status: missing.length ? 'warning' : 'ok', missing }
}

export function countUnallocated(jobs, prefixes) {
  const flat = flattenTasks(jobs)
  return flat.filter(t => isUnallocated(t, prefixes)).length
}
