import { useState, useEffect } from 'react'
import { Card, Toggle, SaveRow } from './settingsUi'

export default function AlertRulesSection({ settings, onSaved }) {
  const [alerts, setAlerts] = useState({
    staffConstraint: true, toolOverdue: true, stockLevel: true,
    certExpiry: true, absentImpact: true, dailySummary: false
  })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (settings?.alerts) setAlerts(a => ({ ...a, ...settings.alerts }))
  }, [settings])

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ alerts })
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('Error')
    }
    setSaving(false)
  }

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b', marginBottom: 16 }}>Alert rules</div>
      <Toggle label="Staff constraint warnings" hint="Alert when leave conflicts with scheduled production jobs" value={alerts.staffConstraint} onChange={v => setAlerts(a => ({ ...a, staffConstraint: v }))} />
      <Toggle label="Tool overdue alerts" hint="Alert when a tool has not been returned past its due date" value={alerts.toolOverdue} onChange={v => setAlerts(a => ({ ...a, toolOverdue: v }))} />
      <Toggle label="Stock level alerts" hint="Alert when stock falls below minimum levels" value={alerts.stockLevel} onChange={v => setAlerts(a => ({ ...a, stockLevel: v }))} />
      <Toggle label="Certification expiry alerts" hint="Alert when certifications are within 30 days of expiry" value={alerts.certExpiry} onChange={v => setAlerts(a => ({ ...a, certExpiry: v }))} />
      <Toggle label="Absent employee production impact" hint="Flag production jobs when assigned employees are absent" value={alerts.absentImpact} onChange={v => setAlerts(a => ({ ...a, absentImpact: v }))} />
      <Toggle label="Daily attendance summary" hint="Send a daily summary of who clocked in and who did not" value={alerts.dailySummary} onChange={v => setAlerts(a => ({ ...a, dailySummary: v }))} />
      <SaveRow onSave={handleSave} saving={saving} savedMsg={savedMsg} />
    </Card>
  )
}
