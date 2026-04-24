import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { splitCode, deptForPrefix } from './plannerUtils'
import { getPhaseForCode } from '../../utils/codeParser'

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#1a1d3b', display: 'block' }
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '8px 10px',
  border: '1px solid #e4e6ea', borderRadius: 6, fontSize: 13,
  boxSizing: 'border-box', outline: 'none'
}

export default function TaskEditModal({ mode, task, job, prefixMappings, assemblyPhases, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [assemblyPrefix, setAssemblyPrefix] = useState('')
  const [assemblyRest, setAssemblyRest] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dependsOn, setDependsOn] = useState([])
  const [dependsOnAssembly, setDependsOnAssembly] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (mode === 'edit' && task) {
      setName(task.name || '')
      const { prefix, rest } = splitCode(task.assemblyCode, prefixMappings)
      setAssemblyPrefix(prefix)
      setAssemblyRest(rest)
      setStartDate(task.startDate || '')
      setEndDate(task.endDate || '')
      setDependsOn(Array.isArray(task.dependsOn) ? task.dependsOn : [])
      setDependsOnAssembly(task.dependsOnAssembly || '')
      setAssignedTo(task.assignedTo || task.assignee || '')
      setNotes(task.notes || task.note || '')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prefixes = prefixMappings || []
  const fullCode = (assemblyPrefix + assemblyRest).toUpperCase()
  const resolvedDept = deptForPrefix(assemblyPrefix, prefixes)
  const phase = fullCode.length > 3 ? getPhaseForCode(fullCode, assemblyPhases || []) : null

  const otherCodes = (job?.tasks || [])
    .filter(t => t.assemblyCode && t.id !== task?.id)
    .map(t => t.assemblyCode)

  const handleSave = async () => {
    if (!name.trim()) { setError('Name required'); return }
    if (assemblyPrefix && assemblyRest && !/^[A-Z]\d{6}$/i.test(assemblyRest)) {
      setError('Code rest must be one letter + 6 digits (e.g. A000184)')
      return
    }
    setSaving(true)
    try {
      const taskData = {
        name: name.trim(),
        assemblyCode: fullCode || null,
        startDate: startDate || null,
        endDate: endDate || null,
        dependsOn,
        dependsOnAssembly: dependsOnAssembly || null,
        assignedTo,
        notes
      }
      if (mode === 'add') {
        taskData.id = `task-${Date.now()}`
        taskData.kanbanStatus = 'todo'
        taskData.done = false
        taskData.pct = 0
        const updatedJob = { ...job, tasks: [...(job.tasks || []), taskData] }
        await apiFetch(`/jobs/${job.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedJob)
        })
      } else {
        await apiFetch(`/jobs/${job.id}/task/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return
    setSaving(true)
    try {
      const updatedJob = { ...job, tasks: (job.tasks || []).filter(t => t.id !== task.id) }
      await apiFetch(`/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedJob)
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 500,
        maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1d3b', marginBottom: 16 }}>
          {mode === 'add' ? 'Add Task' : 'Edit Task'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Task Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Wire harness assembly" style={inputStyle} />
          </div>

          {/* Assembly Code */}
          <div>
            <label style={labelStyle}>Assembly Code</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <select value={assemblyPrefix} onChange={e => setAssemblyPrefix(e.target.value)}
                style={{ ...inputStyle, marginTop: 0, width: 110, flex: 'none' }}>
                <option value="">Prefix</option>
                {[...prefixes].sort((a, b) => a.prefix.localeCompare(b.prefix)).map(p => (
                  <option key={p.prefix} value={p.prefix}>{p.prefix}</option>
                ))}
              </select>
              <input value={assemblyRest} onChange={e => setAssemblyRest(e.target.value)}
                placeholder="A000184"
                style={{ ...inputStyle, marginTop: 0, flex: 1 }} />
            </div>
            {(assemblyPrefix || assemblyRest) && (
              <div style={{ marginTop: 6, fontSize: 11,
                color: resolvedDept ? '#16a34a' : '#b45309' }}>
                {resolvedDept
                  ? `Full code: ${fullCode} → Department: ${resolvedDept}`
                  : '⚠ Prefix not mapped — task will appear in Unallocated'}
              </div>
            )}
            {phase && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#9298c4' }}>
                Phase: {phase}
              </div>
            )}
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Depends on assembly */}
          {otherCodes.length > 0 && (
            <div>
              <label style={labelStyle}>Depends on (assembly)</label>
              <select value={dependsOnAssembly} onChange={e => setDependsOnAssembly(e.target.value)}
                style={inputStyle}>
                <option value="">— None —</option>
                {otherCodes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Assigned to */}
          <div>
            <label style={labelStyle}>Assigned To</label>
            <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              placeholder="Employee name" style={inputStyle} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes…"
              style={{ ...inputStyle, height: 72, resize: 'vertical' }} />
          </div>
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: '#dc2626' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          {mode === 'edit' && (
            <button onClick={handleDelete} disabled={saving}
              style={{ marginRight: 'auto', padding: '8px 14px', borderRadius: 8,
                border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                fontSize: 12, cursor: 'pointer' }}>
              Delete
            </button>
          )}
          <button onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e4e6ea',
              background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#9298c4' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none',
              background: saving ? '#b0b5cc' : '#6c63ff', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
