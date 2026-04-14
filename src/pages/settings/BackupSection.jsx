import { useState } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { Card } from './settingsUi'

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const modalBox = {
  background: '#fff', borderRadius: 14, padding: 24,
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)'
}
const cancelBtn = {
  fontSize: 12, padding: '7px 16px', borderRadius: 8,
  border: '1px solid #e4e6ea', background: '#fff', cursor: 'pointer', color: '#555'
}

function Overlay({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {children}
    </div>
  )
}

function ResetModal({ onClose, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleReset() {
    setBusy(true)
    await onConfirm()
    setBusy(false)
    onClose()
  }

  return (
    <Overlay>
      <div style={{ ...modalBox, width: 360 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>
          Reset operational data
        </h3>
        <p style={{ fontSize: 12, color: '#555', marginBottom: 8, lineHeight: 1.6 }}>
          This will permanently clear all <strong>time logs, leave records, jobs, tools, and stock</strong>.
          Employee records will be kept.
        </p>
        <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, marginBottom: 14 }}>
          This cannot be undone.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#dc2626', marginBottom: 18, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          I understand — reset all operational data
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button
            onClick={handleReset}
            disabled={!confirmed || busy}
            style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8, border: 'none', background: !confirmed || busy ? '#fca5a5' : '#dc2626', color: '#fff', cursor: !confirmed || busy ? 'default' : 'pointer' }}
          >
            {busy ? 'Resetting…' : 'Reset data'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

export default function BackupSection() {
  const [resetModal, setResetModal] = useState(false)
  const [busy, setBusy] = useState({})

  async function handleExportJson() {
    setBusy(b => ({ ...b, json: true }))
    try {
      const data = await apiFetch('/settings/export')
      const date = new Date().toISOString().slice(0, 10)
      downloadBlob(`imoto-fms-backup-${date}.json`, JSON.stringify(data, null, 2), 'application/json')
    } catch (e) {
      alert('Export failed: ' + e.message)
    }
    setBusy(b => ({ ...b, json: false }))
  }

  async function handleExportCsv() {
    setBusy(b => ({ ...b, csv: true }))
    try {
      const [timelog, empData] = await Promise.all([apiFetch('/timelog'), apiFetch('/employees')])
      const employees = empData?.employees || []
      const empMap = {}
      employees.forEach(e => { empMap[e.id] = e.name })
      const header = 'ID,Employee,Date,Time,Type,Source'
      const rows = timelog.map(t => {
        const sast = new Date(new Date(t.timestamp).getTime() + 2 * 60 * 60 * 1000)
        const date = sast.toISOString().slice(0, 10)
        const time = sast.toISOString().slice(11, 16)
        const name = empMap[t.employeeId] || t.employeeId
        return [t.id, `"${name}"`, date, time, t.type || '', t.source || 'manual'].join(',')
      })
      const exportDate = new Date().toISOString().slice(0, 10)
      downloadBlob(`imoto-timelog-${exportDate}.csv`, [header, ...rows].join('\n'), 'text/csv')
    } catch (e) {
      alert('Export failed: ' + e.message)
    }
    setBusy(b => ({ ...b, csv: false }))
  }

  async function handleImportCsv(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').filter(Boolean)
    if (lines.length < 2) { alert('CSV must have a header row and at least one data row'); return }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const nameIdx = header.indexOf('name')
    const deptIdx = header.indexOf('dept')
    const colorIdx = header.indexOf('color')
    if (nameIdx === -1) { alert('CSV must have a "name" column'); return }
    setBusy(b => ({ ...b, import: true }))
    let count = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const name = cols[nameIdx]
      if (!name) continue
      const dept = deptIdx !== -1 ? cols[deptIdx] : ''
      const color = colorIdx !== -1 && cols[colorIdx] ? cols[colorIdx] : '#6c63ff'
      try {
        await apiFetch('/employees', { method: 'POST', body: JSON.stringify({ name, dept, color }) })
        count++
      } catch { /* skip invalid rows */ }
    }
    setBusy(b => ({ ...b, import: false }))
    alert(`Imported ${count} employee${count !== 1 ? 's' : ''}`)
    e.target.value = ''
  }

  async function handleReset() {
    await apiFetch('/settings/reset', { method: 'POST', body: '{}' })
  }

  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', borderRadius: 10, border: '1px solid #f0f2f5'
  }

  return (
    <Card>
      {resetModal && <ResetModal onClose={() => setResetModal(false)} onConfirm={handleReset} />}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d3b', marginBottom: 16 }}>Data & backup</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        <div style={rowStyle}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1d3b' }}>Export all data to JSON</div>
            <div style={{ fontSize: 11, color: '#b0b5cc' }}>Download a full backup of all system data</div>
          </div>
          <button
            onClick={handleExportJson}
            disabled={busy.json}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: busy.json ? '#e4e6ea' : '#ede9fe', color: '#6c63ff', border: 'none', cursor: 'pointer', fontWeight: 500, flexShrink: 0, marginLeft: 12 }}
          >
            {busy.json ? 'Exporting…' : 'Export JSON'}
          </button>
        </div>

        <div style={rowStyle}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1d3b' }}>Export time log to CSV</div>
            <div style={{ fontSize: 11, color: '#b0b5cc' }}>Download complete attendance history (SAST time)</div>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={busy.csv}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: busy.csv ? '#e4e6ea' : '#ede9fe', color: '#6c63ff', border: 'none', cursor: 'pointer', fontWeight: 500, flexShrink: 0, marginLeft: 12 }}
          >
            {busy.csv ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        <div style={rowStyle}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1d3b' }}>Import employees from CSV</div>
            <div style={{ fontSize: 11, color: '#b0b5cc' }}>Columns: name, dept, color (hex). Header row required.</div>
          </div>
          <label style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: busy.import ? '#e4e6ea' : '#f4f5f7', color: '#5a5f8a', border: 'none', cursor: 'pointer', fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>
            {busy.import ? 'Importing…' : 'Import CSV'}
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
          </label>
        </div>

        <div style={rowStyle}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1d3b' }}>Reset operational data</div>
            <div style={{ fontSize: 11, color: '#b0b5cc' }}>Clear all time logs, leave, jobs, tools and stock — cannot be undone</div>
          </div>
          <button
            onClick={() => setResetModal(true)}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 500, flexShrink: 0, marginLeft: 12 }}
          >
            Reset data
          </button>
        </div>

      </div>
    </Card>
  )
}
