import { useState, useEffect } from 'react'
import { Card, Toggle } from './settingsUi'

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#4a4f7a', marginBottom: 4
}
const hintStyle = {
  fontSize: 11, color: '#b0b5cc', marginTop: 4, marginBottom: 12
}
const timeInputStyle = {
  fontSize: 12, padding: '7px 10px', borderRadius: 8,
  border: '1px solid #e4e6ea', outline: 'none',
  color: '#1a1d3b', background: '#fff', width: 120
}

const DEFAULT_AUTO = { enabled: false, clockOutTime: '16:00', deadlineTime: '23:59' }

export default function AutoClockOutSection({ settings, onSaved }) {
  const current = settings?.autoClockOut || DEFAULT_AUTO

  const [enabled, setEnabled] = useState(current.enabled ?? false)
  const [clockOutTime, setClockOutTime] = useState(current.clockOutTime || '16:00')
  const [deadlineTime, setDeadlineTime] = useState(current.deadlineTime || '23:59')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    const aco = settings?.autoClockOut
    if (!aco) return
    setEnabled(aco.enabled ?? false)
    setClockOutTime(aco.clockOutTime || '16:00')
    setDeadlineTime(aco.deadlineTime || '23:59')
    setDirty(false)
  }, [settings])

  function handleToggle(v) {
    setEnabled(v)
    setDirty(true)
  }

  function handleClockOutTime(v) {
    setClockOutTime(v)
    setDirty(true)
  }

  function handleDeadlineTime(v) {
    setDeadlineTime(v)
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ autoClockOut: { enabled, clockOutTime, deadlineTime } })
      setSavedMsg('Saved')
      setDirty(false)
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('Error')
    }
    setSaving(false)
  }

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b', marginBottom: 16 }}>Auto clock-out</div>

      <Toggle
        label="Enable automatic clock-out"
        hint="If an employee has not clocked out by the daily deadline, the system records a clock-out at the default clock-out time."
        value={enabled}
        onChange={handleToggle}
      />

      <div style={{ marginTop: 18, opacity: enabled ? 1 : 0.45 }}>
        <label style={labelStyle}>Default clock-out time</label>
        <input
          type="time"
          value={clockOutTime}
          onChange={e => handleClockOutTime(e.target.value)}
          disabled={!enabled}
          style={{ ...timeInputStyle, background: enabled ? '#fff' : '#f7f8fa', color: enabled ? '#1a1d3b' : '#b0b5cc' }}
          onFocus={e => { if (enabled) e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
        />
        <div style={hintStyle}>Employees still clocked in will have a clock-out recorded at this time.</div>

        <label style={labelStyle}>Daily deadline</label>
        <input
          type="time"
          value={deadlineTime}
          onChange={e => handleDeadlineTime(e.target.value)}
          disabled={!enabled}
          style={{ ...timeInputStyle, background: enabled ? '#fff' : '#f7f8fa', color: enabled ? '#1a1d3b' : '#b0b5cc' }}
          onFocus={e => { if (enabled) e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
        />
        <div style={hintStyle}>If no clock-out is recorded by this time, the default clock-out time above is applied for that day.</div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#b0b5cc', background: '#f7f8fa', borderRadius: 8, padding: '8px 12px' }}>
        The system checks every minute. Changes take effect on the next check — no server restart required.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14 }}>
        {savedMsg && (
          <span style={{ fontSize: 12, color: savedMsg === 'Saved' ? '#22c55e' : '#dc2626' }}>{savedMsg}</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{
            fontSize: 12, padding: '7px 18px', borderRadius: 8, border: 'none',
            background: (saving || !dirty) ? '#b0b5cc' : '#6c63ff', color: '#fff',
            cursor: (saving || !dirty) ? 'default' : 'pointer', fontWeight: 500
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Card>
  )
}
