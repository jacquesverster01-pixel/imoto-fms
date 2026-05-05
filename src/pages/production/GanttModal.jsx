import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useGanttDrag } from '../../hooks/useGanttDrag'
import { apiFetch, BASE } from '../../hooks/useApi'
import { useClickOutside } from '../../hooks/useClickOutside'
import {
  parseDate, toDateStr, addDays,
  flattenTasksForDisplay, buildZoomColumns, getTodayScrollX, computeCriticalPath,
  collectAllSubTasks, pixelXToDate
} from './ganttUtils'
import { updateNodeById, removeNodeById, appendChildTo, moveNodeTo, findNodeById, filterVisibleRows } from './taskTreeOps'
import { groupCols } from '../../utils/ganttLogic'
import { injectGanttPrintStyle } from '../../utils/ganttExport'
import TaskWindow from './TaskWindow'
import { migrateTasksSchema } from './taskMigration'
import GanttHeader from './gantt/GanttHeader'
import GanttLeftPanel from './gantt/GanttLeftPanel'
import GanttChartArea from './gantt/GanttChartArea'

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

export default function GanttModal({ job, onClose, onSaved, embedded }) {
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
  const [leftPanelWidth,       setLeftPanelWidth]       = useState(() => {
    const saved = parseInt(localStorage.getItem('gantt-left-panel-width'), 10)
    return Number.isFinite(saved) && saved >= 160 && saved <= 480 ? saved : 220
  })
  const [rowHeights,           setRowHeights]           = useState({})
  const [resizeHandleHovered,  setResizeHandleHovered]  = useState(false)

  const rightPanelRef = useRef(null)
  const { dragRef, reorderRef, taskRowsRef, linkDragRef, zoomColsRef, linkLine, setLinkLine, startLinkDrag, handleDragHandleDown, handleRowOver, panRef, handlePanStart } = useGanttDrag(setTasks, rightPanelRef)
  const leftPanelRef  = useRef(null)
  const dateDrawRef   = useRef(null)
  const colsWithLeftRef = useRef([])
  const subtaskDragRef  = useRef(null)
  const subtaskDropRef  = useRef(null)
  const lastSubtaskDragEndRef = useRef(0)
  const resizeRef       = useRef(null)
  const rowElsRef       = useRef({})

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
  useEffect(() => {
    function onMove(e) {
      if (!resizeRef.current) return
      const dx = e.clientX - resizeRef.current.startMouseX
      const next = Math.max(160, Math.min(480, resizeRef.current.startWidth + dx))
      if (leftPanelRef.current) leftPanelRef.current.style.width = next + 'px'
    }
    function onUp(e) {
      if (!resizeRef.current) return
      const dx = e.clientX - resizeRef.current.startMouseX
      const next = Math.max(160, Math.min(480, resizeRef.current.startWidth + dx))
      setLeftPanelWidth(next)
      resizeRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  useEffect(() => {
    localStorage.setItem('gantt-left-panel-width', String(leftPanelWidth))
  }, [leftPanelWidth])
  useLayoutEffect(() => {
    function measure() {
      const heights = {}
      visibleRows.forEach((_, i) => {
        const el = rowElsRef.current[i]
        if (el) heights[i] = el.getBoundingClientRect().height
      })
      setRowHeights(prev => {
        const same = Object.keys(heights).length === Object.keys(prev).length &&
          Object.keys(heights).every(k => heights[k] === prev[k])
        return same ? prev : heights
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tasks, collapsed, leftPanelWidth, zoom, zoomScale])

  function onToggle(id) { setCollapsed(c => ({ ...c, [id]: !c[id] })) }

  async function handleClose() {
    try {
      await apiFetch(`/jobs/${job.id}/tasks`, { method: 'PUT', body: JSON.stringify({ tasks }) })
      await apiFetch(`/jobs/${job.id}`, { method: 'PUT', body: JSON.stringify({ title, status }) })
      if (onSaved) onSaved()
    } catch (e) { console.error('[GanttModal save on close]', e) }
    if (onClose) onClose()
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
  function handlePanelResizeStart(e) {
    e.preventDefault()
    resizeRef.current = { startMouseX: e.clientX, startWidth: leftPanelWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const panelStyle = embedded
    ? { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#fff', overflow: 'hidden' }
    : { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }

  const ganttPanel = (
    <div className="gantt-print-root" style={panelStyle} onClick={e => e.stopPropagation()}>
      <GanttHeader title={title} setTitle={setTitle} status={status} setStatus={setStatus}
        zoom={zoom} setZoom={setZoom} zoomScale={zoomScale} setZoomScale={setZoomScale}
        showCriticalPath={showCriticalPath} setShowCriticalPath={setShowCriticalPath}
        showBaseline={showBaseline} setShowBaseline={setShowBaseline}
        progress={`${doneTasks}/${totalLeaf} tasks complete`}
        onClose={handleClose} onExport={() => window.print()} onSetBaseline={handleSetBaseline}
        embedded={embedded} />
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <GanttLeftPanel
          visibleRows={visibleRows} tasks={tasks}
          collapsed={collapsed} onToggle={onToggle}
          leftPanelWidth={leftPanelWidth} leftPanelRef={leftPanelRef}
          onLeftScroll={onLeftScroll}
          subtaskDropHighlight={subtaskDropHighlight} rowElsRef={rowElsRef}
          onCheck={onCheckTask} onToggleMilestone={onToggleMilestone}
          onOpenMenu={openTaskMenu} onDragHandleDown={handleDragHandleDown}
          onRowOver={handleRowOver} onSubtaskDragStart={startSubtaskDrag}
          onAddTask={addTask} onAddMilestone={addMilestone} />
        <div
          style={{ width: 4, flexShrink: 0, cursor: 'col-resize', background: resizeHandleHovered ? 'rgba(79,103,228,0.2)' : '#e4e6ea', zIndex: 10, userSelect: 'none' }}
          onMouseDown={handlePanelResizeStart}
          onMouseEnter={() => setResizeHandleHovered(true)}
          onMouseLeave={() => setResizeHandleHovered(false)}
          title="Drag to resize"
        />
        <GanttChartArea
          visibleRows={visibleRows} tasks={tasks}
          zoomCols={zoomCols} colsWithLeft={colsWithLeft} colGroups={colGroups}
          chartWidth={chartWidth} criticalIds={criticalIds} zoom={zoom}
          job={job} showBaseline={showBaseline} baseline={baseline}
          allDescendants={allDescendants} ghostBar={ghostBar}
          rowHeights={rowHeights} rightPanelRef={rightPanelRef}
          dragRef={dragRef} taskRowsRef={taskRowsRef} dateDrawRef={dateDrawRef}
          onRightScroll={onRightScroll} handlePanStart={handlePanStart}
          onToggleMilestone={onToggleMilestone} onBarRightClick={onBarRightClick}
          startLinkDrag={startLinkDrag} />
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

  if (embedded) {
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
