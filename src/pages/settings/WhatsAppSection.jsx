import { useState, useEffect } from 'react'
import { Card, Field, Toggle, SaveRow } from './settingsUi'

export default function WhatsAppSection({ settings, onSaved }) {
  const [wa, setWa] = useState({
    enabled: false, twilioSid: '', twilioToken: '', number: '', checkinTime: '08:00',
    clockinReminders: false, leaveViaWhatsapp: false, sickNotePhoto: false,
    requireNoteMonFri: false, requireNoteAfter2: false
  })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (settings?.whatsapp) setWa(w => ({ ...w, ...settings.whatsapp }))
  }, [settings])

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ whatsapp: wa })
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('Error')
    }
    setSaving(false)
  }

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b', marginBottom: 16 }}>WhatsApp bot</div>
      <Toggle label="Enable WhatsApp bot" hint="Requires Twilio or 360dialog account" value={wa.enabled} onChange={v => setWa(w => ({ ...w, enabled: v }))} />
      <div style={{ marginTop: 14 }}>
        <Field label="Twilio Account SID" value={wa.twilioSid} onChange={v => setWa(w => ({ ...w, twilioSid: v }))} hint="Find this in your Twilio console dashboard" />
        <Field label="Twilio Auth Token" value={wa.twilioToken} onChange={v => setWa(w => ({ ...w, twilioToken: v }))} type="password" />
        <Field label="WhatsApp number" value={wa.number} onChange={v => setWa(w => ({ ...w, number: v }))} hint="Format: +27821234567" />
        <Field label="Morning check-in time" value={wa.checkinTime} onChange={v => setWa(w => ({ ...w, checkinTime: v }))} type="time" hint="Time to send clock-in reminders to absent employees" />
      </div>
      <Toggle label="Clock-in reminders" hint="Message employees who have not clocked in by the check-in time" value={wa.clockinReminders} onChange={v => setWa(w => ({ ...w, clockinReminders: v }))} />
      <Toggle label="Leave applications via WhatsApp" hint="Allow employees to apply for leave through the bot" value={wa.leaveViaWhatsapp} onChange={v => setWa(w => ({ ...w, leaveViaWhatsapp: v }))} />
      <Toggle label="Sick note photo upload" hint="Allow employees to send sick note photos via WhatsApp" value={wa.sickNotePhoto} onChange={v => setWa(w => ({ ...w, sickNotePhoto: v }))} />
      <Toggle label="Require doctor note on Monday or Friday" hint="Automatically require a note for Monday and Friday absences" value={wa.requireNoteMonFri} onChange={v => setWa(w => ({ ...w, requireNoteMonFri: v }))} />
      <Toggle label="Require note after 2 sick days in 6 weeks" hint="Enforce sick note rule based on rolling 6-week absence count" value={wa.requireNoteAfter2} onChange={v => setWa(w => ({ ...w, requireNoteAfter2: v }))} />
      <SaveRow onSave={handleSave} saving={saving} savedMsg={savedMsg} />
    </Card>
  )
}
