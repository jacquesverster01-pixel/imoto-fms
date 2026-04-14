import { useState, useEffect } from 'react'
import { Card, Field, SaveRow } from './settingsUi'

export default function CompanySection({ settings, onSaved }) {
  const [form, setForm] = useState({ name: '', reg: '', address: '', phone: '', email: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (settings?.company) setForm(f => ({ ...f, ...settings.company }))
  }, [settings])

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ company: form })
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('Error saving')
    }
    setSaving(false)
  }

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b', marginBottom: 16 }}>Company details</div>
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Company name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
        <Field label="Registration number" value={form.reg} onChange={v => setForm(f => ({ ...f, reg: v }))} />
        <Field label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
        <Field label="Contact number" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
        <Field label="Email" value={form.email} type="email" onChange={v => setForm(f => ({ ...f, email: v }))} />
        <Field label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} />
      </div>
      <SaveRow onSave={handleSave} saving={saving} savedMsg={savedMsg} />
    </Card>
  )
}
