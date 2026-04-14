import { useState, useEffect } from 'react'
import { Card, Toggle, SaveRow } from './settingsUi'

const inputStyle = {
  width: '100%', fontSize: 12, padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e4e6ea', outline: 'none', marginBottom: 12,
  color: '#1a1d3b', boxSizing: 'border-box'
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#4a4f7a', marginBottom: 6
}

export default function AutoClockOutSection({ settings, onSaved }) {
  const [form, setForm] = useState({ enabled: false, time: '17:00' })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (settings?.autoClockOut) setForm(f => ({ ...f, ...settings.autoClockOut }))
  }, [settings])

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ autoClockOut: form })
      setSavedMsg('Saved')
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
        label="Enable auto clock-out"
        hint="Automatically clock out all employees still on shift at the set time"
        value={form.enabled}
        onChange={v => setForm(f => ({ ...f, enabled: v }))}
      />
      <div style={{ marginTop: 14 }}>
        <label style={{ ...labelStyle, color: form.enabled ? '#4a4f7a' : '#b0b5cc' }}>Auto clock-out time</label>
        <input
          type="time"
          value={form.time}
          onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
          disabled={!form.enabled}
          style={{ ...inputStyle, width: 140, marginBottom: 0, background: !form.enabled ? '#f7f8fa' : '#fff', color: !form.enabled ? '#b0b5cc' : '#1a1d3b' }}
          onFocus={e => { if (form.enabled) e.target.style.borderColor = '#6c63ff' }}
          onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
        />
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#b0b5cc', background: '#f7f8fa', borderRadius: 8, padding: '8px 12px' }}>
        The server must be running at the set time for auto clock-out to trigger.
      </div>
      <SaveRow onSave={handleSave} saving={saving} savedMsg={savedMsg} />
    </Card>
  )
}
