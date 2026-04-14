import { useState, useEffect } from 'react'
import { Card, SaveRow } from './settingsUi'

const SA_LEAVE_DEFAULTS = { Annual: 15, Sick: 30, 'Family Responsibility': 3 }
const LEAVE_EDIT_COLORS = { Annual: '#6c63ff', Sick: '#ef4444', 'Family Responsibility': '#f59e0b' }

export default function LeaveEditorSection({ settings, onSaved }) {
  const [limits, setLimits] = useState({ ...SA_LEAVE_DEFAULTS })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (settings?.leaveLimits) setLimits(l => ({ ...l, ...settings.leaveLimits }))
  }, [settings])

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ leaveLimits: limits })
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('Error')
    }
    setSaving(false)
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b' }}>Leave editor</div>
        <button onClick={() => setLimits({ ...SA_LEAVE_DEFAULTS })}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#f4f5f7', color: '#5a5f8a', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          Reset to SA defaults
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#b0b5cc', marginBottom: 16, background: '#f7f8fa', borderRadius: 8, padding: '8px 12px' }}>
        SA national defaults (BCEA): Annual 15 days, Sick 30 days per 3-year cycle, Family Responsibility 3 days. Unpaid leave is unlimited.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.keys(SA_LEAVE_DEFAULTS).map(type => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid #f0f2f5' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: LEAVE_EDIT_COLORS[type], flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1a1d3b' }}>{type}</div>
            <input
              type="number"
              min={0}
              max={365}
              value={limits[type] ?? ''}
              onChange={e => setLimits(l => ({ ...l, [type]: Number(e.target.value) }))}
              style={{ width: 70, fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '1px solid #e4e6ea', textAlign: 'center', outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
              onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
            />
            <span style={{ fontSize: 11, color: '#b0b5cc', width: 60 }}>days / year</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid #f0f2f5', opacity: 0.5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9ca3af', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1a1d3b' }}>Unpaid</div>
          <span style={{ fontSize: 11, color: '#b0b5cc' }}>Unlimited — cannot be changed</span>
        </div>
      </div>
      <SaveRow onSave={handleSave} saving={saving} savedMsg={savedMsg} />
    </Card>
  )
}
