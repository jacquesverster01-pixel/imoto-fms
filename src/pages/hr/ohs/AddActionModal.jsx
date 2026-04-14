import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi'
import { styles } from '../../../utils/hrStyles'

export default function AddActionModal({ incidentId, action, onClose, onSaved }) {
  const [description, setDescription] = useState(action?.description || '')
  const [assignedTo, setAssignedTo] = useState(action?.assignedTo || '')
  const [dueDate, setDueDate] = useState(action?.dueDate || '')
  const [status, setStatus] = useState(action?.status || 'Open')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { description, assignedTo, dueDate, status }
      if (action) {
        await apiFetch(`/ohs/${incidentId}/action/${action.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await apiFetch(`/ohs/${incidentId}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      onSaved()
    } catch (err) {
      console.error('Action save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalTitle}>{action ? 'Edit Corrective Action' : 'Add Corrective Action'}</div>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Description</label>
          <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} required value={description} onChange={e => setDescription(e.target.value)} placeholder="What needs to be done" />

          <label style={styles.label}>Assigned To</label>
          <input style={styles.input} value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Employee name" />

          <label style={styles.label}>Due Date</label>
          <input style={styles.input} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />

          <label style={styles.label}>Status</label>
          <select style={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
            {['Open', 'In Progress', 'Done'].map(s => <option key={s}>{s}</option>)}
          </select>

          <div style={styles.modalBtns}>
            <button type="button" style={styles.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" style={styles.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
