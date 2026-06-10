import { useState, useEffect } from 'react'
import { checkTaskAllocation } from '../../../utils/stockAllocation.js'
import DepartmentChips from './DepartmentChips.jsx'
import SubTaskList from './SubTaskList.jsx'
import TaskFilesSection from './TaskFilesSection.jsx'

function formatCacheAge(updatedAt) {
  if (!updatedAt) return '—'
  const diffMin = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

function CompStatusIcon({ status }) {
  if (status === 'ok')    return <span style={{ color: '#22c55e' }}>✓</span>
  if (status === 'short') return <span style={{ color: '#f59e0b' }}>⚠</span>
  if (status === 'out')   return <span style={{ color: '#ef4444' }}>✕</span>
  return <span style={{ color: '#9298c4' }}>—</span>
}

const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9298c4', marginBottom: 3, display: 'block' }
const inputStyle = {
  width: '100%', fontSize: 12, color: '#1a1d3b', background: '#fff',
  border: '1px solid #e4e6ea', borderRadius: 4, padding: '4px 6px',
  fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
}

export default function KanbanCardDetail({ task, onTaskPatch, onTaskAction, isUpdating, stockCache, globalAllocations, stockCacheData, departments }) {
  const [localName, setLocalName] = useState(task.name || '')
  const [localNotes, setLocalNotes] = useState(task.notes || '')
  const [localPct, setLocalPct] = useState(task.pct ?? 0)
  const [activeTab, setActiveTab] = useState('details')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setLocalName(task.name || '')
    setLocalNotes(task.notes || '')
    setLocalPct(task.pct ?? 0)
  }, [task.id])

  function saveName() {
    const trimmed = localName.trim()
    if (trimmed && trimmed !== task.name) onTaskPatch(task, { name: trimmed })
  }

  function saveNotes() {
    if (localNotes !== (task.notes || '')) onTaskPatch(task, { notes: localNotes })
  }

  function savePct(val) {
    const n = Number(val)
    if (n !== (task.pct ?? 0)) onTaskPatch(task, { pct: n })
  }

  const comps = task.components || []
  const allocResults = comps.length > 0
    ? checkTaskAllocation(task, stockCache || {}, globalAllocations || new Map()).map((r, i) => ({
        ...r,
        description: comps[i]?.itemDescription || '',
        unit: comps[i]?.unit || '',
      }))
    : []
  const okCount = allocResults.filter(r => r.status === 'ok').length

  return (
    <div style={{ borderTop: '1px solid #f0f2f5', background: '#fafbff' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #e4e6ea', background: '#f5f7fb' }}>
        {['details', 'files'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '5px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? '#4f67e4' : '#9298c4', borderBottom: activeTab === tab ? '2px solid #4f67e4' : '2px solid transparent' }}>
            {tab === 'details' ? 'Details' : 'Files'}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Task name</label>
            <input
              style={inputStyle}
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              disabled={isUpdating}
            />
          </div>

          <DepartmentChips task={task} departments={departments} onTaskPatch={onTaskPatch} isUpdating={isUpdating} />

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={saveNotes}
              disabled={isUpdating}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Progress</label>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1d3b', minWidth: 32, textAlign: 'right' }}>{localPct}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5} value={localPct}
              onChange={e => setLocalPct(Number(e.target.value))}
              onMouseUp={e => savePct(e.target.value)}
              onTouchEnd={e => savePct(e.target.value)}
              disabled={isUpdating}
              style={{ width: '100%', cursor: isUpdating ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {comps.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Components</span>
                <span style={{ fontSize: 10, color: '#b0b5cc' }}>cache {formatCacheAge(stockCacheData?.updatedAt)}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '2px 4px 2px 0', color: '#9298c4', fontWeight: 500 }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '2px 4px', color: '#9298c4', fontWeight: 500 }}>Desc</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px', color: '#9298c4', fontWeight: 500 }}>Req</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px', color: '#9298c4', fontWeight: 500 }}>Avail</th>
                    <th style={{ textAlign: 'center', padding: '2px 0 2px 4px', color: '#9298c4', fontWeight: 500 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {allocResults.map(r => (
                    <tr key={r.itemCode} style={{ borderBottom: '1px solid #f0f2f5' }}>
                      <td style={{ padding: '3px 4px 3px 0', color: '#374151', fontFamily: 'monospace', fontSize: 10, whiteSpace: 'nowrap' }}>{r.itemCode}</td>
                      <td style={{ padding: '3px 4px', color: '#6b7280', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', color: '#374151' }}>{r.required}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', color: '#374151' }}>{r.available === null ? '—' : r.available}</td>
                      <td style={{ padding: '3px 0 3px 4px', textAlign: 'center' }}><CompStatusIcon status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 10, color: '#9298c4', marginTop: 5 }}>
                {okCount} of {comps.length} component{comps.length !== 1 ? 's' : ''} fully stocked
              </div>
            </div>
          )}

          <SubTaskList task={task} onTaskPatch={onTaskPatch} onTaskAction={onTaskAction} isUpdating={isUpdating} />
        </div>
      )}

      {activeTab === 'files' && (
        <TaskFilesSection task={task} onTaskAction={onTaskAction} isUpdating={isUpdating} />
      )}

      <div style={{ padding: '6px 12px', borderTop: '1px solid #f0f2f5' }}>
        {confirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: '#dc2626', flex: 1 }}>Delete this task?</span>
            <button
              onClick={() => { onTaskAction('deleteTask', task); setConfirmDelete(false) }}
              style={{ fontSize: 11, padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >Delete</button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ fontSize: 11, padding: '2px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isUpdating}
            style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', padding: 0, opacity: isUpdating ? 0.5 : 1 }}
          >
            Delete task
          </button>
        )}
      </div>
    </div>
  )
}
