import { useState, useRef, useEffect } from 'react'
import { useGanttDrag } from '../../hooks/useGanttDrag'
import { apiFetch, BASE, UPLOADS_BASE } from '../../hooks/useApi'
import { useClickOutside } from '../../hooks/useClickOutside'
import {
  parseDate, toDateStr, addDays, getChartBounds, cascadeTasksForward,
  flattenTasksForDisplay, enforceDependencies, dependencyArrowPath,
  isMilestone, taskBarPosition, buildZoomColumns, getTodayScrollX, computeCriticalPath,
  getTaskBarColor, collectAllSubTasks, wouldCreateCycle
} from './ganttUtils'
import { groupCols, ppd } from '../../utils/ganttLogic'
import { injectGanttPrintStyle } from '../../utils/ganttExport'

const ROW_H = 32, HDR_H = 48
const STATUS_OPTIONS = [
  { value: 'quote', label: 'Quote' }, { value: 'in_progress', label: 'In progress' },
  { value: 'qc', label: 'QC' }, { value: 'dispatch', label: 'Dispatch' }, { value: 'done', label: 'Done' },
]

function LeftPanelRow({ row, collapsed, onToggle, onChangeName, onCheck, isFocused, rowIdx, onDragHandleDown, onRowOver, onToggleMilestone, onOpenMenu }) {
  const inputRef = useRef(null)
  useEffect(() => { if (isFocused && inputRef.current) { inputRef.current.focus(); inputRef.current.select() } }, [isFocused])
  const { task, isParent, isSubTask } = row
  const isMile = isMilestone(task)
  return (
    <div style={{ height: ROW_H, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: isSubTask ? 24 : 4, paddingRight: 4, borderBottom: '1px solid #f0f1f5' }}
      onMouseOver={() => onRowOver(rowIdx)}>
      {!isSubTask && <span onMouseDown={e => { e.preventDefault(); onDragHandleDown(rowIdx) }} style={{ fontSize: 9, color: '#ccc', cursor: 'grab', flexShrink: 0, letterSpacing: 1, userSelect: 'none' }}>⋮⋮</span>}
      {isMile ? <span onClick={() => onToggleMilestone(task.id)} style={{ cursor: 'pointer', color: task.done ? '#1a1d3b' : '#9298c4', fontSize: 12, flexShrink: 0 }}>◆</span>
        : isParent ? <button onClick={() => onToggle(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9298c4', fontSize: 11, padding: 0, width: 14, flexShrink: 0 }}>{collapsed[task.id] ? '▸' : '▾'}</button>
        : <input type="checkbox" checked={!!task.done} onChange={() => onCheck(task.id, row.parentId)} style={{ flexShrink: 0, cursor: 'pointer' }} />}
      <input ref={inputRef} value={task.name} onChange={e => onChangeName(task.id, row.parentId, e.target.value)}
        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, background: 'transparent', color: task.done ? '#b0b5cc' : '#1a1d3b', textDecoration: task.done ? 'line-through' : 'none', fontWeight: isParent ? 600 : 400, minWidth: 0 }} />
      <button onClick={e => { e.stopPropagation(); onOpenMenu(task.id, row.parentId, isParent, isMile, e) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9298c4', fontSize: 16, padding: '0 3px', flexShrink: 0, lineHeight: 1, borderRadius: 4 }}>⋮</button>
    </div>
  )
}
function GanttHeader({ title, setTitle, status, setStatus, zoom, setZoom, showCriticalPath, setShowCriticalPath, showBaseline, setShowBaseline, progress, saving, onSave, onClose, onExport, onSetBaseline }) {
  const tog = on => ({ padding: '4px 10px', borderRadius: 6, border: '1px solid #dde0ea', fontSize: 12, cursor: 'pointer', background: on ? '#4f67e4' : '#fff', color: on ? '#fff' : '#1a1d3b' })
  return (
    <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderBottom: '1px solid #e4e6ea', flexShrink: 0, flexWrap: 'wrap' }}>
      <input value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1, fontWeight: 700, fontSize: 16, border: 'none', outline: 'none', color: '#1a1d3b', background: 'transparent', minWidth: 100 }} />
      <select value={status} onChange={e => setStatus(e.target.value)} style={{ fontSize: 12, border: '1px solid #dde0ea', borderRadius: 6, padding: '4px 8px', color: '#1a1d3b', background: '#fff' }}>
        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ fontSize: 12, color: '#9298c4', whiteSpace: 'nowrap' }}>{progress}</span>
      <div style={{ display: 'flex', border: '1px solid #dde0ea', borderRadius: 6, overflow: 'hidden' }}>
        {['day','week','month'].map(z => <button key={z} onClick={() => setZoom(z)} style={{ padding: '4px 9px', border: 'none', borderRight: z !== 'month' ? '1px solid #dde0ea' : 'none', fontSize: 12, cursor: 'pointer', background: zoom === z ? '#4f67e4' : '#fff', color: zoom === z ? '#fff' : '#1a1d3b' }}>{z[0].toUpperCase()+z.slice(1)}</button>)}
      </div>
      <button onClick={() => setShowCriticalPath(v => !v)} style={tog(showCriticalPath)}>Critical path</button>
      <button onClick={onSetBaseline} style={tog(false)}>Set baseline</button>
      <button onClick={() => setShowBaseline(v => !v)} style={tog(showBaseline)}>Show baseline</button>
      <button onClick={onExport} style={tog(false)}>Export PDF</button>
      <button onClick={onSave} disabled={saving} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#4f67e4', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#9298c4', lineHeight: 1, padding: 0 }}>×</button>
    </div>
  )
}
function MilestoneRow({ task, zoomCols, job, onToggleDone, dragRef, taskRowsRef }) {
  const pos = taskBarPosition(task, zoomCols), p = ppd(zoomCols), colour = job.colour || '#4f67e4'
  return (
    <div ref={el => { if (el) taskRowsRef.current[task.id] = el }}
      onMouseDown={e => { e.stopPropagation(); dragRef.current = { type: 'move', taskId: task.id, parentId: null, isMilestone: true, startMouseX: e.clientX, origStartDate: task.startDate, origEndDate: task.endDate, pixPerDay: p } }}
      onClick={() => onToggleDone(task.id)}
      style={{ position: 'absolute', left: pos.left + pos.width / 2 - 8, top: 6, width: 16, height: 16, background: task.done ? colour : 'transparent', border: `2px solid ${colour}`, transform: 'rotate(45deg)', borderRadius: 2, cursor: 'pointer', zIndex: 2, userSelect: 'none' }}
      title={task.name} />
  )
}
function GanttBar({ row, job, zoomCols, criticalIds, showBaseline, baseline, dragRef, taskRowsRef, onBarRightClick, barColor, onLinkStart }) {
  const { task, isParent, parentId } = row
  if (isMilestone(task)) return null
  const pos = taskBarPosition(task, zoomCols), p = ppd(zoomCols)
  const hasCp = criticalIds.length > 0, isCrit = criticalIds.includes(task.id), isLocked = !!(task.dependsOn?.length)
  const bl = showBaseline ? baseline.find(b => b.taskId === task.id) : null
  const blPos = bl ? taskBarPosition(bl, zoomCols) : null
  return (
    <>
      {blPos && <div style={{ position: 'absolute', left: blPos.left, width: blPos.width, top: 9, height: 14, background: '#888', opacity: 0.25, borderRadius: 3, pointerEvents: 'none' }} />}
      <div ref={el => { if (el) taskRowsRef.current[task.id] = el }}
        data-task-id={task.id}
        data-parent-id={parentId || ''}
        onMouseDown={e => { if (isParent) return; e.stopPropagation(); dragRef.current = { type: 'move', taskId: task.id, parentId: parentId || null, isMilestone: false, startMouseX: e.clientX, origStartDate: task.startDate, origEndDate: task.endDate, pixPerDay: p } }}
        onContextMenu={e => { e.preventDefault(); if (task.dependsOn?.length) onBarRightClick(e, task.id, parentId, task.dependsOn) }}
        style={{ position: 'absolute', top: isParent ? 4 : 6, left: pos.left, width: pos.width, height: isParent ? 24 : 20, borderRadius: 4,
          background: isParent ? barColor + 'bb' : barColor, cursor: isParent ? 'default' : 'grab',
          userSelect: 'none', display: 'flex', alignItems: 'center', overflow: 'visible',
          borderLeft: hasCp && isCrit && !isParent ? '3px solid #D85A30' : undefined,
          opacity: hasCp && !isCrit && !isParent ? 0.6 : undefined }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.pct||0}%`, background: 'rgba(0,0,0,0.18)', borderRadius: 'inherit', pointerEvents: 'none', overflow: 'hidden' }} />
        {isLocked && <span style={{ fontSize: 9, position: 'absolute', left: 2, top: 2, pointerEvents: 'none' }}>🔒</span>}
        <span style={{ fontSize: 11, color: '#fff', padding: `0 ${isLocked ? 14 : 6}px 0 6px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, pointerEvents: 'none', position: 'relative' }}>
          {isParent ? `${task.name} · ${task.pct||0}%` : task.name}
        </span>
        {!isParent && <div onMouseDown={e => { e.stopPropagation(); dragRef.current = { type: 'resize', taskId: task.id, parentId: parentId||null, startMouseX: e.clientX, origEndDate: task.endDate, taskStartDate: task.startDate, pixPerDay: p } }} style={{ width: 8, height: '100%', cursor: 'ew-resize', flexShrink: 0, position: 'relative', zIndex: 1 }} />}
        {!isParent && (
          <div onMouseDown={e => { e.stopPropagation(); onLinkStart(e, task.id, parentId || null, 'left') }}
            style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${barColor}`, cursor: 'crosshair', zIndex: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', pointerEvents: 'all' }} />
        )}
        {!isParent && (
          <div onMouseDown={e => { e.stopPropagation(); onLinkStart(e, task.id, parentId || null, 'right') }}
            style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${barColor}`, cursor: 'crosshair', zIndex: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', pointerEvents: 'all' }} />
        )}
      </div>
    </>
  )
}
function DependencyOverlay({ rows, zoomCols, chartWidth }) {
  const arrows = []
  rows.forEach((row, i) => {
    if (!row.task.dependsOn?.length) return
    const sp = taskBarPosition(row.task, zoomCols)
    row.task.dependsOn.forEach(depId => {
      const pi = rows.findIndex(r => r.task.id === depId); if (pi === -1) return
      const pp2 = taskBarPosition(rows[pi].task, zoomCols)
      arrows.push(<path key={`${depId}>${row.task.id}`} d={dependencyArrowPath(pp2.left, pp2.width, sp.left, HDR_H+pi*ROW_H+6, HDR_H+i*ROW_H+6, zoomCols[0]?.widthPx||28)} fill="none" stroke="#888" strokeWidth="1.5" markerEnd="url(#da)" />)
    })
  })
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: chartWidth, height: HDR_H + rows.length * ROW_H, pointerEvents: 'none', zIndex: 1 }}>
      <defs><marker id="da" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      {arrows}
    </svg>
  )
}

