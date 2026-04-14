import { useState } from 'react'
import { Card } from './settingsUi'

const modalBox = {
  background: '#fff', borderRadius: 14, padding: 24,
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)'
}
const cancelBtn = {
  fontSize: 12, padding: '7px 16px', borderRadius: 8,
  border: '1px solid #e4e6ea', background: '#fff', cursor: 'pointer', color: '#555'
}
const inputStyle = {
  width: '100%', fontSize: 12, padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e4e6ea', outline: 'none', marginBottom: 12,
  color: '#1a1d3b', boxSizing: 'border-box'
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#4a4f7a', marginBottom: 6
}

function Overlay({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {children}
    </div>
  )
}

function ShiftModal({ shift, onClose, onSave }) {
  const isNew = !shift
  const [name, setName] = useState(isNew ? '' : shift.name)
  const [startTime, setStartTime] = useState(isNew ? '07:00' : shift.startTime)
  const [endTime, setEndTime] = useState(isNew ? '17:00' : shift.endTime)
  const [grace, setGrace] = useState(isNew ? 15 : shift.graceMinutes)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ id: shift?.id || `SH${Date.now()}`, name: name.trim(), startTime, endTime, graceMinutes: Number(grace) })
    setSaving(false)
    onClose()
  }

  return (
    <Overlay>
      <div style={{ ...modalBox, width: 360 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d3b', marginBottom: 18 }}>
          {isNew ? 'Add shift' : 'Edit shift'}
        </h3>
        <label style={labelStyle}>Shift name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle}
          onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Start time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
              onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
              onBlur={e => { e.target.style.borderColor = '#e4e6ea' }} />
          </div>
          <div>
            <label style={labelStyle}>End time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
              onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
              onBlur={e => { e.target.style.borderColor = '#e4e6ea' }} />
          </div>
        </div>
        <label style={labelStyle}>Grace period (minutes)</label>
        <input type="number" min={0} max={60} value={grace} onChange={e => setGrace(e.target.value)} style={inputStyle}
          onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: saving || !name.trim() ? '#b0b5cc' : '#6c63ff', color: '#fff', cursor: 'pointer' }}>
            {saving ? 'Saving…' : isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

export default function ShiftsSection({ settings, onSaved }) {
  const [modal, setModal] = useState(null)
  const shifts = settings?.shifts || []

  async function handleSave(shiftData) {
    const exists = shifts.find(s => s.id === shiftData.id)
    const updated = exists ? shifts.map(s => s.id === shiftData.id ? shiftData : s) : [...shifts, shiftData]
    await onSaved({ shifts: updated })
  }

  async function handleRemove(id) {
    await onSaved({ shifts: shifts.filter(s => s.id !== id) })
  }

  return (
    <Card>
      {modal !== null && (
        <ShiftModal shift={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b' }}>Shift editor</div>
        <button onClick={() => setModal('add')}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#6c63ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          + Add shift
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shifts.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid #f0f2f5' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: '#b0b5cc' }}>
                {s.startTime} – {s.endTime} &nbsp;·&nbsp; {s.graceMinutes}min grace
              </div>
            </div>
            <button onClick={() => setModal(s)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e4e6ea', background: '#fff', color: '#9298c4', cursor: 'pointer' }}>
              Edit
            </button>
            <button onClick={() => handleRemove(s.id)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        ))}
      </div>
      {shifts.length === 0 && (
        <div style={{ textAlign: 'center', color: '#b0b5cc', fontSize: 12, padding: '24px 0' }}>
          No shifts defined. Add one above.
        </div>
      )}
    </Card>
  )
}
