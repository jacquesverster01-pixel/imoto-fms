import { useState, useRef, useEffect } from 'react'
import { useGanttDrag } from '../../hooks/useGanttDrag'
import { apiFetch, BASE, UPLOADS_BASE } from '../../hooks/useApi'
import { useClickOutside } from '../../hooks/useClickOutside'
import {
  parseDate, toDateStr, addDays, getChartBounds, cascadeTasksForward,
  flattenTasksForDisplay, enforceDependencies, dependencyArrowPath,
  isMilestone, taskBarPosition, buildZoomColumns, getTodayScrollX, computeCriticalPath,
  getTaskBarColor, collectAllSubTasks, pixelXToDate
} from './ganttUtils'
import { updateNodeById, removeNodeById, appendChildTo, moveNodeTo, findNodeById, filterVisibleRows } from './taskTreeOps'
import { groupCols, ppd } from '../../utils/ganttLogic'
import { injectGanttPrintStyle } from '../../utils/ganttExport'
import TaskWindow from './TaskWindow'
import { migrateTasksSchema } from './taskMigration'

const ROW_H = 32, HDR_H = 48

function computeDateRange(tasks, padDays = 7) {
  const dates = tasks.flatMap(t => [t.startDate, t.endDate]).filter(Boolean)
  if (!dates.length) {
    const today = new Date()
    return { minDate: today, maxDate: addDays(today, 30) }
  }
  const min = new Date(Math.min(...dates.map(d => new Date(d))))
  const max = new Date(Math.max(...dates.map(d => new Date(d))))
  min.setDate(min.getDate() - padDays)
  max.setDate(max.getDate() + padDays)
  return { minDate: min, maxDate: max }
}
const STATUS_OPTIONS = [
  { value: 'quote', label: 'Quote' }, { value: 'in_progress', label: 'In progress' },
  { value: 'qc', label: 'QC' }, { value: 'dispatch', label: 'Dispatch' }, { value: 'done', label: 'Done' },
]

