import { useState } from 'react'
import { apiFetch, BASE } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'
import EmployeeDocSlots from './EmployeeDocSlots'

const DOC_SLOTS = [
  { key: 'cv',             label: 'CV / Résumé' },
  { key: 'driversLicense', label: "Driver's Licence" },
  { key: 'contract',       label: 'Signed Contract' },
  { key: 'teamInfoSheet',  label: 'Team Info Sheet' },
  { key: 'workPermit',     label: 'Work Permit' },
]

function SectionHeading({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 20, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f0f2f5' }}>
      {children}
    </div>
  )
}

export default function EmployeeEditModal({ employee, onClose, onSaved, departments = [], shifts = [] }) {
  const nameParts = (employee.name || '').split(' ')
  const [form, setForm] = useState({
    firstName:  employee.firstName  || nameParts[0]              || '',
    lastName:   employee.lastName   || nameParts.slice(1).join(' ') || '',
    dept:       employee.dept       || '',
    color:      employee.color      || '#6c63ff',
    idNumber:   employee.idNumber   || '',
    taxNumber:  employee.taxNumber  || '',
    shift:      employee.shift      || '',
    hourlyRate: employee.hourlyRate != null ? String(employee.hourlyRate) : '',
  })
  const [saving, setSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [pendingDocs, setPendingDocs] = useState({})
  const [skippedDocs, setSkippedDocs] = useState(() => new Set(
    Object.entries(employee.documents || {})
      .filter(([, v]) => v?.skipped)
      .map(([k]) => k)
  ))

  const existingDocs = employee.documents || {}

  function toggleSkip(key) {
    setSkippedDocs(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function setDoc(key, file) {
    setPendingDocs(p => ({ ...p, [key]: file }))
  }

  function f(key) { return e => setForm(prev => ({ ...prev, [key]: e.target.value })) }

  async function handleSave() {
    setSaving(true)
    try {
      const first = form.firstName.trim()
      const last  = form.lastName.trim()
      const name  = first && last ? `${first} ${last}` : first || last || employee.name

      const docsUpdate = { ...(employee.documents || {}) }
      for (const slot of DOC_SLOTS) {
        const hasUploadedFile = pendingDocs[slot.key] || docsUpdate[slot.key]?.file
        if (!hasUploadedFile) {
          if (skippedDocs.has(slot.key)) {
            docsUpdate[slot.key] = { skipped: true }
          } else {
            delete docsUpdate[slot.key]
          }
        }
      }

      await apiFetch(`/employees/${employee.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          firstName:  first,
          lastName:   last,
          dept:       form.dept,
          color:      form.color,
          idNumber:   form.idNumber.trim(),
          taxNumber:  form.taxNumber.trim(),
          shift:      form.shift,
          hourlyRate: form.hourlyRate !== '' ? parseFloat(form.hourlyRate) : null,
          documents:  docsUpdate,
        })
      })
      for (const key of Object.keys(pendingDocs)) {
        if (!pendingDocs[key]) continue
        const fd = new FormData()
        fd.append('file', pendingDocs[key])
        fd.append('docType', key)
        await fetch(`${BASE}/employees/${employee.id}/upload`, { method: 'POST', body: fd })
      }
      onSaved()
    } catch (err) {
      console.error('Save employee failed:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await apiFetch(`/employees/${employee.id}`, { method: 'DELETE' })
      onSaved()
    } catch (err) {
      console.error('Remove employee failed:', err)
    } finally {
      setRemoving(false)
    }
  }

  const avatarInitials = (form.firstName[0] || '').toUpperCase() + (form.lastName[0] || '').toUpperCase()

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, width: 460, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
            {avatarInitials || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e1f3b' }}>{employee.name}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{employee.id}{employee.zkUserId ? ` · ZK ${employee.zkUserId}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}>✕</button>
        </div>

        <SectionHeading>Personal Info</SectionHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={styles.label}>First name</label>
            <input style={styles.input} value={form.firstName} onChange={f('firstName')} placeholder="First name" />
          </div>
          <div>
            <label style={styles.label}>Last name</label>
            <input style={styles.input} value={form.lastName} onChange={f('lastName')} placeholder="Last name" />
          </div>
        </div>
        <label style={styles.label}>ID / Passport number</label>
        <input style={styles.input} value={form.idNumber} onChange={f('idNumber')} placeholder="e.g. 9001015009087" />
        <label style={styles.label}>Tax number</label>
        <input style={styles.input} value={form.taxNumber} onChange={f('taxNumber')} placeholder="e.g. 1234567890" />

        <SectionHeading>Employment</SectionHeading>
        <label style={styles.label}>Department</label>
        <select style={styles.input} value={form.dept} onChange={f('dept')}>
          <option value="">— select department —</option>
          {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <label style={styles.label}>Shift</label>
        <select style={styles.input} value={form.shift} onChange={f('shift')}>
          <option value="">— select shift —</option>
          {shifts.map(s => <option key={s.id} value={s.name}>{s.name} ({s.startTime}–{s.endTime})</option>)}
        </select>
        <label style={styles.label}>Hourly rate (R)</label>
        <input style={styles.input} type="number" min="0" step="0.01" value={form.hourlyRate} onChange={f('hourlyRate')} placeholder="e.g. 125.00" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <label style={{ ...styles.label, marginBottom: 0 }}>Colour</label>
          <input type="color" value={form.color} onChange={f('color')} style={{ cursor: 'pointer', width: 36, height: 30, border: '1px solid #e4e6ea', borderRadius: 6 }} />
        </div>

        <SectionHeading>Documents</SectionHeading>
        <EmployeeDocSlots
          docSlots={DOC_SLOTS}
          existingDocs={existingDocs}
          pendingDocs={pendingDocs}
          skippedDocs={skippedDocs}
          setDoc={setDoc}
          toggleSkip={toggleSkip}
          employeeId={employee.id}
        />

        <div style={{ marginTop: 16, marginBottom: 16 }}>
          {!confirmRemove ? (
            <button onClick={() => setConfirmRemove(true)} style={{ ...styles.btnSmall, background: '#fee2e2', color: '#dc2626', width: '100%', padding: '8px 0', fontSize: 12 }}>
              Remove Employee
            </button>
          ) : (
            <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Remove {employee.name}?</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>This cannot be undone. Their time log and leave records will remain.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleRemove} disabled={removing} style={{ ...styles.btnSmall, background: '#dc2626', color: '#fff', flex: 1, padding: '7px 0' }}>
                  {removing ? 'Removing…' : 'Yes, remove'}
                </button>
                <button onClick={() => setConfirmRemove(false)} style={{ ...styles.btnSmall, background: '#f3f4f6', color: '#555', flex: 1, padding: '7px 0' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.modalBtns}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
