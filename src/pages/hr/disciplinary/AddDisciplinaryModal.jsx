import { useState } from 'react'
import { useGet, apiFetch, BASE } from '../../../hooks/useApi'
import { styles } from '../../../utils/hrStyles'
import {
  printWarningLetter,
  DISC_TYPES,
  DISC_TEMPLATES,
  DISC_GUIDANCE,
  applyTemplateReplacements,
  applyFieldReplacements,
} from './printWarningLetter'
import DiscTemplatePanel from './DiscTemplatePanel'

export default function AddDisciplinaryModal({ employee, record, onClose, onSaved }) {
  const isNew = !record
  const [type, setType] = useState(isNew ? 'Verbal warning' : record.type)
  const [date, setDate] = useState(isNew ? '' : record.date || '')
  const [reason, setReason] = useState(isNew ? '' : record.reason || '')
  const [outcome, setOutcome] = useState(isNew ? '' : record.outcome || '')
  const [hearingDate, setHearingDate] = useState(isNew ? '' : record.hearingDate || '')
  const [chairperson, setChairperson] = useState(isNew ? '' : record.chairperson || '')
  const [pendingFile, setPendingFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
  const [panelText, setPanelText] = useState('')
  const [basePanelText, setBasePanelText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [guidanceOpen, setGuidanceOpen] = useState(true)
  const [templateFieldValues, setTemplateFieldValues] = useState({})
  const { data: settingsData } = useGet('/settings')

  function handleTemplateChange(e) {
    const label = e.target.value
    if (!label) return
    const tpl = DISC_TEMPLATES.find(t => t.label === label)
    if (!tpl) return
    const replaced = applyTemplateReplacements(tpl.reason, employee)
    setSelectedTemplate(label)
    setBasePanelText(replaced)
    setPanelText(replaced)
    setTemplateFieldValues({})
    setGuidanceOpen(true)
    setTemplatePanelOpen(true)
  }

  function handleFieldChange(key, value) {
    const updated = { ...templateFieldValues, [key]: value }
    setTemplateFieldValues(updated)
    setPanelText(applyFieldReplacements(basePanelText, updated))
  }

  function applyPanelText() {
    setReason(panelText)
    setTemplatePanelOpen(false)
    setSelectedTemplate('')
    setTemplateFieldValues({})
  }

  function cancelPanel() {
    setTemplatePanelOpen(false)
    setSelectedTemplate('')
    setTemplateFieldValues({})
  }

  async function handleSave() {
    if (!date || !reason.trim()) { setError('Date and reason are required.'); return }
    setSaving(true)
    setError('')
    try {
      const body = {
        employeeId: employee.id,
        employeeName: employee.name,
        dept: employee.dept || '',
        type,
        date,
        reason: reason.trim(),
        outcome: outcome.trim(),
        hearingDate: hearingDate || null,
        chairperson: chairperson.trim() || null,
      }
      let saved
      if (isNew) {
        saved = await apiFetch('/disciplinary', { method: 'POST', body: JSON.stringify(body) })
      } else {
        saved = await apiFetch(`/disciplinary/${record.id}`, { method: 'PUT', body: JSON.stringify(body) })
      }
      if (pendingFile && saved?.id) {
        const fd = new FormData()
        fd.append('file', pendingFile)
        await fetch(`${BASE}/disciplinary/${saved.id}/upload`, { method: 'POST', body: fd })
      }
      onSaved()
    } catch (err) {
      console.error('Save failed:', err)
      setError('Save failed. Check the server is running on port 3001.')
    } finally {
      setSaving(false)
    }
  }

  const guidance = DISC_GUIDANCE[selectedTemplate] || null
  const remainingPlaceholders = templatePanelOpen
    ? (panelText.match(/\[[A-Z][A-Z\s/]+\]/g) || [])
    : []

  return (
    <div style={styles.overlay}>
      <div style={{
        ...styles.modal,
        width: templatePanelOpen ? 1210 : 560,
        maxWidth: '98vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        transition: 'width 300ms ease',
      }}>

        {/* Left: main form */}
        <div style={{ width: 560, flexShrink: 0, padding: 28, overflowY: 'auto', maxHeight: '90vh' }}>
          <h3 style={styles.modalTitle}>{isNew ? 'Add Disciplinary Record' : 'Edit Record'} — {employee.name}</h3>
          {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{error}</div>}

          <label style={styles.label}>Type</label>
          <select style={styles.input} value={type} onChange={e => setType(e.target.value)}>
            {DISC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label style={styles.label}>Incident date</label>
          <input type="date" style={styles.input} value={date} onChange={e => setDate(e.target.value)} />

          <label style={styles.label}>Use a template</label>
          <select
            style={{ ...styles.input, color: selectedTemplate ? '#1e293b' : '#94a3b8' }}
            value={selectedTemplate}
            onChange={handleTemplateChange}
          >
            <option value="">— Select a template to pre-fill reason —</option>
            {DISC_TEMPLATES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
          </select>

          <label style={styles.label}>Reason / misconduct description *</label>
          <textarea
            style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />

          <label style={styles.label}>Outcome / sanction applied</label>
          <textarea
            style={{ ...styles.input, minHeight: 60, resize: 'vertical' }}
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
            <div>
              <label style={styles.label}>Hearing date <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
              <input type="date" style={{ ...styles.input, marginBottom: 0 }} value={hearingDate} onChange={e => setHearingDate(e.target.value)} />
            </div>
            <div>
              <label style={styles.label}>Chairperson <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
              <input style={{ ...styles.input, marginBottom: 0 }} value={chairperson} onChange={e => setChairperson(e.target.value)} placeholder="Name" />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>Attach document (PDF or image)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setPendingFile(e.target.files[0] || null)}
              style={{ fontSize: 12, marginBottom: 4, display: 'block' }}
            />
            {!isNew && record.attachments?.length > 0 && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                Existing: {record.attachments.map(a => a.name || a).join(', ')}
              </div>
            )}
          </div>

          <div style={{ ...styles.modalBtns, marginTop: 20 }}>
            <button style={styles.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
            <button
              style={styles.btnPrimary}
              onClick={handleSave}
              disabled={saving || !date || !reason.trim()}
            >
              {saving ? 'Saving…' : isNew ? 'Add record' : 'Save changes'}
            </button>
          </div>
        </div>

        <DiscTemplatePanel
          templatePanelOpen={templatePanelOpen}
          selectedTemplate={selectedTemplate}
          guidance={guidance}
          guidanceOpen={guidanceOpen}
          setGuidanceOpen={setGuidanceOpen}
          panelText={panelText}
          setPanelText={setPanelText}
          templateFieldValues={templateFieldValues}
          handleFieldChange={handleFieldChange}
          remainingPlaceholders={remainingPlaceholders}
          applyPanelText={applyPanelText}
          cancelPanel={cancelPanel}
          onPrint={() => printWarningLetter(
            employee,
            { type, date, hearingDate, chairperson },
            panelText,
            settingsData,
          )}
        />

      </div>
    </div>
  )
}
