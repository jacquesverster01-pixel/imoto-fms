import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { buildTasksFromBom } from '../inventory/bom/bomUtils'

const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '8px 10px',
  border: '1px solid #e4e6ea', borderRadius: 6, fontSize: 13,
  boxSizing: 'border-box', outline: 'none'
}

export default function NewJobModal({ boms, onClose, onCreated }) {
  const [mode, setMode] = useState('scratch')
  const [name, setName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedBomId, setSelectedBomId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleBomSelect = (bomId) => {
    setSelectedBomId(bomId)
    if (bomId && !name) {
      const bom = (boms || []).find(b => b.id === bomId)
      if (bom) setName(bom.productDescription)
    }
  }

  const handleScratchCreate = async () => {
    if (!name.trim()) { setError('Name required'); return }
    setSaving(true)
    try {
      const created = await apiFetch('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name.trim(), dueDate, status: 'planned', tasks: [] })
      })
      onCreated(created.id)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBomImport = async () => {
    if (!selectedBomId) { setError('Select a BOM'); return }
    setSaving(true)
    try {
      const bom = await apiFetch(`/boms/${selectedBomId}`)
      const tasks = buildTasksFromBom(bom?.items || [])
      const created = await apiFetch('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name.trim() || bom.productDescription,
          dueDate,
          status: 'planned',
          sourceBomId: bom.id,
          sourceProductCode: bom.productCode,
          tasks
        })
      })
      onCreated(created.id)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 440,
        maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1d3b', marginBottom: 16 }}>New Job</div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e4e6ea', marginBottom: 20 }}>
          {[['scratch', 'From Scratch'], ['bom', 'From BOM']].map(([tab, label]) => (
            <button key={tab} onClick={() => { setMode(tab); setError(null) }}
              style={{
                padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: mode === tab ? 600 : 400,
                color: mode === tab ? '#6c63ff' : '#9298c4',
                borderBottom: `2px solid ${mode === tab ? '#6c63ff' : 'transparent'}`,
                marginBottom: -1
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'bom' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b' }}>BOM</label>
              <select value={selectedBomId} onChange={e => handleBomSelect(e.target.value)} style={inputStyle}>
                <option value="">— Select a BOM —</option>
                {(boms || []).map(b => (
                  <option key={b.id} value={b.id}>{b.productCode} — {b.productDescription}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b' }}>
              Job Name {mode === 'scratch' ? '*' : ''}
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={mode === 'bom' ? 'Defaults to BOM product description' : 'e.g. Unit 42 Build'}
              style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1a1d3b' }}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
          </div>

          {mode === 'bom' && (
            <div style={{ fontSize: 11, color: '#9298c4', padding: '8px 10px',
              background: '#f7f8fa', borderRadius: 6 }}>
              Tasks will be created from each Assembly-type row in the BOM. You can edit them after import.
            </div>
          )}
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: '#dc2626' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e4e6ea',
              background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#9298c4' }}>
            Cancel
          </button>
          <button onClick={mode === 'scratch' ? handleScratchCreate : handleBomImport}
            disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none',
              background: saving ? '#b0b5cc' : '#6c63ff', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : mode === 'scratch' ? 'Create Job' : 'Import & Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
