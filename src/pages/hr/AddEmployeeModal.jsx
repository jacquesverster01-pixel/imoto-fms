import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

export default function AddEmployeeModal({ onClose, onSaved, departments = [] }) {
  const [form, setForm] = useState({ name: '', dept: '', color: '#6c63ff' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim() || !form.dept) return
    setSaving(true)
    await apiFetch('/employees', { method: 'POST', body: JSON.stringify(form) })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Add Employee</h3>
        <label style={styles.label}>Name</label>
        <input style={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
        <label style={styles.label}>Department</label>
        <select style={styles.input} value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}>
          <option value="">— select department —</option>
          {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <label style={styles.label}>Colour</label>
        <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ marginBottom: 20, cursor: 'pointer' }} />
        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving || !form.dept}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
