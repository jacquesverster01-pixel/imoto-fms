import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import { assembleChecklist } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'

const CADENCES = ['weekly', 'monthly', 'quarterly']

export default function ScheduleInspectionModal({ isOpen, onClose, onSaved }) {
  const { data: tmplData  } = useGet('/ohs-inspection-templates')
  const { data: empData   } = useGet('/employees')
  const { data: aptRaw    } = useGet('/ohs-appointments')

  const employees    = empData?.employees || []
  const appointments = Array.isArray(aptRaw) ? aptRaw : []
  const today        = todayStr()

  // Only employees with at least one active appointment
  const appointedIds    = new Set(appointments.filter(a => !a.expiryDate || a.expiryDate >= today).map(a => a.appointeeId))
  const assignableEmps  = employees.filter(e => appointedIds.has(e.id))

  const [cadence,     setCadence]     = useState('weekly')
  const [assigneeId,  setAssigneeId]  = useState('')
  const [dueDate,     setDueDate]     = useState(today)
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [savedId,     setSavedId]     = useState(null)
  const [waMsg,       setWaMsg]       = useState('')
  const [error,       setError]       = useState('')

  if (!isOpen) return null

  async function handleSave() {
    if (!assigneeId) { setError('Please select an assignee.'); return }
    setSaving(true)
    setError('')
    try {
      const templates = {
        weekly:    tmplData?.weekly    || [],
        monthly:   tmplData?.monthly   || [],
        quarterly: tmplData?.quarterly || [],
      }
      const assembled = assembleChecklist(templates, cadence)
      const emp       = employees.find(e => e.id === assigneeId)
      const body = {
        cadence,
        assigneeId,
        assigneeName: emp?.name || assigneeId,
        dueDate,
        notes,
        status: 'pending',
        questions: assembled.map(q => ({
          questionId:    q.id,
          text:          q.text,
          requiresPhoto: q.requiresPhoto,
          cadence:       q.cadence,
          response:      null,
          photoPath:     null,
          note:          null,
        })),
      }
      const saved = await apiFetch('/ohs-inspections-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSavedId(saved.id)
      onSaved()
    } catch (err) {
      console.error('Schedule inspection failed:', err)
      setError('Save failed. Check the server is running.')
    } finally {
      setSaving(false)
    }
  }

  async function handleWhatsApp() {
    try {
      const result = await apiFetch(`/ohs-inspections-active/${savedId}/whatsapp-link`)
      if (result.url) {
        window.open(result.url, '_blank')
      } else {
        setWaMsg('No phone number on record for this employee.')
      }
    } catch {
      setWaMsg('Could not generate WhatsApp link.')
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 480 }}>
        <h3 style={styles.modalTitle}>Schedule Inspection</h3>
        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <label style={styles.label}>Cadence</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {CADENCES.map(c => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                background: cadence === c ? '#6c63ff' : '#f3f4f6',
                color: cadence === c ? '#fff' : '#374151',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <label style={styles.label}>Assign To (appointed employees only) *</label>
        <select style={styles.input} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
          <option value="">— select —</option>
          {assignableEmps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {assignableEmps.length === 0 && (
          <div style={{ fontSize: 11, color: '#f57f17', marginTop: -8, marginBottom: 12 }}>
            No employees with active legal appointments found.
          </div>
        )}

        <label style={styles.label}>Due Date</label>
        <input type="date" style={styles.input} value={dueDate} onChange={e => setDueDate(e.target.value)} />

        <label style={styles.label}>Notes (optional)</label>
        <textarea
          style={{ ...styles.input, resize: 'vertical', minHeight: 60 }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional instructions…"
        />

        {savedId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#166534', background: '#e8f5e9', borderRadius: 8, padding: '8px 12px' }}>
              Inspection scheduled successfully.
            </div>
            {waMsg && <div style={{ fontSize: 12, color: '#f57f17' }}>{waMsg}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={styles.btnSecondary} onClick={onClose}>Close</button>
              <button style={{ ...styles.btnPrimary, background: '#25d366' }} onClick={handleWhatsApp}>
                Send WhatsApp Reminder
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.modalBtns}>
            <button style={styles.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
            <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
