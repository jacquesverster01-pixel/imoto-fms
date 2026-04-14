import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { styles } from '../../../utils/hrStyles'

const UPLOADS_URL = 'http://localhost:3001/uploads'

export default function AddAppointmentModal({ isOpen, onClose, onSaved, editAppointment }) {
  const { data: typesRaw } = useGet('/ohs-appointment-types')
  const { data: empData }  = useGet('/employees')
  const types     = Array.isArray(typesRaw) ? typesRaw : []
  const employees = empData?.employees || []

  const [form, setForm] = useState({
    typeId:        editAppointment?.typeId        || '',
    appointeeId:   editAppointment?.appointeeId   || '',
    dateAppointed: editAppointment?.dateAppointed || '',
    expiryDate:    editAppointment?.expiryDate    || '',
    notes:         editAppointment?.notes         || '',
  })
  const [certFile, setCertFile] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  if (!isOpen) return null

  function f(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }

  async function handleSave() {
    if (!form.typeId)        { setError('Appointment type is required.'); return }
    if (!form.appointeeId)   { setError('Appointee is required.'); return }
    if (!form.dateAppointed) { setError('Date appointed is required.'); return }
    setSaving(true)
    setError('')
    try {
      const body = { ...form, expiryDate: form.expiryDate || null }
      let saved
      if (editAppointment) {
        saved = await apiFetch(`/ohs-appointments/${editAppointment.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      } else {
        saved = await apiFetch('/ohs-appointments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      }
      if (certFile && saved?.id) {
        const fd = new FormData()
        fd.append('file', certFile)
        await apiFetch(`/ohs-appointments/${saved.id}/upload`, { method: 'POST', body: fd })
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error('Save appointment failed:', err)
      setError('Save failed. Check the server is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={styles.modalTitle}>{editAppointment ? 'Edit Appointment' : 'Add Appointment'}</h3>
        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <label style={styles.label}>Appointment Type *</label>
        <select style={styles.input} value={form.typeId} onChange={f('typeId')}>
          <option value="">— select —</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        <label style={styles.label}>Appointee *</label>
        <select style={styles.input} value={form.appointeeId} onChange={f('appointeeId')}>
          <option value="">— select —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Date Appointed *</label>
            <input type="date" style={styles.input} value={form.dateAppointed} onChange={f('dateAppointed')} />
          </div>
          <div>
            <label style={styles.label}>Expiry Date (blank = permanent)</label>
            <input type="date" style={styles.input} value={form.expiryDate} onChange={f('expiryDate')} />
          </div>
        </div>

        <label style={styles.label}>Notes</label>
        <textarea
          style={{ ...styles.input, resize: 'vertical', minHeight: 60 }}
          value={form.notes}
          onChange={f('notes')}
          placeholder="Optional notes…"
        />

        <label style={styles.label}>Certificate (optional)</label>
        {editAppointment?.certificate && (
          <div style={{ fontSize: 12, color: '#6c63ff', marginBottom: 6 }}>
            Current:{' '}
            <a href={`${UPLOADS_URL}/${editAppointment.certificate.file}`} target="_blank" rel="noreferrer">
              {editAppointment.certificate.name}
            </a>
          </div>
        )}
        <input
          type="file"
          style={{ fontSize: 12, marginBottom: 14 }}
          onChange={e => setCertFile(e.target.files[0] || null)}
        />

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editAppointment ? 'Save Changes' : 'Add Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}
