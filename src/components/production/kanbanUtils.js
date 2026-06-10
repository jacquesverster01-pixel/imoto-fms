import { getPhaseForCode } from '../../utils/codeParser.js'

const STATUSES = ['todo', 'inprogress', 'qc', 'done']

export function getKanbanStatus(task) {
  if (task?.kanbanStatus && STATUSES.includes(task.kanbanStatus)) return task.kanbanStatus
  if (task?.done === true) return 'done'
  return 'todo'
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

const PALETTE = ['#fbbf24', '#a78bfa', '#60a5fa', '#34d399', '#f87171', '#fb923c', '#22d3ee', '#a3e635']
export function colourForDepartment(deptName) {
  let hash = 0
  for (let i = 0; i < deptName.length; i++) hash = (hash * 31 + deptName.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
