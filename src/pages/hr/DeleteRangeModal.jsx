import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

export default function DeleteRangeModal({ timelog, employees, onClose, onDeleted }) {
  const [delFrom, setDelFrom]       = useState('')
  const [delTo, setDelTo]           = useState('')
  const [delSource, setDelSource]   = useState('all')
  const [delEmployee, setDelEmployee] = useState('')
  const [deleting, setDeleting]     = useState(false)
  const [delResult, setDelResult]   = useState(null)

  const delPreviewCount = (() => {
    if (!delFrom || !delTo) return 0
    const fromTs = delFrom + 'T00:00:00.000Z'
    const toTs   = delTo   + 'T23:59:59.999Z'
    return timelog.filter(e => {
      if (e.timestamp < fromTs || e.timestamp > toTs) return false
      if (delSource === 'biometric' && e.source !== 'biometric') return false
      if (delSource === 'manual'    && e.source === 'biometric') return false
      if (delEmployee && e.employeeId !== delEmployee) return false
      return true
    }).length
  })()

  function resetFields() {
    setDelFrom(''); setDelTo(''); setDelSource('all'); setDelEmployee(''); setDelResult(null)
  }

  async function handleDelete() {
    if (!delFrom || !delTo || delPreviewCount === 0) return
    setDeleting(true)
    setDelResult(null)
    try {
      const res = await apiFetch('/timelog/range', {
        method: 'DELETE',
        body: JSON.stringify({ from: delFrom, to: delTo, source: delSource, ...(delEmployee && { employeeId: delEmployee }) })
      })
      setDelResult({ deleted: res.deleted })
      onDeleted()
    } catch {
      setDelResult({ error: 'Delete failed.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>Delete Time Log Entries</h3>

        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>From date</label>
            <input type="date" style={{ ...styles.input, marginBottom: 0, width: '100%' }}
              value={delFrom} onChange={e => { setDelFrom(e.target.value); setDelResult(null) }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>To date</label>
            <input type="date" style={{ ...styles.input, marginBottom: 0, width: '100%' }}
              value={delTo} onChange={e => { setDelTo(e.target.value); setDelResult(null) }} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Employee</label>
          <select style={{ ...styles.input, marginBottom: 0, width: '100%' }}
            value={delEmployee} onChange={e => { setDelEmployee(e.target.value); setDelResult(null) }}>
            <option value=''>All employees</option>
            {(employees || []).map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Source</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'biometric', 'manual'].map(s => (
              <button key={s} onClick={() => { setDelSource(s); setDelResult(null) }}
                style={{ padding: '5px 14px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid', cursor: 'pointer',
                  background: delSource === s ? '#ef4444' : '#fff',
                  color:      delSource === s ? '#fff'     : '#555',
                  borderColor: delSource === s ? '#ef4444' : '#e4e6ea' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {delFrom && delTo && (
          <div style={{ background: delPreviewCount > 0 ? '#fff3f3' : '#f0fdf4', border: `1px solid ${delPreviewCount > 0 ? '#fca5a5' : '#86efac'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13 }}>
            {delPreviewCount > 0
              ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{delPreviewCount} entries will be permanently deleted.</span>
              : <span style={{ color: '#16a34a' }}>No entries found for this selection.</span>
            }
          </div>
        )}

        {delResult && (
          <div style={{ background: delResult.error ? '#fff3f3' : '#f0fdf4', border: `1px solid ${delResult.error ? '#fca5a5' : '#86efac'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            {delResult.error
              ? <span style={{ color: '#ef4444' }}>{delResult.error}</span>
              : <span style={{ color: '#16a34a' }}>{delResult.deleted} entries deleted.</span>
            }
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={styles.btnSecondary} onClick={() => { resetFields(); onClose() }}>Close</button>
          <button
            style={{ ...styles.btnPrimary, background: '#ef4444', opacity: (!delFrom || !delTo || delPreviewCount === 0 || deleting) ? 0.5 : 1 }}
            onClick={handleDelete}
            disabled={!delFrom || !delTo || delPreviewCount === 0 || deleting}
          >
            {deleting ? 'Deleting…' : `Delete ${delPreviewCount > 0 ? delPreviewCount : ''} Entries`}
          </button>
        </div>
      </div>
    </div>
  )
}
