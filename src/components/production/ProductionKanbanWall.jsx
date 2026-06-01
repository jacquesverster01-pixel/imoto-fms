import { getTaskDepartments, getDisplayStatus } from '../../utils/deptAllocation.js'
import { checkDependency, colourForDepartment } from './kanbanUtils.js'
import CompactKanbanCard from './CompactKanbanCard.jsx'

// Three columns — qc dropped (no 'qc' kanbanStatus values exist in the data)
const COLS = [
  { key: 'todo',        label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
]

const colHeaderStyle = {
  padding: '6px 8px',
  background: '#f8f9fb',
  borderBottom: '1px solid #f0f2f5',
  fontSize: 11,
  fontWeight: 600,
  color: '#9298c4',
  whiteSpace: 'nowrap',
}

const emptyStyle = {
  textAlign: 'center',
  padding: '60px 20px',
  color: '#9298c4',
  fontSize: 14,
}

// Recursive flatten — mirrors KanbanBoard's walk(). Must stay in sync with that function.
function walkTasks(tasks, jobId, jobTitle, jobColour) {
  const out = []
  for (const t of tasks || []) {
    out.push({ ...t, jobId, jobTitle, jobColour })
    if (t.children?.length) out.push(...walkTasks(t.children, jobId, jobTitle, jobColour))
  }
  return out
}

function flattenAllJobs(jobs) {
  if (!Array.isArray(jobs)) return []
  return jobs.flatMap(job => walkTasks(job.tasks || [], job.id, job.title, job.colour))
}

// Build dept → { todo, in-progress, done } map using same logic as the board.
// A task resolving to multiple departments appears in each (correct, not a bug).
function buildWallMap(tasks, prefixMappings) {
  const map = {}
  for (const task of tasks) {
    const depts = getTaskDepartments(task, prefixMappings)
    const lanes = depts.length > 0 ? depts : ['Unassigned']
    const status = getDisplayStatus(task)
    for (const dept of lanes) {
      if (!map[dept]) map[dept] = { todo: [], 'in-progress': [], done: [] }
      map[dept][status].push(task)
    }
  }
  return map
}

function getDeptColour(deptName, settingsData) {
  const match = settingsData?.departments?.find(d => d.name === deptName)
  return match?.color || colourForDepartment(deptName)
}

export default function ProductionKanbanWall({ jobs, prefixMappings, assemblyPhases = [], settingsData }) {
  const allFlat = flattenAllJobs(jobs)

  if (!allFlat.length) {
    return <div style={emptyStyle}>No active jobs.</div>
  }

  const wallMap = buildWallMap(allFlat, prefixMappings)

  // Row list: settings departments first, then any extra depts derived from tasks, then Unassigned
  const settingsDeptNames = (settingsData?.departments || []).map(d => d.name)
  const extraDepts = Object.keys(wallMap).filter(d => d !== 'Unassigned' && !settingsDeptNames.includes(d))
  const deptRows = [
    ...settingsDeptNames,
    ...extraDepts,
    ...(wallMap['Unassigned'] ? ['Unassigned'] : []),
  ]

  if (!deptRows.length) {
    return (
      <div style={emptyStyle}>
        No departments configured. Set up departments in Settings.
      </div>
    )
  }

  // Pre-group flat tasks by jobId for checkDependency lookups
  const tasksByJob = {}
  for (const t of allFlat) {
    if (!tasksByJob[t.jobId]) tasksByJob[t.jobId] = []
    tasksByJob[t.jobId].push(t)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {deptRows.map(dept => {
        const deptColour = getDeptColour(dept, settingsData)
        const deptGroup = wallMap[dept] || { todo: [], 'in-progress': [], done: [] }
        const totalCount = COLS.reduce((s, c) => s + (deptGroup[c.key]?.length || 0), 0)

        return (
          <div key={dept} style={{
            display: 'flex',
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e4e6ea',
            overflow: 'hidden',
            minHeight: 100,
          }}>
            {/* Left label panel */}
            <div style={{
              width: 120,
              flexShrink: 0,
              borderLeft: `4px solid ${deptColour}`,
              padding: '12px 10px',
              background: '#fafbff',
              borderRight: '1px solid #f0f2f5',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d3b', marginBottom: 4, wordBreak: 'break-word' }}>
                {dept}
              </div>
              <div style={{ fontSize: 11, color: '#9298c4' }}>{totalCount} tasks</div>
            </div>

            {/* 3 status columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1, minWidth: 0 }}>
              {COLS.map((col, ci) => {
                const tasks = deptGroup[col.key] || []
                return (
                  <div key={col.key} style={{
                    borderLeft: ci > 0 ? '1px solid #f0f2f5' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                  }}>
                    <div style={colHeaderStyle}>
                      {col.label} · {tasks.length}
                    </div>
                    <div style={{ padding: '4px 6px', overflowY: 'auto', flex: 1, maxHeight: 280 }}>
                      {tasks.map(task => {
                        const jobTasks = tasksByJob[task.jobId] || []
                        const depStatus = checkDependency(task, jobTasks, assemblyPhases)
                        return (
                          <CompactKanbanCard
                            key={task.id}
                            task={task}
                            deptColour={deptColour}
                            dependencyStatus={depStatus}
                          />
                        )
                      })}
                      {tasks.length === 0 && (
                        <div style={{ fontSize: 11, color: '#e5e7eb', textAlign: 'center', paddingTop: 16 }}>—</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
