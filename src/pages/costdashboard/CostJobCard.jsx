import { useState } from 'react'
import { formatZAR } from '../../utils/costToComplete'
import CostJobDetail from './CostJobDetail'

function progressColour(pct) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function CostJobCard({ jobCost, isExpanded, onExpand, onLabourSave, savingLabour }) {
  const [editingValue, setEditingValue] = useState(null)

  function startEdit() {
    setEditingValue(String(jobCost.labourCost))
  }

  function cancelEdit() {
    setEditingValue(null)
  }

  function confirmEdit() {
    const val = parseFloat(editingValue) || 0
    onLabourSave(jobCost.jobId, val)
    setEditingValue(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const barColour = progressColour(jobCost.progressPct)

  return (
    <div style={{ background: '#fff', borderRadius: 8, marginBottom: 12, borderLeft: `4px solid ${jobCost.jobColour || '#6c63ff'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '16px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e1f3b', maxWidth: '75%' }}>{jobCost.jobTitle}</div>
          <div style={{ fontSize: 11, color: '#9298c4', fontFamily: 'monospace' }}>{jobCost.jobId}</div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${jobCost.progressPct}%`, background: barColour, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            {jobCost.progressPct}% complete — {jobCost.doneCount} / {jobCost.taskCount} tasks done
          </div>
        </div>

        {/* Cost rows */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '4px 0', fontSize: 13 }}>
          <span style={{ color: '#6b7280' }}>Materials:</span>
          <span style={{ color: '#1e1f3b', fontWeight: 500 }}>{formatZAR(jobCost.materialCost)}</span>

          <span style={{ color: '#6b7280' }}>Labour:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingValue === null ? (
              <>
                <span style={{ color: '#1e1f3b', fontWeight: 500 }}>{formatZAR(jobCost.labourCost)}</span>
                <button onClick={startEdit} style={{ fontSize: 11, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>edit</button>
              </>
            ) : (
              <>
                <input
                  type="number"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{ width: 110, padding: '2px 6px', border: '1px solid #6c63ff', borderRadius: 4, fontSize: 13, outline: 'none' }}
                />
                <button onClick={confirmEdit} disabled={savingLabour} style={{ fontSize: 11, color: '#fff', background: '#6c63ff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>✓</button>
                <button onClick={cancelEdit} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </>
            )}
          </span>

          <span style={{ color: '#9298c4', borderTop: '1px solid #f3f4f6', paddingTop: 6, marginTop: 2 }} />
          <span style={{ borderTop: '1px solid #f3f4f6', paddingTop: 6, marginTop: 2 }} />

          <span style={{ color: '#1e1f3b', fontWeight: 600 }}>Total:</span>
          <span style={{ color: '#1e1f3b', fontWeight: 700, fontSize: 14 }}>{formatZAR(jobCost.totalCost)}</span>
        </div>

        {/* Expand toggle */}
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button
            onClick={() => onExpand(isExpanded ? null : jobCost.jobId)}
            style={{ fontSize: 12, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {isExpanded ? '▲ Hide component breakdown' : '▼ View component breakdown'}
          </button>
        </div>
      </div>

      {isExpanded && <CostJobDetail jobCost={jobCost} />}
    </div>
  )
}
