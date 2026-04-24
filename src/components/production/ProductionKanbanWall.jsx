import { groupTasks, checkDependency, flattenTasks } from './kanbanUtils.js'
import CompactKanbanCard from './CompactKanbanCard.jsx'

const COLS = [
  { key: 'todo',       label: 'To Do' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'qc',         label: 'QC' },
  { key: 'done',       label: 'Done' },
]

const EMPTY_COLS = { todo: [], inprogress: [], qc: [], done: [] }

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

export default function ProductionKanbanWall({ jobs, prefixes, assemblyPhases = [] }) {
  if (!prefixes.length) {
    return (
      <div style={emptyStyle}>
        No departments configured. Set up code prefixes in Settings → Department Codes.
      </div>
    )
  }

  const allFlat = flattenTasks(jobs)

  if (!allFlat.length) {
    return <div style={emptyStyle}>No active jobs.</div>
  }

  const groups = groupTasks(jobs, prefixes)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {prefixes.map(prefix => {
        const deptGroup = groups[prefix.department] || EMPTY_COLS
        const totalCount = COLS.reduce((s, c) => s + (deptGroup[c.key]?.length || 0), 0)

        return (
          <div key={prefix.department} style={{
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
              borderLeft: `4px solid ${prefix.colour || '#9298c4'}`,
              padding: '12px 10px',
              background: '#fafbff',
              borderRight: '1px solid #f0f2f5',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d3b', marginBottom: 4, wordBreak: 'break-word' }}>
                {prefix.department}
              </div>
              <div style={{ fontSize: 11, color: '#9298c4' }}>{totalCount} tasks</div>
            </div>

            {/* 4 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', flex: 1, minWidth: 0 }}>
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
                        const jobTasks = allFlat.filter(t => t.jobId === task.jobId)
                        const depStatus = checkDependency(task, jobTasks, assemblyPhases)
                        return (
                          <CompactKanbanCard
                            key={task.id}
                            task={task}
                            deptColour={prefix.colour}
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
