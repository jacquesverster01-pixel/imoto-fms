import { useState } from 'react'
import { parseProductCode } from '../../utils/codeParser.js'

const COLS = [
  { key: 'todo',       label: 'To Do' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'qc',         label: 'QC' },
  { key: 'done',       label: 'Done' },
]

function getPrefixFromCode(code) {
  const p = parseProductCode(code)
  return p.valid ? p.prefix : (code ? code.slice(0, 3) : '???')
}

export default function UnallocatedPanel({ tasks, onNavigateToSettings }) {
  const [draggedId, setDraggedId] = useState(null)
  const [dropCol, setDropCol]     = useState(null)

  const allTasks = [
    ...(tasks.todo       || []),
    ...(tasks.inprogress || []),
    ...(tasks.qc         || []),
    ...(tasks.done       || []),
  ]

  const total = allTasks.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#9298c4' }}>
          Tasks whose assembly code prefix isn't mapped to any department.
        </div>
        <button
          onClick={onNavigateToSettings}
          style={{ fontSize: 12, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}
        >
          Configure prefixes in Settings →
        </button>
      </div>

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#22c55e', fontSize: 13, fontWeight: 500 }}>
          ✓ All tasks are allocated to a department.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {COLS.map(col => {
            const colTasks = tasks[col.key] || []
            const isOver = dropCol === col.key
            return (
              <div
                key={col.key}
                onDragOver={e => { e.preventDefault(); setDropCol(col.key) }}
                onDragLeave={() => setDropCol(null)}
                onDrop={() => setDropCol(null)}
                style={{
                  background: isOver ? '#fef9ec' : '#f8f9fb',
                  borderRadius: 10,
                  padding: '10px 8px',
                  minHeight: 120,
                  border: isOver ? '1.5px dashed #f59e0b' : '1.5px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9298c4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {col.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#b0b5cc', background: '#f0f2f5', borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>
                    {colTasks.length}
                  </span>
                </div>
                {colTasks.map(task => {
                  const prefix = getPrefixFromCode(task.assemblyCode)
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => setDraggedId(null)}
                      style={{
                        background: '#fff',
                        borderRadius: 8,
                        borderLeft: '4px solid #ef4444',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        padding: '8px 10px',
                        marginBottom: 6,
                        cursor: 'grab',
                        opacity: draggedId === task.id ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b', flex: 1 }}>
                          {task.name || task.label || 'Untitled'}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#ef4444' }}>
                        Code prefix <code style={{ fontFamily: 'monospace' }}>{prefix}</code> not mapped
                      </div>
                      {task.jobTitle && (
                        <div style={{ fontSize: 10, color: '#9298c4', marginTop: 2 }}>{task.jobTitle}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
