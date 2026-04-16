// useMapDrag.js — drag hook for zones and assets
import { useState, useRef, useEffect } from 'react'
import { zoneBBox, computeSnap, zoneOverlapsOthers } from './factoryMapUtils'

export function useMapDrag(canvasRef, zonesRef, zoneRectElsRef, zoneLabelElsRef, editModeRef, showToastRef) {
  const [snapLines,  setSnapLines]  = useState([])
  const dragRef      = useRef(null)
  const overlapRef   = useRef(false)
  const snapLinesRef = useRef([])
  const assetElsRef  = useRef({})
  const onZoneDropRef  = useRef(null)
  const onAssetDropRef = useRef(null)

  useEffect(() => {
    const sameLines = (a, b) => a.length === b.length && a.every((l, i) => l.axis === b[i].axis && l.value === b[i].value)

    function handleMouseMove(e) {
      if (!editModeRef.current || !dragRef.current) return
      const canvas = canvasRef.current; if (!canvas) return
      const { width: cW, height: cH } = canvas.getBoundingClientRect()
      const drag = dragRef.current

      if (drag.type === 'zone') {
        const zone = zonesRef.current.find(z => z.id === drag.zoneId); if (!zone) return
        const clampX = Math.max(0, Math.min(drag.startBBoxX + e.clientX - drag.startMouseX, cW - drag.startBBoxW))
        const clampY = Math.max(0, Math.min(drag.startBBoxY + e.clientY - drag.startMouseY, cH - drag.startBBoxH))
        const snap = computeSnap(
          { x: clampX, y: clampY, w: drag.startBBoxW, h: drag.startBBoxH },
          zonesRef.current.filter(z => z.id !== drag.zoneId).map(z => zoneBBox(z, cW, cH)),
          cW, cH
        )
        drag.currentDx = snap.x - drag.startBBoxX
        drag.currentDy = snap.y - drag.startBBoxY

        for (const r of zone.rects) {
          const o = drag.preRects.find(p => p.id === r.id); const el = zoneRectElsRef.current[r.id]
          if (o && el) { el.style.left = `${(o.xPct + drag.currentDx / cW) * 100}%`; el.style.top = `${(o.yPct + drag.currentDy / cH) * 100}%` }
        }
        const lblEl = zoneLabelElsRef.current[drag.zoneId]
        if (lblEl) { lblEl.style.left = `${(drag.origLabelLeft + drag.currentDx / cW) * 100}%`; lblEl.style.top = `${(drag.origLabelTop + drag.currentDy / cH) * 100}%` }

        if (!sameLines(snapLinesRef.current, snap.lines)) { snapLinesRef.current = snap.lines; setSnapLines([...snap.lines]) }
        if (snap.lines.length && !drag.hasSentSnapToast) { drag.hasSentSnapToast = true; showToastRef.current?.('Snapped', 'info') }

        const tentRects = zone.rects.map(r => { const o = drag.preRects.find(p => p.id === r.id); return { ...r, xPct: o.xPct + drag.currentDx / cW, yPct: o.yPct + drag.currentDy / cH } })
        overlapRef.current = zoneOverlapsOthers({ ...zone, rects: tentRects }, zonesRef.current, cW, cH)
        for (const r of zone.rects) { const el = zoneRectElsRef.current[r.id]; if (el) el.style.boxShadow = overlapRef.current ? '0 4px 16px rgba(108,99,255,0.18), inset 0 0 0 999px rgba(226,75,74,0.22)' : '0 4px 16px rgba(108,99,255,0.18)' }
      }

      if (drag.type === 'asset') {
        const el = assetElsRef.current[drag.assetId]
        drag.currentXPct = Math.max(0, Math.min(1, drag.startXPct + (e.clientX - drag.startMouseX) / cW))
        drag.currentYPct = Math.max(0, Math.min(1, drag.startYPct + (e.clientY - drag.startMouseY) / cH))
        if (el) { el.style.left = `calc(${drag.currentXPct * 100}% - 16px)`; el.style.top = `calc(${drag.currentYPct * 100}% - 16px)` }
      }

      if (drag.type === 'resize') {
        const zone = zonesRef.current.find(z => z.id === drag.zoneId); if (!zone) return
        const r = zone.rects[0]; if (!r) return
        const el = zoneRectElsRef.current[r.id]
        const newWPct = Math.max(40 / cW, Math.min(drag.startWidthPct + (e.clientX - drag.startMouseX) / cW, 1 - drag.startXPct))
        const newHPct = Math.max(24 / cH, Math.min(drag.startHeightPct + (e.clientY - drag.startMouseY) / cH, 1 - drag.startYPct))
        drag.currentWidthPct = newWPct; drag.currentHeightPct = newHPct
        if (el) { el.style.width = `${newWPct * 100}%`; el.style.height = `${newHPct * 100}%` }
        const lblEl = zoneLabelElsRef.current[drag.zoneId]
        if (lblEl) { lblEl.style.left = `${(drag.startXPct + newWPct / 2) * 100}%`; lblEl.style.top = `${(drag.startYPct + newHPct / 2) * 100}%` }
      }
    }

    async function handleMouseUp() {
      if (!dragRef.current) return
      const drag = dragRef.current

      if (drag.type === 'zone') {
        const { zoneId, currentDx, currentDy, preRects, origLabelLeft, origLabelTop } = drag
        const ov = overlapRef.current
        dragRef.current = null; overlapRef.current = false; snapLinesRef.current = []; setSnapLines([])
        const zone = zonesRef.current.find(z => z.id === zoneId)
        if (zone) { for (const r of zone.rects) { const el = zoneRectElsRef.current[r.id]; if (el) { el.style.boxShadow = ''; el.style.cursor = '' } } }
        if (canvasRef.current) canvasRef.current.style.cursor = ''
        if (ov) {
          if (zone) {
            for (const r of zone.rects) { const o = preRects.find(p => p.id === r.id); const el = zoneRectElsRef.current[r.id]; if (o && el) { el.style.left = `${o.xPct * 100}%`; el.style.top = `${o.yPct * 100}%` } }
            const lblEl = zoneLabelElsRef.current[zoneId]; if (lblEl) { lblEl.style.left = `${origLabelLeft * 100}%`; lblEl.style.top = `${origLabelTop * 100}%` }
          }
          showToastRef.current?.('Cannot place — zones overlapping', 'error'); return
        }
        if (currentDx == null) return
        const { width: cW, height: cH } = canvasRef.current?.getBoundingClientRect() || { width: 900, height: 506 }
        const updated = zonesRef.current.map(z => z.id !== zoneId ? z : {
          ...z, rects: z.rects.map(r => { const o = preRects.find(p => p.id === r.id); return { ...r, xPct: Math.max(0, o.xPct + currentDx / cW), yPct: Math.max(0, o.yPct + currentDy / cH) } })
        })
        try { await onZoneDropRef.current?.(updated) } catch (err) { console.error('Zone drop save failed:', err) }
      }

      if (drag.type === 'asset') {
        const { assetId, currentXPct, currentYPct } = drag
        dragRef.current = null
        const el = assetElsRef.current[assetId]; if (el) el.style.cursor = ''
        if (canvasRef.current) canvasRef.current.style.cursor = ''
        if (currentXPct != null) {
          try { await onAssetDropRef.current?.(assetId, currentXPct, currentYPct) } catch (err) { console.error('Asset drop save failed:', err) }
        }
      }

      if (drag.type === 'resize') {
        const { zoneId, currentWidthPct, currentHeightPct } = drag
        dragRef.current = null
        if (canvasRef.current) canvasRef.current.style.cursor = ''
        if (currentWidthPct != null) {
          const updated = zonesRef.current.map(z => z.id !== zoneId ? z : {
            ...z, rects: z.rects.map((r, i) => i === 0 ? { ...r, widthPct: currentWidthPct, heightPct: currentHeightPct } : r)
          })
          try { await onZoneDropRef.current?.(updated) } catch (err) { console.error('Zone resize save failed:', err) }
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup',   handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [])

  function startZoneDrag(e, zone) {
    e.preventDefault(); e.stopPropagation()
    const canvas = canvasRef.current; if (!canvas) return
    const { width: cW, height: cH } = canvas.getBoundingClientRect()
    const bbox = zoneBBox(zone, cW, cH)
    const minXPct = Math.min(...zone.rects.map(r => r.xPct))
    const minYPct = Math.min(...zone.rects.map(r => r.yPct))
    const maxXPct = Math.max(...zone.rects.map(r => r.xPct + r.widthPct))
    const maxYPct = Math.max(...zone.rects.map(r => r.yPct + r.heightPct))
    dragRef.current = {
      type: 'zone', zoneId: zone.id, startMouseX: e.clientX, startMouseY: e.clientY,
      startBBoxX: bbox.x, startBBoxY: bbox.y, startBBoxW: bbox.w, startBBoxH: bbox.h,
      preRects: zone.rects.map(r => ({ ...r })),
      origLabelLeft: (minXPct + maxXPct) / 2, origLabelTop: (minYPct + maxYPct) / 2,
      currentDx: 0, currentDy: 0, hasSentSnapToast: false,
    }
    for (const r of zone.rects) { const el = zoneRectElsRef.current[r.id]; if (el) el.style.cursor = 'grabbing' }
    canvas.style.cursor = 'grabbing'
  }

  function startAssetDrag(e, asset) {
    e.preventDefault(); e.stopPropagation()
    if (!canvasRef.current) return
    dragRef.current = { type: 'asset', assetId: asset.id, startMouseX: e.clientX, startMouseY: e.clientY, startXPct: asset.xPct, startYPct: asset.yPct, currentXPct: null, currentYPct: null }
    const el = assetElsRef.current[asset.id]; if (el) el.style.cursor = 'grabbing'
    canvasRef.current.style.cursor = 'grabbing'
  }

  function startResizeDrag(e, zone) {
    e.preventDefault(); e.stopPropagation()
    const canvas = canvasRef.current; if (!canvas) return
    const r = zone.rects[0]; if (!r) return
    dragRef.current = {
      type: 'resize', zoneId: zone.id,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startXPct: r.xPct, startYPct: r.yPct,
      startWidthPct: r.widthPct, startHeightPct: r.heightPct,
      currentWidthPct: null, currentHeightPct: null,
    }
    canvas.style.cursor = 'nwse-resize'
  }

  function cancelZoneDrag() {
    if (!dragRef.current || dragRef.current.type !== 'zone') return
    const { zoneId, preRects, origLabelLeft, origLabelTop } = dragRef.current
    dragRef.current = null
    const zone = zonesRef.current.find(z => z.id === zoneId)
    if (zone) {
      for (const r of zone.rects) { const o = preRects.find(p => p.id === r.id); const el = zoneRectElsRef.current[r.id]; if (o && el) { el.style.left = `${o.xPct * 100}%`; el.style.top = `${o.yPct * 100}%`; el.style.boxShadow = ''; el.style.cursor = '' } }
      const lblEl = zoneLabelElsRef.current[zoneId]; if (lblEl) { lblEl.style.left = `${origLabelLeft * 100}%`; lblEl.style.top = `${origLabelTop * 100}%` }
    }
    snapLinesRef.current = []; setSnapLines([])
  }

  return { snapLines, startZoneDrag, startAssetDrag, startResizeDrag, cancelZoneDrag, assetElsRef, onZoneDropRef, onAssetDropRef }
}