function TaskWindow({ task, parentId, pos, onClose, onChangeName, onCheckTask, onAddSubTask, onUpdateNotes, onUpdatePct, onUploadFile, onDeleteFile, onDelete }) {
  const windowRef = useRef(null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  useClickOutside(windowRef, onClose)
  const isSubTask = !!parentId
  const top  = Math.min(pos.y, window.innerHeight - 520)
  const left = Math.min(pos.x, window.innerWidth - 308)
  const section = { padding: '11px 14px', borderBottom: '1px solid #f0f1f5' }
  const label   = { fontSize: 10, fontWeight: 700, color: '#9298c4', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }
  return (
    <div ref={windowRef} style={{ position:'fixed', left, top, zIndex:300, width:300, background:'#fff', borderRadius:10, boxShadow:'0 10px 36px rgba(0,0,0,0.22)', border:'1px solid #e0e3ef', display:'flex', flexDirection:'column', maxHeight:'min(78vh, 560px)' }}
      onClick={e => e.stopPropagation()}>
      {/* ── header: bin | name | × ── */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 10px', background:'#f8f9fb', borderBottom:'1px solid #eef0f6', flexShrink:0 }}>
        <button onClick={onDelete} title="Delete task"
          style={{ border:'none', background:'none', cursor:'pointer', color:'#9298c4', padding:'3px 4px', borderRadius:4, flexShrink:0, display:'flex', alignItems:'center' }}>
          <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
            <path d="M1 3.5h11M4.5 3.5V2h4v1.5M3 3.5l.6 8.5h5.8L10 3.5M5 6v4.5M8 6v4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <input value={task.name} onChange={e => onChangeName(task.id, parentId, e.target.value)}
          style={{ flex:1, border:'none', outline:'none', fontSize:13, fontWeight:700, color:'#1a1d3b', background:'transparent', minWidth:0 }} />
        <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#9298c4', fontSize:20, lineHeight:1, padding:0, flexShrink:0 }}>×</button>
      </div>
      <div style={{ overflowY:'auto', flex:1 }}>
        {/* ── sub-tasks (root tasks only) ── */}
        {!isSubTask && (
          <div style={section}>
            <div style={label}>Sub-tasks</div>
            {(task.subTasks || []).length === 0 && <div style={{ fontSize:12, color:'#c0c5d8', marginBottom:4 }}>No sub-tasks yet</div>}
            {(task.subTasks || []).map(st => (
              <div key={st.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'3px 0' }}>
                <input type="checkbox" checked={!!st.done} onChange={() => onCheckTask(st.id, task.id)} style={{ flexShrink:0, cursor:'pointer' }} />
                <input value={st.name} onChange={e => onChangeName(st.id, task.id, e.target.value)}
                  style={{ flex:1, border:'none', outline:'none', fontSize:12, background:'transparent', color:st.done?'#b0b5cc':'#1a1d3b', textDecoration:st.done?'line-through':'none', minWidth:0 }} />
              </div>
            ))}
            <button onClick={() => onAddSubTask(task.id, null)}
              style={{ marginTop:6, background:'none', border:'none', cursor:'pointer', color:'#4f67e4', fontSize:12, padding:0, fontWeight:600 }}>
              + Add sub-task
            </button>
          </div>
        )}
        {/* ── notes ── */}
        <div style={section}>
          <div style={label}>Notes</div>
          <textarea value={task.notes || ''} onChange={e => onUpdateNotes(e.target.value)}
            style={{ width:'100%', height:76, resize:'vertical', border:'1px solid #dde0ea', borderRadius:6, padding:'7px 9px', fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#1a1d3b', lineHeight:1.5 }}
            placeholder="Add notes..." />
        </div>
        {/* ── progress ── */}
        <div style={section}>
          <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
            <span style={label}>Progress</span>
            <span style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:'#4f67e4' }}>{task.pct||0}%</span>
          </div>
          <input type="range" min="0" max="100" step="5" value={task.pct||0} onChange={e => onUpdatePct(Number(e.target.value))} style={{ width:'100%', accentColor:'#4f67e4' }} />
        </div>
        {/* ── files ── */}
        <div style={{ padding:'11px 14px' }}>
          <div style={label}>Files</div>
          {(task.files||[]).length === 0 && <div style={{ fontSize:12, color:'#c0c5d8', marginBottom:8 }}>No files attached</div>}
          {(task.files||[]).map(f => (
            <div key={f.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', borderBottom:'1px solid #f5f6fa' }}>
              <span style={{ fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#1a1d3b' }}>{f.name}</span>
              <a href={`${UPLOADS_BASE}/${f.url?.replace(/^\/uploads\//, '')}`} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#4f67e4', textDecoration:'none', flexShrink:0 }}>Open</a>
              <button onClick={() => onDeleteFile(f.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'#dc2626', fontSize:15, padding:0, lineHeight:1, flexShrink:0 }}>×</button>
            </div>
          ))}
          <input ref={fileInputRef} type="file" style={{ display:'none' }} onChange={async e => {
            if (!e.target.files[0]) return
            setUploading(true); await onUploadFile(e.target.files[0]); setUploading(false); e.target.value = ''
          }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ marginTop:10, padding:'8px 0', background:'#f0f4ff', color:'#4f67e4', border:'1px solid #c7d0f8', borderRadius:6, cursor:uploading?'not-allowed':'pointer', fontSize:12, fontWeight:600, width:'100%', opacity:uploading?0.7:1 }}>
            {uploading ? 'Uploading…' : '+ Upload file'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CtxMenu({ ctxMenu, onClose, onRemoveDep, flatRows }) {
  const ref = useRef(null)
  useClickOutside(ref, onClose)
  return (
    <div ref={ref} style={{ position:'fixed', left:ctxMenu.x, top:ctxMenu.y, zIndex:200, background:'#fff', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', minWidth:180 }}
      onClick={e => e.stopPropagation()}>
      {ctxMenu.depIds.map(depId => (
        <button key={depId} onClick={() => { onRemoveDep(ctxMenu.taskId, depId); onClose() }}
          style={{ display:'block', width:'100%', padding:'8px 14px', background:'none', border:'none', textAlign:'left', fontSize:13, cursor:'pointer', color:'#dc2626' }}>
          Remove dep: {flatRows.find(r => r.task.id===depId)?.task.name || depId}
        </button>
      ))}
    </div>
  )
}

export default function GanttModal({ job, onClose, onSaved }) {
  const [tasks,            setTasks]            = useState(() => (job.tasks || []).map(t => ({ pct: 0, dependsOn: [], subTasks: [], ...t })))
  const [title,            setTitle]            = useState(job.title || '')
  const [status,           setStatus]           = useState(job.status || 'quote')
  const [saving,           setSaving]           = useState(false)
  const [focusId,          setFocusId]          = useState(null)
  const [collapsed,        setCollapsed]        = useState({})
  const [ctxMenu,          setCtxMenu]          = useState(null)
  const [taskWindow,       setTaskWindow]       = useState(null)
  const [zoom,             setZoom]             = useState('day')
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [showBaseline,     setShowBaseline]     = useState(false)
  const [baseline,         setBaseline]         = useState(job.baseline || [])

  const { dragRef, reorderRef, taskRowsRef, linkDragRef, zoomColsRef, linkLine, setLinkLine, startLinkDrag, handleDragHandleDown, handleRowOver } = useGanttDrag(setTasks)
  const leftPanelRef = useRef(null), rightPanelRef = useRef(null)

  const flatRows    = flattenTasksForDisplay(tasks)
  const visibleRows = flatRows.filter(r => !r.isSubTask || !collapsed[r.parentId])
  const { minDate, maxDate } = getChartBounds(tasks)
  const zoomCols = buildZoomColumns(minDate, maxDate, zoom)
  zoomColsRef.current = zoomCols
  const chartWidth = zoomCols.reduce((s, c) => s + c.widthPx, 0)
  const colGroups  = groupCols(zoomCols)
  let acc = 0
  const colsWithLeft = zoomCols.map(c => { const l = acc; acc += c.widthPx; return { ...c, left: l } })
  const doneTasks   = flatRows.filter(r => !r.isParent && r.task.done).length
  const totalLeaf   = flatRows.filter(r => !r.isParent).length
  const criticalIds = showCriticalPath ? computeCriticalPath(tasks) : []
  const allSubTasks = collectAllSubTasks(tasks)

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') { setCtxMenu(null); setTaskWindow(null); linkDragRef.current = null; setLinkLine(null) } }
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn)
  }, [])
  useEffect(() => { if (rightPanelRef.current) rightPanelRef.current.scrollLeft = getTodayScrollX(zoomColsRef.current) }, [zoom])
  useEffect(() => injectGanttPrintStyle(), [])

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch(`/jobs/${job.id}/tasks`, { method: 'PUT', body: JSON.stringify({ tasks }) })
      await apiFetch(`/jobs/${job.id}`, { method: 'PUT', body: JSON.stringify({ title, status }) })
      onSaved()
    } catch { } finally { setSaving(false) }
  }
  function addTask() {
    const id = `t-${Date.now()}`; setFocusId(id)
    setTasks(prev => { const last = prev[prev.length-1]; const d = toDateStr(addDays(last?.endDate ? parseDate(last.endDate) : new Date(), 1))
      return [...prev, { id, name: 'New task', startDate: d, endDate: d, done: false, pct: 0, dependsOn: [], subTasks: [], assignedTo: null }] })
  }
  function addMilestone() {
    const id = `t-${Date.now()}`; const d = toDateStr(addDays(new Date(), 1))
    setTasks(prev => [...prev, { id, name: 'Milestone', startDate: d, endDate: d, milestone: true, done: false, pct: 0, dependsOn: [], subTasks: [] }])
  }
  function addSubTask(taskId, parentId) {
    const targetId = parentId || taskId
    setTasks(prev => prev.map(t => { if (t.id !== targetId) return t; const d0 = t.endDate ? parseDate(t.endDate) : new Date()
      return { ...t, subTasks: [...(t.subTasks||[]), { id: `st-${Date.now()}`, name: 'New sub-task', startDate: toDateStr(d0), endDate: toDateStr(addDays(d0,1)), done: false, pct: 0, dependsOn: [], assignedTo: null }] } }))
  }
  function onChangeName(id, parentId, val) {
    setTasks(p => !parentId ? p.map(t => t.id===id ? {...t,name:val} : t) : p.map(t => t.id!==parentId ? t : {...t, subTasks: t.subTasks.map(s => s.id===id ? {...s,name:val} : s)}))
  }
  function onCheckTask(id, parentId) {
    setTasks(p => !parentId ? p.map(t => t.id===id ? {...t,done:!t.done,pct:!t.done?100:0} : t) : p.map(t => t.id!==parentId ? t : {...t, subTasks: t.subTasks.map(s => s.id===id ? {...s,done:!s.done,pct:!s.done?100:0} : s)}))
  }
  function onToggleMilestone(id) { setTasks(p => p.map(t => t.id===id ? {...t,done:!t.done,pct:!t.done?100:0} : t)) }
  function removeDep(taskId, depId) { setTasks(p => p.map(t => t.id===taskId ? {...t, dependsOn:(t.dependsOn||[]).filter(d=>d!==depId)} : t)) }
  function onBarRightClick(e, taskId, parentId, depIds) { setCtxMenu({ x: Math.min(e.clientX, window.innerWidth-200), y: e.clientY, taskId, parentId, depIds }) }
  function getTask(taskId, parentId) {
    if (!parentId) return tasks.find(t => t.id === taskId) || null
    return tasks.find(t => t.id === parentId)?.subTasks?.find(s => s.id === taskId) || null
  }
  function deleteTask(taskId, parentId) {
    setTasks(p => !parentId ? p.filter(t => t.id !== taskId) : p.map(t => t.id !== parentId ? t : { ...t, subTasks: t.subTasks.filter(s => s.id !== taskId) }))
    setTaskWindow(null)
  }
  function updateNotes(taskId, parentId, notes) {
    setTasks(p => !parentId ? p.map(t => t.id===taskId ? {...t, notes} : t) : p.map(t => t.id!==parentId ? t : {...t, subTasks: t.subTasks.map(s => s.id===taskId ? {...s, notes} : s)}))
  }
  function updatePct(taskId, parentId, v) {
    setTasks(p => !parentId ? p.map(t => t.id===taskId ? {...t, pct:v, done:v===100} : t) : p.map(t => t.id!==parentId ? t : {...t, subTasks: t.subTasks.map(s => s.id===taskId ? {...s, pct:v, done:v===100} : s)}))
  }
  async function uploadTaskFile(taskId, parentId, file) {
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch(`${BASE}/jobs/${job.id}/tasks/${taskId}/files`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const rec = await res.json()
      if (!rec.id) return
      setTasks(p => !parentId ? p.map(t => t.id===taskId ? {...t, files:[...(t.files||[]), rec]} : t) : p.map(t => t.id!==parentId ? t : {...t, subTasks: t.subTasks.map(s => s.id===taskId ? {...s, files:[...(s.files||[]), rec]} : s)}))
    } catch (e) { console.error('[uploadTaskFile]', e); setTaskFileError(taskId, 'Upload failed') }
  }
  function deleteTaskFile(taskId, parentId, fileId) {
    setTasks(p => !parentId ? p.map(t => t.id===taskId ? {...t, files:(t.files||[]).filter(f=>f.id!==fileId)} : t) : p.map(t => t.id!==parentId ? t : {...t, subTasks: t.subTasks.map(s => s.id===taskId ? {...s, files:(s.files||[]).filter(f=>f.id!==fileId)} : s)}))
  }
  function openTaskMenu(taskId, parentId, isParent, isMile, e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(rect.right + 8, window.innerWidth - 312)
    const y = Math.min(rect.top - 4, window.innerHeight - 530)
    setTaskWindow({ taskId, parentId, isParent, isMile, x, y })
  }
  async function handleSetBaseline() {
    const snap = tasks.map(t => ({ taskId:t.id, startDate:t.startDate, endDate:t.endDate }))
    try { await apiFetch(`/jobs/${job.id}/baseline`, { method:'PUT', body:JSON.stringify({baseline:snap}) }); setBaseline(snap) } catch {}
  }
  function onLeftScroll(e)  { if (rightPanelRef.current) rightPanelRef.current.scrollTop = e.target.scrollTop }
  function onRightScroll(e) { if (leftPanelRef.current)  leftPanelRef.current.scrollTop  = e.target.scrollTop }

  return (
    <div className="gantt-print-root" style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.45)' }} onClick={() => { setCtxMenu(null); setTaskWindow(null) }}>
      <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column', background:'#fff', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
        <GanttHeader title={title} setTitle={setTitle} status={status} setStatus={setStatus}
          zoom={zoom} setZoom={setZoom} showCriticalPath={showCriticalPath} setShowCriticalPath={setShowCriticalPath}
          showBaseline={showBaseline} setShowBaseline={setShowBaseline}
          progress={`${doneTasks}/${totalLeaf} tasks complete`} saving={saving}
          onSave={handleSave} onClose={onClose} onExport={() => window.print()} onSetBaseline={handleSetBaseline} />
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <div ref={leftPanelRef} onScroll={onLeftScroll} style={{ width:220, flexShrink:0, overflowY:'auto', overflowX:'hidden', borderRight:'1px solid #e4e6ea' }}>
            <div style={{ height:HDR_H, background:'#f8f9fb', borderBottom:'1px solid #e4e6ea' }} />
            {visibleRows.map(row => {
              const taskIdx = row.isSubTask ? -1 : tasks.findIndex(t => t.id===row.task.id)
              return <LeftPanelRow key={`${row.parentId||''}-${row.task.id}`} row={row} collapsed={collapsed}
                onToggle={id => setCollapsed(c => ({...c,[id]:!c[id]}))} onChangeName={onChangeName}
                onCheck={onCheckTask} isFocused={row.task.id===focusId}
                rowIdx={taskIdx} onDragHandleDown={handleDragHandleDown} onRowOver={handleRowOver}
                onToggleMilestone={onToggleMilestone} onOpenMenu={openTaskMenu} />
            })}
            <div style={{ display:'flex', borderTop:'1px solid #f0f1f5' }}>
              <button onClick={addTask} style={{ flex:1, padding:'8px 12px', fontSize:12, color:'#4f67e4', background:'none', border:'none', textAlign:'left', cursor:'pointer' }}>+ Add task</button>
              <button onClick={addMilestone} style={{ padding:'8px 10px', fontSize:12, color:'#9298c4', background:'none', border:'none', cursor:'pointer' }}>◆ Milestone</button>
            </div>
          </div>
          <div ref={rightPanelRef} onScroll={onRightScroll} className="gantt-right-panel" style={{ flex:1, overflowX:'auto', overflowY:'auto', position:'relative' }}>
            <div style={{ width:chartWidth, minWidth:'100%', position:'relative' }}>
              <div style={{ height:24, display:'flex', position:'sticky', top:0, zIndex:2, background:'#f8f9fb', borderBottom:'1px solid #e4e6ea' }}>
                {colGroups.map((g,i) => <div key={i} style={{ width:g.w, flexShrink:0, fontSize:11, fontWeight:600, color:'#5f5e5a', padding:'0 6px', display:'flex', alignItems:'center', borderRight:'1px solid #e4e6ea' }}>{g.label}</div>)}
              </div>
              <div style={{ height:24, display:'flex', position:'sticky', top:24, zIndex:2, background:'#f8f9fb', borderBottom:'1px solid #e4e6ea' }}>
                {zoomCols.map(c => <div key={c.key} style={{ width:c.widthPx, flexShrink:0, fontSize:10, color:'#9298c4', display:'flex', alignItems:'center', justifyContent:'center', background:c.isWeekend?'rgba(0,0,0,0.05)':(c.isToday?'rgba(79,103,228,0.08)':undefined), borderLeft:c.isToday?'2px solid #185fa5':undefined }}>{c.subLabel}</div>)}
              </div>
              {visibleRows.map((row,ri) => (
                <div key={`${row.parentId||''}-${row.task.id}`} style={{ height:ROW_H, position:'relative', background:ri%2===0?'#fff':'#fafafa' }}>
                  {zoom==='day' && colsWithLeft.filter(c=>c.isWeekend).map(c => <div key={c.key} style={{ position:'absolute', left:c.left, top:0, width:c.widthPx, height:'100%', background:'rgba(0,0,0,0.03)', pointerEvents:'none' }} />)}
                  {isMilestone(row.task)
                    ? <MilestoneRow task={row.task} zoomCols={zoomCols} job={job} onToggleDone={onToggleMilestone} dragRef={dragRef} taskRowsRef={taskRowsRef} />
                    : row.task.startDate && row.task.endDate && <GanttBar row={row} job={job} zoomCols={zoomCols} criticalIds={criticalIds} showBaseline={showBaseline} baseline={baseline} dragRef={dragRef} taskRowsRef={taskRowsRef} onBarRightClick={onBarRightClick} barColor={getTaskBarColor(row.task, tasks, allSubTasks)} onLinkStart={startLinkDrag} />
                  }
                </div>
              ))}
              <DependencyOverlay rows={visibleRows} zoomCols={zoomCols} chartWidth={chartWidth} />
            </div>
          </div>
        </div>
      </div>
      {ctxMenu && ctxMenu.depIds?.length > 0 && (
        <CtxMenu ctxMenu={ctxMenu} onClose={() => setCtxMenu(null)} onRemoveDep={removeDep} flatRows={flatRows} />
      )}
      {taskWindow && (() => {
        const t = getTask(taskWindow.taskId, taskWindow.parentId)
        if (!t) return null
        return (
          <TaskWindow task={t} parentId={taskWindow.parentId} pos={{ x: taskWindow.x, y: taskWindow.y }}
            onClose={() => setTaskWindow(null)}
            onChangeName={onChangeName}
            onCheckTask={onCheckTask}
            onAddSubTask={addSubTask}
            onUpdateNotes={notes => updateNotes(taskWindow.taskId, taskWindow.parentId, notes)}
            onUpdatePct={v => updatePct(taskWindow.taskId, taskWindow.parentId, v)}
            onUploadFile={file => uploadTaskFile(taskWindow.taskId, taskWindow.parentId, file)}
            onDeleteFile={fileId => deleteTaskFile(taskWindow.taskId, taskWindow.parentId, fileId)}
            onDelete={() => deleteTask(taskWindow.taskId, taskWindow.parentId)} />
        )
      })()}
      {linkLine && (
        <>
          <style>{`* { cursor: crosshair !important; }`}</style>
          <svg style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', pointerEvents:'none', zIndex:100 }}>
            <defs>
              <marker id="ld-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M1 1L7 4L1 7" fill="none" stroke="#4f67e4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </marker>
            </defs>
            <line x1={linkLine.x1} y1={linkLine.y1} x2={linkLine.x2} y2={linkLine.y2} stroke="#4f67e4" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#ld-arrow)" />
          </svg>
        </>
      )}
    </div>
  )
}