// Bug 1 fix: name is a read-only span; clicking anywhere on the row opens TaskWindow.
// Buttons/checkbox stop propagation so they don't accidentally open the window.
// Milestone diamond gets stopPropagation so clicking it only toggles done.
function LeftPanelRow({ row, collapsed, onToggle, onCheck, rowIdx, onDragHandleDown, onRowOver, onToggleMilestone, onOpenMenu, onSubtaskDragStart, isSubtaskDragTarget }) {
  const { task, isParent, isSubTask } = row
  const isMile = isMilestone(task)
  const rowBg = isSubtaskDragTarget ? 'rgba(79,103,228,0.13)'
    : isParent ? '#eef0fb'
    : isSubTask ? '#f6f7fd'
    : isMile ? '#fffcf4'
    : '#fff'
  const rowShadow = isSubtaskDragTarget ? 'inset 3px 0 0 #4f67e4'
    : isParent ? 'inset 3px 0 0 #4f67e4'
    : isSubTask ? 'inset 3px 0 0 #c5cbf0'
    : undefined
  return (
    <div
      data-left-row-task-id={task.id}
      data-left-row-parent-id={row.parentId || ''}
      style={{ height: ROW_H, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 + (row.depth * 20), paddingRight: 4, borderBottom: '1px solid #ecedf4', cursor: 'pointer', userSelect: 'none', background: rowBg, boxShadow: rowShadow, transition: 'background 0.12s' }}
      onMouseOver={() => onRowOver(rowIdx)}
      onClick={e => onOpenMenu(task.id, row.parentId, isParent, isMile, e)}>
      {row.depth === 0 && (
        <span
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onDragHandleDown(rowIdx) }}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 9, color: isParent ? '#9298c4' : '#ccc', cursor: 'grab', flexShrink: 0, letterSpacing: 1, userSelect: 'none', padding: '0 3px' }}>⋮⋮</span>
      )}
      {isMile
        ? <span onClick={e => { e.stopPropagation(); onToggleMilestone(task.id) }} style={{ cursor: 'pointer', color: task.done ? '#1a1d3b' : '#9298c4', fontSize: 12, flexShrink: 0 }}>◆</span>
        : isParent
          ? <button onClick={e => { e.stopPropagation(); onToggle(task.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f67e4', fontSize: 11, padding: 0, width: 14, flexShrink: 0 }}>{collapsed[task.id] ? '▸' : '▾'}</button>
          : <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', flexShrink: 0, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!task.done} onChange={e => { e.stopPropagation(); onCheck(task.id, row.parentId) }} style={{ cursor: 'pointer', margin: 0 }} />
            </div>
      }
      <span
        onMouseDown={e => { if (e.button !== 0) return; onSubtaskDragStart(task.id, row.parentId, e, task.name) }}
        style={{ flex: 1, fontSize: 12, color: task.done ? '#b0b5cc' : isParent ? '#1a1d3b' : isSubTask ? '#3a3e5c' : '#1a1d3b', textDecoration: task.done ? 'line-through' : 'none', fontWeight: isParent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {task.name}
      </span>
      {row.depth === 0 && (
        <button onClick={e => { e.stopPropagation(); onOpenMenu(task.id, row.parentId, isParent, isMile, e) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9298c4', fontSize: 16, padding: '0 3px', flexShrink: 0, lineHeight: 1, borderRadius: 4 }}>⋮</button>
      )}
    </div>
  )
}
function GanttHeader({ title, setTitle, status, setStatus, zoom, setZoom, zoomScale, setZoomScale, showCriticalPath, setShowCriticalPath, showBaseline, setShowBaseline, progress, onClose, onExport, onSetBaseline }) {
  const tog = on => ({ padding: '4px 10px', borderRadius: 6, border: '1px solid #dde0ea', fontSize: 12, cursor: 'pointer', background: on ? '#4f67e4' : '#fff', color: on ? '#fff' : '#1a1d3b' })
  const zBtn = { padding: '4px 8px', border: 'none', fontSize: 13, cursor: 'pointer', background: '#fff', color: '#1a1d3b', lineHeight: 1 }
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
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dde0ea', borderRadius: 6, overflow: 'hidden' }}>
        <button onClick={() => setZoomScale(s => Math.max(0.4, Math.round((s - 0.1) * 10) / 10))} style={{ ...zBtn, borderRight: '1px solid #dde0ea' }}>−</button>
        <button onClick={() => setZoomScale(1.0)} style={{ ...zBtn, borderRight: '1px solid #dde0ea', fontSize: 11, minWidth: 44, textAlign: 'center' }}>{Math.round(zoomScale * 100)}%</button>
        <button onClick={() => setZoomScale(s => Math.min(3.0, Math.round((s + 0.1) * 10) / 10))} style={zBtn}>+</button>
      </div>
      <button onClick={() => setShowCriticalPath(v => !v)} style={tog(showCriticalPath)}>Critical path</button>
      <button onClick={onSetBaseline} style={tog(false)}>Set baseline</button>
      <button onClick={() => setShowBaseline(v => !v)} style={tog(showBaseline)}>Show baseline</button>
      <button onClick={onExport} style={tog(false)}>Export PDF</button>
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
  const [hovered, setHovered] = useState(false)
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
            style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${barColor}`, cursor: 'crosshair', zIndex: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'all' : 'none', transition: 'opacity 0.15s' }} />
        )}
        {!isParent && (
          <div onMouseDown={e => { e.stopPropagation(); onLinkStart(e, task.id, parentId || null, 'right') }}
            style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${barColor}`, cursor: 'crosshair', zIndex: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'all' : 'none', transition: 'opacity 0.15s' }} />
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

export default function GanttModal({ job, onClose, onSaved, inline }) {
  const [tasks,            setTasks]            = useState(() => migrateTasksSchema((job.tasks || []).map(t => ({ pct: 0, dependsOn: [], children: [], components: [], itemCode: null, department: null, ...t }))))
  const [title,            setTitle]            = useState(job.title || '')
  const [status,           setStatus]           = useState(job.status || 'quote')
  const [collapsed,        setCollapsed]        = useState({})
  const [ctxMenu,          setCtxMenu]          = useState(null)
  const [taskWindow,       setTaskWindow]       = useState(null)
  const [zoom,             setZoom]             = useState('day')
  const [zoomScale,        setZoomScale]        = useState(1.0)
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [showBaseline,     setShowBaseline]     = useState(false)
  const [baseline,         setBaseline]         = useState(job.baseline || [])
  const [dateRange,        setDateRange]        = useState(() => computeDateRange(migrateTasksSchema((job.tasks || []).map(t => ({ pct: 0, dependsOn: [], children: [], components: [], itemCode: null, department: null, ...t })))))
  const [bomItems,         setBomItems]         = useState([])
  const [ghostBar,         setGhostBar]         = useState(null)
  const [subtaskDropHighlight, setSubtaskDropHighlight] = useState(null)
  const [ghostCard,            setGhostCard]            = useState(null)

  const rightPanelRef = useRef(null)
  const { dragRef, reorderRef, taskRowsRef, linkDragRef, zoomColsRef, linkLine, setLinkLine, startLinkDrag, handleDragHandleDown, handleRowOver, panRef, handlePanStart } = useGanttDrag(setTasks, rightPanelRef)
  const leftPanelRef  = useRef(null)
  const dateDrawRef   = useRef(null)
  const colsWithLeftRef = useRef([])
  const subtaskDragRef  = useRef(null)
  const subtaskDropRef  = useRef(null)
  const lastSubtaskDragEndRef = useRef(0)

  const flatRows    = flattenTasksForDisplay(tasks)
  const visibleRows = filterVisibleRows(flatRows, collapsed)
  const { minDate, maxDate } = dateRange
  const zoomCols = buildZoomColumns(minDate, maxDate, zoom, zoomScale)
  zoomColsRef.current = zoomCols
  const chartWidth = zoomCols.reduce((s, c) => s + c.widthPx, 0)
  const colGroups  = groupCols(zoomCols)
  let acc = 0
  const colsWithLeft = zoomCols.map(c => { const l = acc; acc += c.widthPx; return { ...c, left: l } })
  colsWithLeftRef.current = colsWithLeft
  const doneTasks   = flatRows.filter(r => !r.isParent && r.task.done).length
  const totalLeaf   = flatRows.filter(r => !r.isParent).length
  const criticalIds = showCriticalPath ? computeCriticalPath(tasks) : []
  const allDescendants = collectAllSubTasks(tasks)

  // No IIFE: compute task for TaskWindow before JSX
  const taskWindowTask = taskWindow ? findNodeById(tasks, taskWindow.taskId) : null

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') { setCtxMenu(null); setTaskWindow(null); linkDragRef.current = null; setLinkLine(null); dateDrawRef.current = null; setGhostBar(null) } }
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn)
  }, [])
  useEffect(() => { if (rightPanelRef.current) rightPanelRef.current.scrollLeft = getTodayScrollX(zoomColsRef.current) }, [zoom, zoomScale])
  useEffect(() => injectGanttPrintStyle(), [])
  useEffect(() => {
    const el = rightPanelRef.current
    if (!el) return
    function onWheel(e) {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoomScale(s => { const next = Math.round((s + (e.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10; return Math.min(3.0, Math.max(0.4, next)) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])
  useEffect(() => {
    const { minDate: newMin, maxDate: newMax } = computeDateRange(tasks)
    setDateRange(prev => {
      if (newMin < prev.minDate || newMax > prev.maxDate) return { minDate: newMin, maxDate: newMax }
      return prev
    })
  }, [tasks])
  useEffect(() => {
    if (job.bomId) apiFetch(`/boms/${job.bomId}`).then(bom => { if (Array.isArray(bom?.items)) setBomItems(bom.items) }).catch(() => {})
  }, [])
  useEffect(() => {
    function handleMouseMove(e) {
      if (!dateDrawRef.current) return
      const rect = rightPanelRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left + (rightPanelRef.current?.scrollLeft || 0)
      const startPx = dateDrawRef.current.startPx
      setGhostBar({ left: Math.min(startPx, x), width: Math.abs(x - startPx), rowIndex: dateDrawRef.current.rowIndex })
    }
    function handleMouseUp(e) {
      if (!dateDrawRef.current) return
      const rect = rightPanelRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left + (rightPanelRef.current?.scrollLeft || 0)
      const startPx = dateDrawRef.current.startPx
      const px1 = Math.min(startPx, x), px2 = Math.max(startPx, x)
      const d1 = pixelXToDate(px1, colsWithLeftRef.current)
      const d2 = pixelXToDate(px2, colsWithLeftRef.current)
      const { taskId } = dateDrawRef.current
      setTasks(p => updateNodeById(p, taskId, n => ({ ...n, startDate: d1, endDate: d2 })))
      dateDrawRef.current = null
      setGhostBar(null)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [])
  useEffect(() => {
    function onMove(e) {
      if (!subtaskDragRef.current) return
      const { startX, startY, taskName } = subtaskDragRef.current
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) subtaskDragRef.current.dragging = true
      if (!subtaskDragRef.current.dragging) return
      setGhostCard({ name: taskName, x: e.clientX, y: e.clientY })
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const rowEl = el?.closest('[data-left-row-task-id]')
      if (!rowEl) { subtaskDropRef.current = null; setSubtaskDropHighlight(null); return }
      const hoveredId = rowEl.dataset.leftRowTaskId
      const resolved = hoveredId === subtaskDragRef.current.taskId ? null : hoveredId
      subtaskDropRef.current = resolved
      setSubtaskDropHighlight(resolved)
    }
    function onUp() {
      if (!subtaskDragRef.current) return
      const { taskId, parentId, dragging } = subtaskDragRef.current
      const dropTarget = subtaskDropRef.current
      subtaskDragRef.current = null
      subtaskDropRef.current = null
      if (dragging) {
        lastSubtaskDragEndRef.current = Date.now()
        if (dropTarget) makeSubTask(taskId, parentId, dropTarget)
      }
      setGhostCard(null)
      setSubtaskDropHighlight(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  async function handleClose() {
    try {
      await apiFetch(`/jobs/${job.id}/tasks`, { method: 'PUT', body: JSON.stringify({ tasks }) })
      await apiFetch(`/jobs/${job.id}`, { method: 'PUT', body: JSON.stringify({ title, status }) })
      onSaved()
    } catch (e) { console.error('[GanttModal save on close]', e) }
    onClose()
  }
  function addTask() {
    const id = `t-${Date.now()}`
    setTasks(prev => { const last = prev[prev.length-1]; const d = toDateStr(addDays(last?.endDate ? parseDate(last.endDate) : new Date(), 1))
      return [...prev, { id, name: 'New task', startDate: d, endDate: d, done: false, pct: 0, dependsOn: [], children: [], components: [], itemCode: null, department: null, assignedTo: null }] })
  }
  function addMilestone() {
    const id = `t-${Date.now()}`; const d = toDateStr(addDays(new Date(), 1))
    setTasks(prev => [...prev, { id, name: 'Milestone', startDate: d, endDate: d, milestone: true, done: false, pct: 0, dependsOn: [], children: [], components: [], itemCode: null, department: null }])
  }
  function addSubTask(taskId, parentId) {
    const parent = findNodeById(tasks, taskId)
    const d0 = parent?.endDate ? parseDate(parent.endDate) : new Date()
    const newChild = { id: `st-${Date.now()}`, name: 'New sub-task', startDate: toDateStr(d0), endDate: toDateStr(addDays(d0, 1)), done: false, pct: 0, dependsOn: [], children: [], assignedTo: null }
    setTasks(p => appendChildTo(p, taskId, newChild))
  }
  function onChangeName(id, parentId, val) {
    setTasks(p => updateNodeById(p, id, n => ({ ...n, name: val })))
  }
  function onCheckTask(id, parentId) {
    setTasks(p => updateNodeById(p, id, n => ({ ...n, done: !n.done, pct: !n.done ? 100 : 0 })))
  }
  function onToggleMilestone(id) { setTasks(p => p.map(t => t.id===id ? {...t,done:!t.done,pct:!t.done?100:0} : t)) }
  function removeDep(taskId, depId) { setTasks(p => updateNodeById(p, taskId, n => ({ ...n, dependsOn: (n.dependsOn || []).filter(d => d !== depId) }))) }
  function onBarRightClick(e, taskId, parentId, depIds) { setCtxMenu({ x: Math.min(e.clientX, window.innerWidth-200), y: e.clientY, taskId, parentId, depIds }) }
  function deleteTask(taskId, parentId) {
    setTasks(p => removeNodeById(p, taskId))
    setTaskWindow(null)
  }
  function updateNotes(taskId, parentId, notes) {
    setTasks(p => updateNodeById(p, taskId, n => ({ ...n, notes })))
  }
  function updatePct(taskId, parentId, v) {
    setTasks(p => updateNodeById(p, taskId, n => ({ ...n, pct: v, done: v === 100 })))
  }
  async function uploadTaskFile(taskId, parentId, file) {
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch(`${BASE}/jobs/${job.id}/tasks/${taskId}/files`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const rec = await res.json()
      if (!rec.id) return
      setTasks(p => updateNodeById(p, taskId, n => ({ ...n, files: [...(n.files || []), rec] })))
    } catch (e) { console.error('[uploadTaskFile]', e) }
  }
  function deleteTaskFile(taskId, parentId, fileId) {
    setTasks(p => updateNodeById(p, taskId, n => ({ ...n, files: (n.files || []).filter(f => f.id !== fileId) })))
  }
  function makeSubTask(taskId, fromParentId, newParentId) {
    setTasks(prev => moveNodeTo(prev, taskId, newParentId))
  }
  function startSubtaskDrag(taskId, parentId, e, taskName) {
    subtaskDragRef.current = { taskId, parentId, taskName, startX: e.clientX, startY: e.clientY, dragging: false }
  }
  function openTaskMenu(taskId, parentId, isParent, isMile, e) {
    if (Date.now() - lastSubtaskDragEndRef.current < 200) return
    const row = e.currentTarget
    const rect = row.getBoundingClientRect()
    const maxH = Math.round(window.innerHeight * 0.72)
    const neededTop = window.innerHeight - maxH - 8
    if (rect.top > neededTop && leftPanelRef.current) {
      leftPanelRef.current.scrollTop += rect.top - neededTop
    }
    const r = row.getBoundingClientRect()
    setTaskWindow({ taskId, parentId, isParent, isMile, x: r.right + 8, y: r.top })
  }
  async function handleSetBaseline() {
    const snap = tasks.map(t => ({ taskId:t.id, startDate:t.startDate, endDate:t.endDate }))
    try { await apiFetch(`/jobs/${job.id}/baseline`, { method:'PUT', body:JSON.stringify({baseline:snap}) }); setBaseline(snap) } catch {}
  }
  function onLeftScroll(e)  { if (rightPanelRef.current) rightPanelRef.current.scrollTop = e.target.scrollTop }
  function onRightScroll(e) { if (leftPanelRef.current)  leftPanelRef.current.scrollTop  = e.target.scrollTop }

  const panelStyle = inline
    ? { width: '100%', height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden', borderRadius: 10, border: '1px solid #e4e6ea' }
    : { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }

  const ganttPanel = (
    <div className="gantt-print-root" style={panelStyle} onClick={e => e.stopPropagation()}>
      <GanttHeader title={title} setTitle={setTitle} status={status} setStatus={setStatus}
        zoom={zoom} setZoom={setZoom} zoomScale={zoomScale} setZoomScale={setZoomScale}
        showCriticalPath={showCriticalPath} setShowCriticalPath={setShowCriticalPath}
        showBaseline={showBaseline} setShowBaseline={setShowBaseline}
        progress={`${doneTasks}/${totalLeaf} tasks complete`}
        onClose={handleClose} onExport={() => window.print()} onSetBaseline={handleSetBaseline} />
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <div ref={leftPanelRef} onScroll={onLeftScroll} style={{ width:220, flexShrink:0, overflowY:'auto', overflowX:'hidden', borderRight:'1px solid #e4e6ea' }}>
          <div style={{ height:HDR_H, background:'#f8f9fb', borderBottom:'1px solid #e4e6ea' }} />
          {visibleRows.map(row => {
            const taskIdx = row.depth > 0 ? -1 : tasks.findIndex(t => t.id === row.task.id)
            return <LeftPanelRow key={`${row.parentId||''}-${row.task.id}`} row={row} collapsed={collapsed}
              onToggle={id => setCollapsed(c => ({...c,[id]:!c[id]}))}
              onCheck={onCheckTask} rowIdx={taskIdx}
              onDragHandleDown={handleDragHandleDown} onRowOver={handleRowOver}
              onToggleMilestone={onToggleMilestone} onOpenMenu={openTaskMenu}
              onSubtaskDragStart={startSubtaskDrag}
              isSubtaskDragTarget={subtaskDropHighlight === row.task.id} />
          })}
          <div style={{ display:'flex', borderTop:'1px solid #f0f1f5' }}>
            <button onClick={addTask} style={{ flex:1, padding:'8px 12px', fontSize:12, color:'#4f67e4', background:'none', border:'none', textAlign:'left', cursor:'pointer' }}>+ Add task</button>
            <button onClick={addMilestone} style={{ padding:'8px 10px', fontSize:12, color:'#9298c4', background:'none', border:'none', cursor:'pointer' }}>◆ Milestone</button>
          </div>
        </div>
        <div ref={rightPanelRef} onScroll={onRightScroll} className="gantt-right-panel"
          style={{ flex:1, overflowX:'auto', overflowY:'auto', position:'relative', cursor:'grab' }}
          onMouseDown={e => {
            if (e.button !== 0) return
            if (e.target.closest('[data-task-id]')) return
            if (dateDrawRef.current) return
            handlePanStart(e)
          }}>
          <div style={{ width:chartWidth, minWidth:'100%', position:'relative' }}>
            <div style={{ height:24, display:'flex', position:'sticky', top:0, zIndex:2, background:'#f8f9fb', borderBottom:'1px solid #e4e6ea' }}>
              {colGroups.map((g,i) => <div key={i} style={{ width:g.w, flexShrink:0, fontSize:11, fontWeight:600, color:'#5f5e5a', padding:'0 6px', display:'flex', alignItems:'center', borderRight:'1px solid #e4e6ea' }}>{g.label}</div>)}
            </div>
            <div style={{ height:24, display:'flex', position:'sticky', top:24, zIndex:2, background:'#f8f9fb', borderBottom:'1px solid #e4e6ea' }}>
              {zoomCols.map(c => <div key={c.key} style={{ width:c.widthPx, flexShrink:0, fontSize:10, color:'#9298c4', display:'flex', alignItems:'center', justifyContent:'center', background:c.isWeekend?'rgba(0,0,0,0.05)':(c.isToday?'rgba(79,103,228,0.08)':undefined), borderLeft:c.isToday?'2px solid #185fa5':undefined }}>{c.subLabel}</div>)}
            </div>
            {visibleRows.map((row,ri) => {
              const { task: rt, isParent: rip } = row
              const noDate = !rt.startDate && !isMilestone(rt) && !rip
              return (
                <div key={`${row.parentId||''}-${rt.id}`}
                  style={{ height:ROW_H, position:'relative', background:ri%2===0?'#fff':'#fafafa', cursor:noDate?'crosshair':undefined }}
                  onMouseDown={noDate ? e => {
                    if (e.button !== 0) return
                    const rect = rightPanelRef.current?.getBoundingClientRect()
                    if (!rect) return
                    const x = e.clientX - rect.left + (rightPanelRef.current?.scrollLeft || 0)
                    dateDrawRef.current = { taskId: rt.id, parentId: row.parentId, rowIndex: ri, startPx: x }
                  } : undefined}>
                  {zoom==='day' && colsWithLeft.filter(c=>c.isWeekend).map(c => <div key={c.key} style={{ position:'absolute', left:c.left, top:0, width:c.widthPx, height:'100%', background:'rgba(0,0,0,0.03)', pointerEvents:'none' }} />)}
                  {isMilestone(rt)
                    ? <MilestoneRow task={rt} zoomCols={zoomCols} job={job} onToggleDone={onToggleMilestone} dragRef={dragRef} taskRowsRef={taskRowsRef} />
                    : rt.startDate && rt.endDate
                      ? <GanttBar row={row} job={job} zoomCols={zoomCols} criticalIds={criticalIds} showBaseline={showBaseline} baseline={baseline} dragRef={dragRef} taskRowsRef={taskRowsRef} onBarRightClick={onBarRightClick} barColor={getTaskBarColor(rt, tasks, allDescendants)} onLinkStart={startLinkDrag} />
                      : noDate && !ghostBar && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', paddingLeft:8, pointerEvents:'none' }}><span style={{ fontSize:11, color:'#c0c5d8' }}>Click & drag to set dates</span></div>
                  }
                  {ghostBar && ghostBar.rowIndex === ri && ghostBar.width > 2 && (
                    <div style={{ position:'absolute', left:ghostBar.left, top:6, width:ghostBar.width, height:20, border:'2px dashed #2563eb', background:'rgba(37,99,235,0.08)', borderRadius:4, pointerEvents:'none' }} />
                  )}
                </div>
              )
            })}
            <DependencyOverlay rows={visibleRows} zoomCols={zoomCols} chartWidth={chartWidth} />
          </div>
        </div>
      </div>
    </div>
  )

  const floatingOverlays = (
    <>
      {ctxMenu && ctxMenu.depIds?.length > 0 && (
        <CtxMenu ctxMenu={ctxMenu} onClose={() => setCtxMenu(null)} onRemoveDep={removeDep} flatRows={flatRows} />
      )}
      {taskWindow && taskWindowTask && (
        <TaskWindow task={taskWindowTask} parentId={taskWindow.parentId} pos={{ x: taskWindow.x, y: taskWindow.y }}
          onClose={() => setTaskWindow(null)}
          onChangeName={onChangeName}
          onCheckTask={onCheckTask}
          onAddSubTask={addSubTask}
          onUpdateNotes={notes => updateNotes(taskWindow.taskId, taskWindow.parentId, notes)}
          onUpdatePct={v => updatePct(taskWindow.taskId, taskWindow.parentId, v)}
          onUploadFile={file => uploadTaskFile(taskWindow.taskId, taskWindow.parentId, file)}
          onDeleteFile={fileId => deleteTaskFile(taskWindow.taskId, taskWindow.parentId, fileId)}
          onDelete={() => deleteTask(taskWindow.taskId, taskWindow.parentId)} />
      )}
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
      {ghostCard && (
        <>
          <style>{`* { cursor: grabbing !important; }`}</style>
          <div style={{ position:'fixed', left: ghostCard.x + 16, top: ghostCard.y - 14, zIndex:300, pointerEvents:'none', userSelect:'none',
            background:'#4f67e4', color:'#fff', borderRadius:7, padding:'5px 11px 5px 9px',
            fontSize:12, fontWeight:500, boxShadow:'0 6px 18px rgba(79,103,228,0.45)',
            maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:0.93,
            display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:10, opacity:0.8 }}>⤵</span>
            {ghostCard.name}
          </div>
        </>
      )}
    </>
  )

  if (inline) {
    return (
      <>
        {ganttPanel}
        {floatingOverlays}
      </>
    )
  }

  // Bug 2 fix: only close ctxMenu/taskWindow when clicking the dark overlay itself,
  // not when clicks bubble up from child elements (ganttPanel or TaskWindow).
  return (
    <div className="gantt-print-root" style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) { setCtxMenu(null); setTaskWindow(null) } }}>
      {ganttPanel}
      {floatingOverlays}
    </div>
  )
}
