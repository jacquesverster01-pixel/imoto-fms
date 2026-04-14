import { useState, useEffect } from 'react'
import { Card, SaveRow } from './settingsUi'

export default function OvertimeSection({ settings, onSaved }) {
  const [tiers, setTiers] = useState([{ id: 'ot1', hoursOver: 0, multiplier: 1.5 }])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (settings?.overtime?.tiers?.length) setTiers(settings.overtime.tiers)
  }, [settings])

  function addTier() {
    const last = tiers[tiers.length - 1]
    setTiers(t => [...t, { id: `ot${Date.now()}`, hoursOver: (last?.hoursOver ?? 0) + 2, multiplier: 2.0 }])
  }

  function removeTier(id) {
    if (tiers.length <= 1) return
    setTiers(t => t.filter(r => r.id !== id))
  }

  function updateTier(id, field, val) {
    setTiers(t => t.map(r => r.id === id ? { ...r, [field]: val } : r))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ overtime: { tiers } })
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('Error')
    }
    setSaving(false)
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b' }}>Overtime settings</div>
        <button onClick={addTier}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#6c63ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          + Add tier
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#b0b5cc', marginBottom: 14 }}>
        Each tier sets the pay multiplier from its OT hour threshold onward. Tiers are applied from lowest to highest.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tiers.map((tier, i) => (
          <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid #f0f2f5' }}>
            <div style={{ fontSize: 11, color: '#b0b5cc', width: 18, textAlign: 'center', flexShrink: 0 }}>#{i + 1}</div>
            <span style={{ fontSize: 12, color: '#4a4f7a' }}>After</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={tier.hoursOver}
              onChange={e => updateTier(tier.id, 'hoursOver', Number(e.target.value))}
              style={{ width: 58, fontSize: 12, padding: '5px 8px', borderRadius: 7, border: '1px solid #e4e6ea', textAlign: 'center', outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
              onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
            />
            <span style={{ fontSize: 12, color: '#4a4f7a' }}>OT hours, pay at</span>
            <input
              type="number"
              min={1}
              max={5}
              step={0.25}
              value={tier.multiplier}
              onChange={e => updateTier(tier.id, 'multiplier', Number(e.target.value))}
              style={{ width: 58, fontSize: 12, padding: '5px 8px', borderRadius: 7, border: '1px solid #e4e6ea', textAlign: 'center', outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = '#6c63ff' }}
              onBlur={e => { e.target.style.borderColor = '#e4e6ea' }}
            />
            <span style={{ fontSize: 12, color: '#4a4f7a', flex: 1 }}>× normal rate</span>
            <button onClick={() => removeTier(tier.id)} disabled={tiers.length <= 1}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: tiers.length <= 1 ? '#fca5a5' : '#dc2626', cursor: tiers.length <= 1 ? 'default' : 'pointer' }}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <SaveRow onSave={handleSave} saving={saving} savedMsg={savedMsg} />
    </Card>
  )
}
