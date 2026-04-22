import { useState, useRef, useEffect } from 'react'
import {
  parseDate, toDateStr, addDays,
  taskBarPosition, cascadeTasksForward, enforceDependencies, wouldCreateCycle
} from '../pages/production/ganttUtils'

// All drag state and handlers for GanttModal.
// setTasks — the React state setter from GanttModal; functional updates keep it stable.
// Returns refs and handlers that GanttModal wires to child components.
export function useGanttDrag(setTasks, scrollRef) {
  const dragRef     = useRef(null)
  const reorderRef  = useRef(null)
  const taskRowsRef = useRef({})
  const linkDragRef = useRef(null)
  const zoomColsRef = useRef([])
  const panRef      = useRef(null)
  const [linkLine, setLinkLine] = useState(null)

  useEffect(() => {
    function onMouseMove(e) {
      if (linkDragRef.current) {
        const ld = linkDragRef.current
        setLinkLine({ x1: ld.startX, y1: ld.startY, x2: e.clientX, y2: e.clientY })
        return
      }
      const drag = dragRef.current; if (!drag) return
      const el = taskRowsRef.current[drag.taskId]; if (!el) return
      const dd = Math.round((e.clientX - drag.startMouseX) / drag.pixPerDay), cols = zoomColsRef.current
      if (drag.type === 'move') {
        const ns = toDateStr(addDays(parseDate(drag.origStartDate), dd))
        const ne = drag.isMilestone ? ns : toDateStr(addDays(parseDate(drag.origEndDate), dd))
        const p  = taskBarPosition({ startDate: ns, endDate: ne }, cols)
        if (drag.isMilestone) el.style.left = (p.left + p.width / 2 - 8) + 'px'
        else { el.style.left = p.left + 'px'; el.style.width = p.width + 'px' }
      } else {
        const ne = addDays(parseDate(drag.origEndDate), dd), ts = parseDate(drag.taskStartDate)
        el.style.width = taskBarPosition({ startDate: drag.taskStartDate, endDate: toDateStr(ne < ts ? ts : ne) }, cols).width + 'px'
      }
      if (scrollRef?.current) {
        const rect = scrollRef.current.getBoundingClientRect()
        const ZONE = 60, SPEED = 12
        if (e.clientX < rect.left + ZONE) scrollRef.current.scrollLeft -= SPEED
        else if (e.clientX > rect.right - ZONE) scrollRef.current.scrollLeft += SPEED
      }
    }
    function onMouseUp(e) {
      reorderRef.current = null
      if (linkDragRef.current) {
        const ld = linkDragRef.current
        linkDragRef.current = null
        setLinkLine(null)
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const barEl = el?.closest('[data-task-id]')
        if (barEl) {
          const toTaskId = barEl.dataset.taskId
          const toParentId = barEl.dataset.parentId || null
          if (toTaskId && toTaskId !== ld.fromTaskId) {
            // right-drag: source is predecessor, target is dependent
            // left-drag:  source is dependent, target is predecessor
            const predecessorId   = ld.side === 'right' ? ld.fromTaskId : toTaskId
            const dependentId     = ld.side === 'right' ? toTaskId      : ld.fromTaskId
            const dependentParent = ld.side === 'right' ? (toParentId || null) : (ld.fromParentId || null)
            setTasks(prev => {
              const allSubs = prev.flatMap(t => t.subTasks || [])
              if (wouldCreateCycle(prev, allSubs, predecessorId, dependentId)) return prev
              if (!dependentParent) return prev.map(t => t.id !== dependentId ? t : { ...t, dependsOn: [...new Set([...(t.dependsOn||[]), predecessorId])] })
              return prev.map(t => t.id !== dependentParent ? t : { ...t, subTasks: t.subTasks.map(s => s.id !== dependentId ? s : { ...s, dependsOn: [...new Set([...(s.dependsOn||[]), predecessorId])] }) })
            })
          }
        }
        return
      }
      const drag = dragRef.current; if (!drag) return; dragRef.current = null
      const dd = Math.round((e.clientX - drag.startMouseX) / drag.pixPerDay)
      setTasks(prev => {
        let u = prev.map(t => ({ ...t, subTasks: t.subTasks ? [...t.subTasks] : [] }))
        if (drag.parentId) {
          u = u.map(t => t.id !== drag.parentId ? t : { ...t, subTasks: t.subTasks.map(st => {
            if (st.id !== drag.taskId) return st
            if (drag.type === 'move') return { ...st, startDate: toDateStr(addDays(parseDate(drag.origStartDate), dd)), endDate: toDateStr(addDays(parseDate(drag.origEndDate), dd)) }
            const ne = addDays(parseDate(drag.origEndDate), dd), s = parseDate(st.startDate)
            return { ...st, endDate: toDateStr(ne < s ? s : ne) }
          }) })
        } else {
          const idx = u.findIndex(t => t.id === drag.taskId)
          if (idx !== -1) {
            if (drag.type === 'move') {
              if (drag.isMilestone) { const nd = toDateStr(addDays(parseDate(drag.origStartDate), dd)); u[idx].startDate = nd; u[idx].endDate = nd }
              else { u[idx].startDate = toDateStr(addDays(parseDate(drag.origStartDate), dd)); u[idx].endDate = toDateStr(addDays(parseDate(drag.origEndDate), dd)) }
            } else { const ne = addDays(parseDate(drag.origEndDate), dd), s = parseDate(u[idx].startDate); u[idx].endDate = toDateStr(ne < s ? s : ne) }
            if (!drag.isMilestone) u = cascadeTasksForward(u, idx)
          }
        }
        return enforceDependencies(u)
      })
    }
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [])

  function startLinkDrag(e, fromTaskId, fromParentId, side) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
    linkDragRef.current = { fromTaskId, fromParentId, startX: x, startY: y, side }
    setLinkLine({ x1: x, y1: y, x2: x, y2: y })
  }
  function handleDragHandleDown(rowIdx) { if (rowIdx===-1) return; reorderRef.current = { fromIdx: rowIdx } }
  function handleRowOver(rowIdx) {
    if (rowIdx===-1 || !reorderRef.current || rowIdx===reorderRef.current.fromIdx) return
    const from = reorderRef.current.fromIdx; reorderRef.current.fromIdx = rowIdx
    setTasks(prev => { const u=[...prev]; const [m]=u.splice(from,1); u.splice(rowIdx,0,m); return u })
  }
  function handlePanStart(e) {
    if (!scrollRef?.current) return
    const el = scrollRef.current
    const startX = e.clientX, startY = e.clientY
    const startLeft = el.scrollLeft, startTop = el.scrollTop
    panRef.current = true
    el.style.cursor = 'grabbing'
    function onMove(ev) {
      if (!(ev.buttons & 1)) { end(); return }
      el.scrollLeft = Math.max(0, startLeft - (ev.clientX - startX))
      el.scrollTop  = Math.max(0, startTop  - (ev.clientY - startY))
    }
    function end() {
      if (!panRef.current) return
      panRef.current = null
      el.style.cursor = 'grab'
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', end)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', end)
  }

  return { dragRef, reorderRef, taskRowsRef, linkDragRef, zoomColsRef, linkLine, setLinkLine, startLinkDrag, handleDragHandleDown, handleRowOver, panRef, handlePanStart }
}
