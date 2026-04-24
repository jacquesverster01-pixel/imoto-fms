import { useState, useEffect } from 'react'
import { useGet, apiFetch } from '../../hooks/useApi'
import { Card } from './settingsUi'

const PHASE_CODE_REGEX = /^[A-Z]{3}[A-Z]\d{4,6}$/

function validateAssemblyPhases(phases) {
  const errors = {}
  const seen = new Set()
  phases.forEach((p, i) => {
    if (!PHASE_CODE_REGEX.test(p.code)) errors[`phase-${i}-code`] = 'Invalid code format'
    if (seen.has(p.code)) errors[`phase-${i}-code`] = 'Duplicate code'
    seen.add(p.code)
  })
  return errors
}

const cellStyle = { padding: '4px 6px', verticalAlign: 'middle' }
const inputBase = { fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '1px solid #e4e6ea', outline: 'none', color: '#1a1d3b' }
const errStyle  = { fontSize: 11, color: '#dc2626', marginTop: 2 }
const thStyle   = { fontSize: 11, color: '#b0b5cc', fontWeight: 500, textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #f0f2f5' }

export default function DeptCodesSettings() {
  const [prefixMappings, setPrefixMappings] = useState([])
  const [assemblyPhases, setAssemblyPhases] = useState([])
  const [discovered,     setDiscovered]     = useState({ discovered: [], mapped: [], unmapped: [] })
  const [phaseSearch,    setPhaseSearch]    = useState('')
  const [saving,         setSaving]         = useState(false)
  const [toast,          setToast]          = useState(null)
  const [errors,         setErrors]         = useState({})

  const { data: codesData, loading } = useGet('/dept-codes')
  const { data: discoveredData }     = useGet('/dept-codes/discovered-prefixes')
  const { data: settingsData }       = useGet('/settings')

  useEffect(() => {
    if (codesData) {
      setPrefixMappings(codesData.prefixMappings || [])
      setAssemblyPhases(codesData.assemblyPhases || [])
    }
  }, [codesData])

  useEffect(() => {
    if (discoveredData) setDiscovered(discoveredData)
  }, [discoveredData])

  useEffect(() => {
    setErrors(validateAssemblyPhases(assemblyPhases))
  }, [assemblyPhases])

  const departmentOptions = (settingsData?.departments || []).map(d =>
    typeof d === 'string' ? d : d.name
  )

  function getMappedDept(prefix) {
    return prefixMappings.find(m => m.prefix === prefix)?.department || ''
  }

  function handlePrefixDeptChange(prefix, dept) {
    if (!dept) {
      setPrefixMappings(m => m.filter(x => x.prefix !== prefix))
    } else {
      setPrefixMappings(m => {
        const exists = m.find(x => x.prefix === prefix)
        if (exists) return m.map(x => x.prefix === prefix ? { ...x, department: dept } : x)
        return [...m, { prefix, department: dept }]
      })
    }
  }

  function addPhase() {
    setAssemblyPhases(p => [...p, { code: '', phase: 'pre-assembly' }])
  }

  function removePhase(i) {
    setAssemblyPhases(p => p.filter((_, idx) => idx !== i))
  }

  function updatePhase(i, field, val) {
    setAssemblyPhases(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  async function handleSave() {
    if (Object.keys(errors).length > 0) return
    setSaving(true)
    try {
      await apiFetch('/dept-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixMappings, assemblyPhases })
      })
      setToast({ msg: 'Saved', type: 'success' })
    } catch (err) {
      setToast({ msg: `Save failed: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 2500)
    }
  }

  const filteredPhases = assemblyPhases
    .map((row, i) => ({ ...row, _idx: i }))
    .filter(row => row.code.toLowerCase().includes(phaseSearch.toLowerCase()))

  const { discovered: allDiscovered = [], mapped = [], unmapped = [] } = discovered
  const hasErrors = Object.keys(errors).length > 0

  if (loading && !codesData) {
    return <Card><div style={{ color: '#b0b5cc', fontSize: 13 }}>Loading…</div></Card>
  }

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b', marginBottom: 4 }}>Department Codes</div>
      <div style={{ fontSize: 11, color: '#b0b5cc', marginBottom: 20 }}>
        Map product code prefixes (auto-discovered from imported BOMs) to departments, and tag assembly codes as pre-assembly or installation.
      </div>

      {/* Panel 1 — Prefix Mappings */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4a4f7a' }}>Prefix Mappings</div>
          {allDiscovered.length > 0 && (
            <div style={{ fontSize: 11, color: '#9298c4' }}>
              {allDiscovered.length} discovered, {mapped.length} mapped, {unmapped.length} unmapped
            </div>
          )}
        </div>

        {allDiscovered.length === 0 ? (
          <div style={{ fontSize: 12, color: '#b0b5cc', padding: '12px 0' }}>
            No prefixes discovered yet. Import a BOM in Inventory → Imported BOMs to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Prefix</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allDiscovered.map(prefix => {
                const dept = getMappedDept(prefix)
                const isMapped = !!dept
                return (
                  <tr key={prefix}>
                    <td style={cellStyle}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12, color: '#1a1d3b' }}>{prefix}</span>
                    </td>
                    <td style={cellStyle}>
                      <select
                        value={dept}
                        onChange={e => handlePrefixDeptChange(prefix, e.target.value)}
                        style={{ ...inputBase, minWidth: 160, cursor: 'pointer' }}
                      >
                        <option value="">— Select —</option>
                        {departmentOptions.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </td>
                    <td style={cellStyle}>
                      {isMapped
                        ? <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>✓ Mapped</span>
                        : <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>⚠ Unmapped</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Panel 2 — Assembly Phase Tags */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4a4f7a' }}>Assembly Phase Tags</div>
          <div style={{ fontSize: 11, color: '#9298c4' }}>
            {assemblyPhases.length} mapping{assemblyPhases.length !== 1 ? 's' : ''}
          </div>
        </div>
        <input
          style={{ ...inputBase, width: '100%', marginBottom: 10, boxSizing: 'border-box' }}
          placeholder="Search by code…"
          value={phaseSearch}
          onChange={e => setPhaseSearch(e.target.value)}
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
                    <div>
                      <input
                        style={{ ...inputBase, width: 130 }}
                        value={row.code}
                        onChange={e => updatePhase(row._idx, 'code', e.target.value.toUpperCase())}
                        placeholder="ELEA000184"
                      />
                      {errors[`phase-${row._idx}-code`] && (
                        <div style={errStyle}>{errors[`phase-${row._idx}-code`]}</div>
                      )}
                    </div>
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

      {/* Save bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14 }}>
        {toast && (
          <span style={{ fontSize: 12, color: toast.type === 'success' ? '#22c55e' : '#dc2626' }}>{toast.msg}</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || hasErrors}
          style={{
            fontSize: 12, padding: '7px 18px', borderRadius: 8, border: 'none',
            background: saving || hasErrors ? '#b0b5cc' : '#6c63ff',
            color: '#fff',
            cursor: saving || hasErrors ? 'default' : 'pointer',
            fontWeight: 500
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Card>
  )
}
