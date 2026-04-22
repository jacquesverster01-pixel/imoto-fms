import { useState, useEffect } from 'react'
import { apiFetch } from '../../hooks/useApi'
import { skipWeekend, addWorkingDays, toDateStr } from './ganttUtils'
import { buildTasksFromBom } from '../../components/inventory/bom/bomUtils'

const COLOUR_SWATCHES = ['#dbeafe','#fce7f3','#dcfce7','#ede9fe','#fef9c3','#ffedd5','#f1f5f9','#fee2e2']

function buildTasksFromAssembly(assembly, startDate) {
  let cur = new Date(startDate + 'T00:00:00')
  return assembly.tasks.map((t, i) => {
    const s = skipWeekend(new Date(cur)), e = addWorkingDays(new Date(s), t.defaultDays - 1)
    cur = addWorkingDays(new Date(e), 1)
    return { id: `t-${Date.now()}-${i}`, name: t.name, defaultDays: t.defaultDays, startDate: toDateStr(s), endDate: toDateStr(e), done: false, assignedTo: null }
  })
}

const inp = { border: '1px solid #dde0ea', borderRadius: 6, padding: '7px 10px', fontSize: 13,
  width: '100%', boxSizing: 'border-box', color: '#1a1d3b', background: '#fff' }

function ScratchTaskRow({ task, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      <input value={task.name} onChange={e => onChange(task.id, 'name', e.target.value)} placeholder="Task name" style={{ ...inp, flex: 1, width: 'auto' }} />
      <input type="number" min={1} value={task.defaultDays} onChange={e => onChange(task.id, 'defaultDays', Math.max(1, Number(e.target.value)))} style={{ ...inp, width: 64 }} />
      <button onClick={() => onRemove(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9298c4', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
    </div>
  )
}

function AssemblyModeFields({ assemblies, assemblyId, setAssemblyId, tasks }) {
  return (
    <>
      <select value={assemblyId} onChange={e => setAssemblyId(e.target.value)} style={{ ...inp, marginBottom: 12, color: assemblyId ? '#1a1d3b' : '#9298c4' }}>
        <option value="">Select assembly…</option>
        {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      {tasks.length > 0 && (
        <div style={{ background: '#f8f9fb', borderRadius: 8, padding: '10px 14px', marginBottom: 4 }}>
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5f5e5a', padding: '3px 0' }}>
              <span>{t.name}</span><span style={{ color: '#9298c4' }}>{t.startDate} → {t.endDate}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#b0b5cc', marginTop: 8 }}>Dates auto-calculated from assembly defaults. Edit in the Gantt after saving.</div>
        </div>
      )}
    </>
  )
}

function BomModeFields({ boms, bomsLoaded, bomId, setBomId, tasks }) {
  const subCount = tasks.reduce((n, t) => n + (t.children?.length || 0), 0)
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Select BOM</label>
      {!bomsLoaded
        ? <div style={{ color: '#888', fontSize: 13 }}>Loading BOMs…</div>
        : boms.length === 0
          ? <div style={{ color: '#888', fontSize: 13 }}>No imported BOMs found. Import a BOM from the Inventory → Imported BOMs tab first.</div>
          : <select value={bomId} onChange={e => setBomId(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
              <option value=''>Select BOM…</option>
              {boms.map(b => <option key={b.id} value={b.id}>{b.productCode} — {b.productDescription}</option>)}
            </select>}
      {tasks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{tasks.length} dept task{tasks.length !== 1 ? 's' : ''} generated · {subCount} sub-tasks</div>
          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 0' }}>
            {tasks.map(t => (
              <div key={t.id} style={{ padding: '4px 10px', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ color: '#9ca3af', marginLeft: 6 }}>{t.children?.length || 0} items</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Labour rows (TEAM-*) excluded. Edit tasks and sub-tasks in the Gantt after saving.</div>
        </div>
      )}
    </div>
  )
}

function ScratchModeFields({ tasks, onAdd, onChange, onRemove }) {
  return (
    <>
      {tasks.map(t => <ScratchTaskRow key={t.id} task={t} onChange={onChange} onRemove={onRemove} />)}
      <button onClick={onAdd} style={{ width: '100%', fontSize: 12, color: '#4f67e4', background: 'none',
        border: '1px dashed #4f67e4', borderRadius: 6, padding: '7px 0', cursor: 'pointer' }}>+ Add task</button>
    </>
  )
}

export default function NewJobModal({ assemblies, onClose, onSaved }) {
  const [mode,       setMode]       = useState('assembly')
  const [title,      setTitle]      = useState('')
  const [colour,     setColour]     = useState('#dbeafe')
  const [startDate,  setStartDate]  = useState('')
  const [assemblyId, setAssemblyId] = useState('')
  const [tasks,      setTasks]      = useState([])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)
  const [bomId,      setBomId]      = useState('')
  const [boms,       setBoms]       = useState([])
  const [bomsLoaded, setBomsLoaded] = useState(false)

  useEffect(() => {
    apiFetch('/boms')
      .then(data => { setBoms(Array.isArray(data) ? data : []); setBomsLoaded(true) })
      .catch(() => setBomsLoaded(true))
  }, [])

  useEffect(() => {
    if (mode !== 'assembly' || !assemblyId || !startDate) return
    const asm = assemblies.find(a => a.id === assemblyId)
    if (!asm) return
    setTasks(buildTasksFromAssembly(asm, startDate))
  }, [mode, assemblyId, startDate, assemblies])

  useEffect(() => {
    if (mode !== 'bom' || !bomId) return
    apiFetch(`/boms/${bomId}`)
      .then(bom => {
        setTasks(buildTasksFromBom(bom.items || []))
        const selected = boms.find(b => b.id === bomId)
        if (selected && !title.trim()) setTitle(`${selected.productCode} — ${selected.productDescription}`)
      })
      .catch(() => setError('Failed to load BOM items'))
  }, [bomId, mode])

  async function handleSave() {
    if (!title.trim()) { setError('Job title is required'); return }
    if (mode === 'bom' && !bomId) { setError('Please select a BOM'); return }
    setSaving(true); setError(null)
    try {
      await apiFetch('/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), status: 'quote',
          assemblyId: mode === 'assembly' ? assemblyId || null : null,
          bomId: mode === 'bom' ? bomId || null : null,
          colour, startDate: startDate || null,
          dueDate: tasks.length ? tasks[tasks.length - 1].endDate || null : null, tasks }) })
      onSaved()
    } catch { setError('Failed to save. Please try again.') }
    finally { setSaving(false) }
  }

  function addScratchTask() {
    setTasks(p => [...p, { id: `t-${Date.now()}`, name: '', defaultDays: 1, startDate: null, endDate: null, done: false, assignedTo: null }])
  }
  function updateTask(id, key, val) { setTasks(p => p.map(t => t.id === id ? { ...t, [key]: val } : t)) }
  function removeTask(id)           { setTasks(p => p.filter(t => t.id !== id)) }

  const titleError = error === 'Job title is required'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e4e6ea' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1d3b' }}>New job</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9298c4', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f5e5a', marginBottom: 4 }}>Job title *</label>
          <input value={title} onChange={e => { setTitle(e.target.value); if (titleError) setError(null) }}
            placeholder="e.g. Engine rebuild — KTM 690" style={{ ...inp, marginBottom: 4 }} />
          {titleError && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <div style={{ marginBottom: 14 }} />
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f5e5a', marginBottom: 6 }}>Colour</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {COLOUR_SWATCHES.map(c => <div key={c} onClick={() => setColour(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: colour === c ? '2px solid #4f67e4' : '2px solid #e4e6ea', boxSizing: 'border-box' }} />)}
          </div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5f5e5a', marginBottom: 4 }}>Start date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inp, marginBottom: 4 }} />
          {mode === 'assembly' && !startDate
            ? <div style={{ fontSize: 11, color: '#9298c4', marginBottom: 14 }}>Set a start date to auto-calculate task dates</div>
            : <div style={{ marginBottom: 14 }} />}
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            {[['assembly','From assembly'],['bom','From BOM'],['scratch','From scratch']].map(([val, label]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="njm-mode" checked={mode === val} onChange={() => { setMode(val); setTasks([]) }} />
                {label}
              </label>
            ))}
          </div>
          {mode === 'assembly' && <AssemblyModeFields assemblies={assemblies} assemblyId={assemblyId} setAssemblyId={setAssemblyId} tasks={tasks} />}
          {mode === 'bom' && <BomModeFields boms={boms} bomsLoaded={bomsLoaded} bomId={bomId} setBomId={setBomId} tasks={tasks} />}
          {mode === 'scratch' && <ScratchModeFields tasks={tasks} onAdd={addScratchTask} onChange={updateTask} onRemove={removeTask} />}
          {error && !titleError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 12 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #e4e6ea' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #dde0ea', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#4f67e4', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
