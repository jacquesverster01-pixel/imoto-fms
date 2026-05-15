import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

export default function AddEditToolModal({ tool = null, categories = [], onClose, onSave }) {
  const [form, setForm] = useState({
    name: tool?.name || '',
    serial: tool?.serial || '',
    category: tool?.category || '',
    dept: tool?.dept || '',
    condition: tool?.condition || 'Good',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (tool) {
        await apiFetch(`/tools/${tool.id}`, { method: 'PUT', body: JSON.stringify(form) })
      } else {
        await apiFetch('/tools', {
          method: 'POST',
          body: JSON.stringify({ ...form, status: 'in', assignedTo: null, checkedOut: null }),
        })
      }
      onSave()
    } catch {
      setError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>{tool ? 'Edit Tool' : 'Add Tool'}</h3>

        <label style={styles.label}>Name *</label>
        <input
          style={styles.input}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Angle Grinder #4"
        />

        <label style={styles.label}>Serial / Code</label>
        <input
          style={styles.input}
          value={form.serial}
          onChange={e => set('serial', e.target.value)}
          placeholder="e.g. AG-2019-004"
        />

        <label style={styles.label}>Category</label>
        <input
          style={styles.input}
          list="tool-cat-list"
          value={form.category}
          onChange={e => set('category', e.target.value)}
          placeholder="e.g. Power tools"
        />
        <datalist id="tool-cat-list">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>

        <label style={styles.label}>Department</label>
        <input
          style={styles.input}
          value={form.dept}
          onChange={e => set('dept', e.target.value)}
          placeholder="e.g. Workshop"
        />

        <label style={styles.label}>Condition</label>
        <select style={styles.input} value={form.condition} onChange={e => set('condition', e.target.value)}>
          <option value="Good">Good</option>
          <option value="Needs repair">Needs repair</option>
          <option value="Due service">Due service</option>
        </select>

        {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button
            style={{ ...styles.btnPrimary, opacity: saving || !form.name.trim() ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
