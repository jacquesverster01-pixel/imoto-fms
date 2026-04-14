import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi'
import { styles } from '../../../utils/hrStyles'
import { inspectionScoreColour, inspectionScorePercent } from '../../../utils/ohs'

export default function RunInspectionModal({ inspection, readOnly, onClose, onSaved }) {
  const [items, setItems] = useState(() => (inspection.items || []).map(i => ({ ...i })))
  const [saving, setSaving] = useState(false)

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]
  const scoreable = items.filter(i => i.result === 'Pass' || i.result === 'Fail')
  const passCount = scoreable.filter(i => i.result === 'Pass').length
  const failCount = items.filter(i => i.result === 'Fail').length

  function setItemResult(itemId, result) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, result } : i))
  }

  function setItemNotes(itemId, notes) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, notes } : i))
  }

  async function handleSave(status) {
    setSaving(true)
    try {
      await apiFetch(`/ohs-inspections/${inspection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, status })
      })
      onSaved()
    } catch (err) {
      console.error('Inspection save error:', err)
    } finally {
      setSaving(false)
    }
  }

  function resultBtnStyle(current, target, activeColour) {
    return {
      padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
      border: 'none', cursor: readOnly ? 'default' : 'pointer',
      background: current === target ? activeColour : '#f0f2f5',
      color: current === target ? '#fff' : '#555'
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={styles.modalTitle}>{inspection.templateName}</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {inspection.performedBy && <span>👤 {inspection.performedBy} · </span>}
              {inspection.department && <span>{inspection.department} · </span>}
              {inspection.scheduledDate && <span>📅 {inspection.scheduledDate}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#6c63ff' }}>{passCount} / {scoreable.length}</div>
            <div>scored items</div>
          </div>
        </div>

        {categories.length > 0
          ? categories.map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f0f2f5' }}>{cat}</div>
                {items.filter(i => i.category === cat).map(item => (
                  <div key={item.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, flex: 1, color: '#1e1f3b' }}>{item.question}</span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button style={resultBtnStyle(item.result, 'Pass', '#22c55e')} disabled={readOnly} onClick={() => setItemResult(item.id, 'Pass')}>Pass</button>
                        <button style={resultBtnStyle(item.result, 'Fail', '#ef4444')} disabled={readOnly} onClick={() => setItemResult(item.id, 'Fail')}>Fail</button>
                        <button style={resultBtnStyle(item.result, 'N/A', '#9ca3af')} disabled={readOnly} onClick={() => setItemResult(item.id, 'N/A')}>N/A</button>
                      </div>
                    </div>
                    {item.result === 'Fail' && (
                      <textarea
                        style={{ ...styles.input, marginBottom: 0, fontSize: 12, minHeight: 48, resize: 'vertical' }}
                        placeholder="Describe the issue…"
                        value={item.notes || ''}
                        disabled={readOnly}
                        onChange={e => setItemNotes(item.id, e.target.value)}
                      />
                    )}
                    {readOnly && item.result === 'Fail' && item.notes && (
                      <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{item.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            ))
          : items.map(item => (
              <div key={item.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, flex: 1, color: '#1e1f3b' }}>{item.question}</span>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button style={resultBtnStyle(item.result, 'Pass', '#22c55e')} disabled={readOnly} onClick={() => setItemResult(item.id, 'Pass')}>Pass</button>
                    <button style={resultBtnStyle(item.result, 'Fail', '#ef4444')} disabled={readOnly} onClick={() => setItemResult(item.id, 'Fail')}>Fail</button>
                    <button style={resultBtnStyle(item.result, 'N/A', '#9ca3af')} disabled={readOnly} onClick={() => setItemResult(item.id, 'N/A')}>N/A</button>
                  </div>
                </div>
                {item.result === 'Fail' && (
                  <textarea
                    style={{ ...styles.input, marginBottom: 0, fontSize: 12, minHeight: 48, resize: 'vertical' }}
                    placeholder="Describe the issue…"
                    value={item.notes || ''}
                    disabled={readOnly}
                    onChange={e => setItemNotes(item.id, e.target.value)}
                  />
                )}
              </div>
            ))
        }

        {readOnly && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8f8f8', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1f3b', marginBottom: 4 }}>
              Final score: {inspection.score} / {inspection.maxScore}
              {inspection.maxScore > 0 && (
                <span style={{ marginLeft: 8, color: inspectionScoreColour(inspectionScorePercent(inspection)) }}>
                  ({inspectionScorePercent(inspection)}%)
                </span>
              )}
            </div>
            {failCount > 0 && (
              <div style={{ fontSize: 12, color: '#ef4444' }}>
                {failCount} item{failCount !== 1 ? 's' : ''} failed — incidents auto-created in Dashboard
              </div>
            )}
          </div>
        )}

        <div style={{ ...styles.modalBtns, marginTop: 16 }}>
          <button style={styles.btnSecondary} onClick={onClose}>Close</button>
          {!readOnly && (
            <>
              <button style={{ ...styles.btnSecondary }} disabled={saving} onClick={() => handleSave('In Progress')}>Save Progress</button>
              <button style={{ ...styles.btnPrimary }} disabled={saving} onClick={() => handleSave('Complete')}>
                {saving ? 'Saving…' : 'Complete Inspection'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
