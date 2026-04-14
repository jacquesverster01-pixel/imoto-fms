import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import { styles } from '../../../utils/hrStyles'

export default function LogServiceModal({ equipment, onClose, onSaved }) {
  const [form, setForm] = useState({
    serviceDate:     todayStr(),
    technician:      '',
    notes:           '',
    nextServiceDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function f(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }

  async function handleSave() {
    if (!form.serviceDate) { setError('Date is required.'); return }
    setSaving(true)
    setError('')
    try {
      await apiFetch(`/ohs-equipment/${equipment.id}/service-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDate:     form.serviceDate,
          technician:      form.technician      || null,
          notes:           form.notes           || null,
          nextServiceDate: form.nextServiceDate || null,
        }),
      })
      onSaved()
    } catch (err) {
      console.error('Log service failed:', err)
      setError('Save failed. Check the server is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 440 }}>
        <h3 style={styles.modalTitle}>Log Service — {equipment.name}</h3>
        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <label style={styles.label}>Date *</label>
        <input type="date" style={styles.input} value={form.serviceDate} onChange={f('serviceDate')} />

        <label style={styles.label}>Technician</label>
        <input style={styles.input} value={form.technician} onChange={f('technician')} placeholder="Name or company" />

        <label style={styles.label}>Notes</label>
        <textarea
          style={{ ...styles.input, resize: 'vertical', minHeight: 60 }}
          value={form.notes}
          onChange={f('notes')}
          placeholder="Work performed…"
        />

        <label style={styles.label}>Next Service Date (override, optional)</label>
        <input type="date" style={styles.input} value={form.nextServiceDate} onChange={f('nextServiceDate')} />
        {equipment.nextServiceDate && !form.nextServiceDate && (
          <div style={{ fontSize: 11, color: '#888', marginTop: -8, marginBottom: 10 }}>
            Scheduled: {equipment.nextServiceDate} — leave blank to keep
          </div>
        )}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Log Service'}
          </button>
        </div>
      </div>
    </div>
  )
}
