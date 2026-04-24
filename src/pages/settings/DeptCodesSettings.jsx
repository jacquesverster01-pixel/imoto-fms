import { useState, useEffect } from 'react'
import { useGet, apiFetch } from '../../hooks/useApi'
import { Card } from './settingsUi'

const PREFIX_REGEX = /^[A-Z]{3}$/
const CODE_REGEX = /^[A-Z]{3}[A-Z]\d{6}$/

function validatePrefixes(prefixes) {
  const errors = {}
  const seen = new Set()
  prefixes.forEach((row, i) => {
    if (!PREFIX_REGEX.test(row.prefix)) {
      errors[`p_${i}`] = 'Must be exactly 3 uppercase letters'
    } else if (seen.has(row.prefix)) {
      errors[`p_${i}`] = 'Duplicate prefix'
    } else {
      seen.add(row.prefix)
    }
    if (!row.department?.trim()) errors[`d_${i}`] = 'Required'
  })
  return errors
}

function validatePhases(phases) {
  const errors = {}
  const seen = new Set()
  phases.forEach((row, i) => {
    if (!CODE_REGEX.test(row.code)) {
      errors[`c_${i}`] = 'Must match XXXYDDDDDD (e.g. ELEA000184)'
    } else if (seen.has(row.code)) {
      errors[`c_${i}`] = 'Duplicate code'
    } else {
      seen.add(row.code)
    }
  })
  return errors
}

const cellStyle = { padding: '4px 6px', verticalAlign: 'top' }
const inputBase = { fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '1px solid #e4e6ea', outline: 'none', color: '#1a1d3b' }
const errStyle = { fontSize: 11, color: '#dc2626', marginTop: 2 }
const thStyle = { fontSize: 11, color: '#b0b5cc', fontWeight: 500, textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #f0f2f5' }

export default function DeptCodesSettings() {
  const { data, loading } = useGet('/dept-codes')
  const [prefixes, setPrefixes] = useState([])
  const [phases, setPhases] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (data) {
      setPrefixes(data.prefixes || [])
      setPhases(data.assemblyPhases || [])
    }
  }, [data])

  const prefixErrors = validatePrefixes(prefixes)
  const phaseErrors = validatePhases(phases)
  const hasErrors = Object.keys(prefixErrors).length > 0 || Object.keys(phaseErrors).length > 0

  function addPrefix() {
    setPrefixes(p => [...p, { prefix: '', department: '', colour: '#6c63ff' }])
  }
  function removePrefix(i) {
    setPrefixes(p => p.filter((_, idx) => idx !== i))
  }
  function updatePrefix(i, field, val) {
    setPrefixes(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function addPhase() {
    setPhases(p => [...p, { code: '', phase: 'pre-assembly' }])
  }
  function removePhase(i) {
    setPhases(p => p.filter((_, idx) => idx !== i))
  }
  function updatePhase(i, field, val) {
    setPhases(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  async function handleSave() {
    if (hasErrors) return
    setSaving(true)
    try {
      await apiFetch('/dept-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes, assemblyPhases: phases })
      })
      setSavedMsg('Saved')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('Error')
    } finally {
      setSaving(false)
    }
  }

  const filteredPhases = phases
    .map((row, i) => ({ ...row, _idx: i }))
    .filter(row => row.code.toLowerCase().includes(search.toLowerCase()))

  if (loading && !data) {
    return <Card><div style={{ color: '#b0b5cc', fontSize: 13 }}>Loading…</div></Card>
  }

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b', marginBottom: 4 }}>Department Codes</div>
      <div style={{ fontSize: 11, color: '#b0b5cc', marginBottom: 20 }}>
        Map 3-letter product code prefixes to departments, and assign full assembly codes to production phases.
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#4a4f7a', marginBottom: 10 }}>Prefix Mappings</div>
        {prefixes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={thStyle}>Prefix</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Colour</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {prefixes.map((row, i) => (
                <tr key={i}>
                  <td style={cellStyle}>
                    <input
                      style={{ ...inputBase, width: 60 }}
                      maxLength={3}
                      value={row.prefix}
                      onChange={e => updatePrefix(i, 'prefix', e.target.value.toUpperCase())}
                      placeholder="ELE"
                    />
                    {prefixErrors[`p_${i}`] && <div style={errStyle}>{prefixErrors[`p_${i}`]}</div>}
                  </td>
                  <td style={cellStyle}>
                    <input
                      style={{ ...inputBase, width: 160 }}
                      value={row.department}
                      onChange={e => updatePrefix(i, 'department', e.target.value)}
                      placeholder="Electrical"
                    />
                    {prefixErrors[`d_${i}`] && <div style={errStyle}>{prefixErrors[`d_${i}`]}</div>}
                  </td>
                  <td style={cellStyle}>
                    <input
                      type="color"
                      value={row.colour}
                      onChange={e => updatePrefix(i, 'colour', e.target.value)}
                      style={{ width: 40, height: 30, borderRadius: 6, border: '1px solid #e4e6ea', cursor: 'pointer', padding: 2 }}
                    />
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => removePrefix(i)}
                      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          onClick={addPrefix}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#f4f5f7', color: '#5a5f8a', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          + Add Prefix
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#4a4f7a', marginBottom: 10 }}>Assembly Phase Mappings</div>
        <input
          style={{ ...inputBase, width: '100%', marginBottom: 10, boxSizing: 'border-box' }}
          placeholder="Search by code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {filteredPhases.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Phase</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {filteredPhases.map(row => (
                <tr key={row._idx}>
                  <td style={cellStyle}>
                    <input
                      style={{ ...inputBase, width: 130 }}
                      value={row.code}
                      onChange={e => updatePhase(row._idx, 'code', e.target.value.toUpperCase())}
                      placeholder="ELEA000184"
                    />
                    {phaseErrors[`c_${row._idx}`] && <div style={errStyle}>{phaseErrors[`c_${row._idx}`]}</div>}
                  </td>
                  <td style={cellStyle}>
                    <select
                      value={row.phase}
                      onChange={e => updatePhase(row._idx, 'phase', e.target.value)}
                      style={{ ...inputBase, cursor: 'pointer' }}
                    >
                      <option value="pre-assembly">pre-assembly</option>
                      <option value="installation">installation</option>
                    </select>
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => removePhase(row._idx)}
                      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          onClick={addPhase}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#f4f5f7', color: '#5a5f8a', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          + Add Phase Mapping
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14 }}>
        {savedMsg && (
          <span style={{ fontSize: 12, color: savedMsg === 'Saved' ? '#22c55e' : '#dc2626' }}>{savedMsg}</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || hasErrors}
          style={{
            fontSize: 12, padding: '7px 18px', borderRadius: 8, border: 'none',
            background: saving || hasErrors ? '#b0b5cc' : '#6c63ff', color: '#fff',
            cursor: saving || hasErrors ? 'default' : 'pointer', fontWeight: 500
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Card>
  )
}
