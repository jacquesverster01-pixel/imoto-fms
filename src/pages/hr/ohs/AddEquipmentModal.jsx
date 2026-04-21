import { useState } from 'react'
import { apiFetch, useGet } from '../../../hooks/useApi'
import { calcNextServiceDate } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'

import { UPLOADS_BASE as UPLOADS_URL } from '../../../hooks/useApi'

const CATEGORIES = [
  'Power Tools','Hand Tools','Lifting Equipment','Pressure Vessels',
  'Electrical Equipment','Welding Equipment','Material Handling','Safety Equipment','Other',
]
const STATUSES = ['Active','Under Inspection','Out of Service','Decommissioned']
const RISK_LEVELS = [
  { v: 1, label: 'Low' }, { v: 2, label: 'Medium' },
  { v: 3, label: 'High' }, { v: 4, label: 'Critical' },
]

export default function AddEquipmentModal({ equipment, onClose, onSaved, departments = [] }) {
  const isNew = !equipment
  const { data: zonesData } = useGet('/ohs-zones')
  const zones = zonesData?.zones || []

  const [form, setForm] = useState({
    name:                  equipment?.name                  || '',
    category:              equipment?.category              || 'Power Tools',
    serial:                equipment?.serial                || '',
    location:              equipment?.location              || '',
    department:            equipment?.department            || '',
    riskLevel:             equipment?.riskLevel             ?? 1,
    status:                equipment?.status                || 'Active',
    zoneId:                equipment?.zoneId                || '',
    lastInspectionDate:    equipment?.lastInspectionDate    || '',
    nextInspectionDate:    equipment?.nextInspectionDate    || '',
    inspectionIntervalDays: equipment?.inspectionIntervalDays ?? 90,
    preUseCheckRequired:   equipment?.preUseCheckRequired   ?? false,
    notes:                 equipment?.notes                 || '',
    serviceIntervalDays:   equipment?.serviceIntervalDays   || '',
    lastServiceDate:       equipment?.lastServiceDate        || '',
  })
  const [stickerFile, setStickerFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function f(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }

  const nextServiceDate = calcNextServiceDate(form.lastServiceDate, form.serviceIntervalDays)

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        riskLevel: Number(form.riskLevel),
        inspectionIntervalDays: Number(form.inspectionIntervalDays),
        lastInspectionDate:  form.lastInspectionDate  || null,
        nextInspectionDate:  form.nextInspectionDate  || null,
        serviceIntervalDays: form.serviceIntervalDays ? Number(form.serviceIntervalDays) : null,
        lastServiceDate:     form.lastServiceDate     || null,
        nextServiceDate:     nextServiceDate          || null,
      }
      let saved
      if (isNew) {
        saved = await apiFetch('/ohs-equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        saved = await apiFetch(`/ohs-equipment/${equipment.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      if (stickerFile && saved?.id) {
        const fd = new FormData()
        fd.append('file', stickerFile)
        await apiFetch(`/ohs-equipment/${saved.id}/upload`, { method: 'POST', body: fd })
      }
      onSaved()
    } catch (err) {
      console.error('Save equipment failed:', err)
      setError('Save failed. Check the server is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={styles.modalTitle}>{isNew ? 'Add Equipment' : 'Edit Equipment'}</h3>
        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <label style={styles.label}>Name *</label>
        <input style={styles.input} value={form.name} onChange={f('name')} placeholder="e.g. Angle Grinder #3" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Category</label>
            <select style={styles.input} value={form.category} onChange={f('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Serial Number</label>
            <input style={styles.input} value={form.serial} onChange={f('serial')} placeholder="e.g. AG-2021-003" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Location</label>
            <input style={styles.input} value={form.location} onChange={f('location')} placeholder="e.g. Workshop Bay 2" />
          </div>
          <div>
            <label style={styles.label}>Department</label>
            <select style={styles.input} value={form.department} onChange={f('department')}>
              <option value="">— select —</option>
              {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Risk Level</label>
            <select style={styles.input} value={form.riskLevel} onChange={f('riskLevel')}>
              {RISK_LEVELS.map(r => <option key={r.v} value={r.v}>{r.v} — {r.label}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Status</label>
            <select style={styles.input} value={form.status} onChange={f('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={styles.label}>Factory Zone</label>
          <select style={styles.input} value={form.zoneId} onChange={f('zoneId')}>
            <option value="">— Unassigned —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Last Inspection Date</label>
            <input type="date" style={styles.input} value={form.lastInspectionDate} onChange={f('lastInspectionDate')} />
          </div>
          <div>
            <label style={styles.label}>Next Inspection Date</label>
            <input type="date" style={styles.input} value={form.nextInspectionDate} onChange={f('nextInspectionDate')} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Inspection Interval (days)</label>
            <input type="number" style={styles.input} value={form.inspectionIntervalDays} onChange={f('inspectionIntervalDays')} min={1} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
            <input
              type="checkbox" id="preuse-check"
              checked={form.preUseCheckRequired}
              onChange={e => setForm(p => ({ ...p, preUseCheckRequired: e.target.checked }))}
            />
            <label htmlFor="preuse-check" style={{ ...styles.label, margin: 0, cursor: 'pointer' }}>Pre-use check required</label>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#6c63ff', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Service Interval</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>Service Interval (days)</label>
            <input type="number" style={styles.input} value={form.serviceIntervalDays} onChange={f('serviceIntervalDays')} min={1} placeholder="e.g. 90" />
          </div>
          <div>
            <label style={styles.label}>Last Service Date</label>
            <input type="date" style={styles.input} value={form.lastServiceDate} onChange={f('lastServiceDate')} />
          </div>
        </div>
        {nextServiceDate && (
          <div style={{ fontSize: 12, color: '#166534', background: '#e8f5e9', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>
            Next service date (auto): <strong>{nextServiceDate}</strong>
          </div>
        )}

        <label style={styles.label}>Service Sticker Photo (optional)</label>
        {equipment?.serviceStickerPhoto && (
          <div style={{ fontSize: 12, color: '#6c63ff', marginBottom: 6 }}>
            Current:{' '}
            <a href={`${UPLOADS_URL}/${equipment.serviceStickerPhoto.file}`} target="_blank" rel="noreferrer">
              {equipment.serviceStickerPhoto.name}
            </a>
          </div>
        )}
        <input type="file" accept="image/*" style={{ fontSize: 12, marginBottom: 14 }} onChange={e => setStickerFile(e.target.files[0] || null)} />

        <label style={styles.label}>Notes</label>
        <textarea style={{ ...styles.input, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={f('notes')} placeholder="Optional notes…" />

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add Equipment' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
