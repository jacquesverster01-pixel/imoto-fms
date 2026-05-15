import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'

const UNITS = ['EA', 'M', 'M2', 'KG', 'L', 'Set', 'metres', 'sheets', 'rolls', 'tubes', 'units', 'box', 'kg']

function computeStatus(qty, min) {
  if (qty === 0) return 'out'
  if (qty <= min) return 'low'
  return 'ok'
}

export default function AddEditStockModal({ item = null, categories = [], onClose, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || '',
    unit: item?.unit || 'EA',
    qty: item?.qty ?? 0,
    min: item?.min ?? 0,
    location: item?.location || '',
    notes: item?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const qty = Number(form.qty)
      const min = Number(form.min)
      const payload = { ...form, qty, min, status: computeStatus(qty, min) }
      if (item) {
        await apiFetch(`/stock/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/stock', { method: 'POST', body: JSON.stringify(payload) })
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
      <div style={{ ...styles.modal, width: 420 }}>
        <h3 style={styles.modalTitle}>{item ? 'Edit Stock Item' : 'Add Stock Item'}</h3>

        <label style={styles.label}>Name *</label>
        <input
          style={styles.input}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. M8 Bolt 30mm"
        />

        <label style={styles.label}>Category</label>
        <input
          style={styles.input}
          list="stock-cat-list"
          value={form.category}
          onChange={e => set('category', e.target.value)}
          placeholder="e.g. Fasteners"
        />
        <datalist id="stock-cat-list">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Unit</label>
            <input
              style={styles.input}
              list="stock-unit-list"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              placeholder="EA"
            />
            <datalist id="stock-unit-list">
              {UNITS.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Qty on Hand *</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              value={form.qty}
              onChange={e => set('qty', e.target.value)}
            />
          </div>
        </div>

        <label style={styles.label}>
          Reorder Level{' '}
          <span style={{ fontWeight: 400, color: '#9298c4' }}>— alert when qty falls below</span>
        </label>
        <input
          style={styles.input}
          type="number"
          min="0"
          value={form.min}
          onChange={e => set('min', e.target.value)}
        />

        <label style={styles.label}>Location</label>
        <input
          style={styles.input}
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder="e.g. Bin A3"
        />

        <label style={styles.label}>Notes</label>
        <textarea
          style={{ ...styles.input, resize: 'vertical', minHeight: 60 }}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />

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
