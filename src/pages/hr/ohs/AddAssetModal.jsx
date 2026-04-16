import { useState } from 'react'
import { TYPE_LABELS } from './factoryMapPins'

const ASSET_TYPES = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))
const INP = { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #e4e6ea', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }

export default function AddAssetModal({ xPct, yPct, zones, onSave, onCancel }) {
  const [form, setForm] = useState({ label: '', type: 'fire_extinguisher', zoneId: '', lastServiced: '', nextService: '', stockLevel: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.label.trim()) return
    setSaving(true)
    try {
      onSave({
        id: `MA${Date.now()}`,
        label: form.label.trim(), type: form.type,
        zoneId: form.zoneId || null, xPct, yPct,
        lastServiced: form.lastServiced || null,
        nextService: form.nextService || null,
        stockLevel: form.stockLevel.trim() || null,
      })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Add Safety Asset</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>LABEL *</div>
          <input style={INP} placeholder="e.g. Fire Extinguisher A1" value={form.label} onChange={e => set('label', e.target.value)} autoFocus />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>TYPE</div>
          <select style={INP} value={form.type} onChange={e => set('type', e.target.value)}>
            {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>ZONE (optional)</div>
          <select style={INP} value={form.zoneId} onChange={e => set('zoneId', e.target.value)}>
            <option value="">— Unassigned —</option>
            {(zones || []).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>LAST SERVICED</div>
            <input type="date" style={INP} value={form.lastServiced} onChange={e => set('lastServiced', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>NEXT SERVICE</div>
            <input type="date" style={INP} value={form.nextService} onChange={e => set('nextService', e.target.value)} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>STOCK LEVEL (optional)</div>
          <input style={INP} placeholder="e.g. Full, 80%, 2 remaining" value={form.stockLevel} onChange={e => set('stockLevel', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e4e6ea', background: '#f0f2f5', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.label.trim()}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: saving || !form.label.trim() ? '#b0b5cc' : '#6c63ff', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  )
}
