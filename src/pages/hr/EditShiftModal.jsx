import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'
import { isoToHHMM, dateLabel } from '../../utils/time'

function normaliseTime(timeStr, refIso) {
  if (!timeStr || !refIso) return refIso
  const [hh, mm] = timeStr.split(':').map(Number)
  const base = new Date(refIso)
  const utcH = hh - 2
  base.setUTCHours(utcH, mm, 0, 0)
  return base.toISOString()
}

export default function EditShiftModal({ shift, onClose, onSaved }) {
  const [inTime, setInTime] = useState('')
  const [outTime, setOutTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setInTime(isoToHHMM(shift.inTimestamp))
    setOutTime(shift.outTimestamp ? isoToHHMM(shift.outTimestamp) : '')
    setError('')
  }, [shift.inId])

  async function handleSave() {
    const newIn = normaliseTime(inTime, shift.inTimestamp)
    const outRef = shift.outTimestamp || shift.inTimestamp
    const newOut = outTime ? normaliseTime(outTime, outRef) : null

    if (newOut && newIn >= newOut) {
      setError('Clock-in must be before clock-out.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const updates = [{ id: shift.inId, timestamp: newIn }]
      if (shift.outId && newOut) {
        updates.push({ id: shift.outId, timestamp: newOut })
      }
      await apiFetch('/timelog', { method: 'PUT', body: JSON.stringify(updates) })
      if (!shift.outId && newOut) {
        await apiFetch('/timelog', {
          method: 'POST',
          body: JSON.stringify({
            employeeId: shift.employeeId,
            name: shift.name,
            dept: shift.dept,
            type: 'out',
            source: 'manual',
            timestamp: newOut,
          }),
        })
      }
      onSaved()
    } catch (err) {
      console.error('Save shift failed:', err)
      setError('Save failed. Is the server running?')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      if (shift.inId) await apiFetch(`/timelog/${shift.inId}`, { method: 'DELETE' })
      if (shift.outId) await apiFetch(`/timelog/${shift.outId}`, { method: 'DELETE' })
      onSaved()
    } catch (err) {
      console.error('Delete shift failed:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Edit Shift — {shift.name}</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{dateLabel(shift.inTimestamp)}</p>
        <label style={styles.label}>Clock-in time (SAST)</label>
        <input type="time" style={styles.input} value={inTime} onChange={e => setInTime(e.target.value)} />
        <label style={styles.label}>Clock-out time (SAST)</label>
        <input type="time" style={styles.input} value={outTime} onChange={e => setOutTime(e.target.value)} placeholder="Not clocked out" />

        {error && <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 12 }}>{error}</p>}

        {confirmDelete ? (
          <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 10 }}>Delete this entire shift? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.btnSecondary} onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button style={{ ...styles.btnPrimary, background: '#ef4444' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        ) : (
          <button style={{ ...styles.btnSecondary, color: '#ef4444', borderColor: '#fca5a5', marginBottom: 16 }} onClick={() => setConfirmDelete(true)}>
            Delete shift
          </button>
        )}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  )
}
