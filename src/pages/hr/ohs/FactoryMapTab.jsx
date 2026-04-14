import { useState, useRef, useEffect } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { serviceStatusColour, equipRiskColour, equipRiskLabel } from '../../../utils/ohs'

const ZONE_OPACITY = 0.75

const PRESET_COLOURS = [
  { label: 'Blue',   value: '#dbeafe' },
  { label: 'Yellow', value: '#fef3c7' },
  { label: 'Green',  value: '#dcfce7' },
  { label: 'Purple', value: '#ede9fe' },
  { label: 'Pink',   value: '#fce7f3' },
  { label: 'Grey',   value: '#f3f4f6' },
]
const CANVAS_H   = 560
const SNAP_THRESH = 16

function saveZones(updated, apiFetchFn, refetch) {
  return apiFetchFn('/ohs-zones', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zones: updated }),
  }).then(refetch).catch(err => console.error('Save zones failed:', err))
}

function computeSnap(moving, others, cW, cH) {
  const { x, y, width: w, height: h } = moving
  let sx = x, sy = y, bdx = SNAP_THRESH, bdy = SNAP_THRESH, xlv = null, ylv = null
  const xc = [0, cW, ...others.flatMap(z => [z.x, z.x + z.width])]
  const yc = [0, cH, ...others.flatMap(z => [z.y, z.y + z.height])]
  for (const cv of xc) {
    let d = Math.abs(x - cv);         if (d < bdx) { bdx = d; sx = cv;     xlv = cv }
        d = Math.abs(x + w - cv);     if (d < bdx) { bdx = d; sx = cv - w; xlv = cv }
  }
  for (const cv of yc) {
    let d = Math.abs(y - cv);         if (d < bdy) { bdy = d; sy = cv;     ylv = cv }
        d = Math.abs(y + h - cv);     if (d < bdy) { bdy = d; sy = cv - h; ylv = cv }
  }
  const lines = []
  if (xlv !== null) lines.push({ axis: 'x', value: xlv })
  if (ylv !== null) lines.push({ axis: 'y', value: ylv })
  return { x: sx, y: sy, lines }
}

function zonesOverlap(a, others) {
  return others.some(b =>
    a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 &&
    a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1
  )
}

export default function FactoryMapTab() {
  const { data: zonesData, refetch: refetchZones } = useGet('/ohs-zones')
  const { data: equipRaw } = useGet('/ohs-equipment')
  const { data: ohsRaw }   = useGet('/ohs')

  const zones     = Array.isArray(zonesData?.zones) ? zonesData.zones : []
  const equipment = Array.isArray(equipRaw) ? equipRaw : []
  const incidents = Array.isArray(ohsRaw)   ? ohsRaw   : []

  const [editMode,   setEditMode]   = useState(false)
  const [snapLines,  setSnapLines]  = useState([])
  const [toast,      setToast]      = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [addForm,    setAddForm]    = useState({ name: '', colour: '#dbeafe' })
  const [addSaving,  setAddSaving]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [tooltip,    setTooltip]    = useState(null)
  const [incPop,     setIncPop]     = useState(null)

  const canvasRef    = useRef(null)
  const zoneElsRef   = useRef({})
  const dragRef      = useRef(null)
  const resizeRef    = useRef(null)
  const zonesRef     = useRef(zones)
  const refetchRef   = useRef(refetchZones)
  const editModeRef  = useRef(false)
  const snapLinesRef = useRef([])
  const overlapRef   = useRef(false)

  useEffect(() => { zonesRef.current     = zones        }, [zones])
  useEffect(() => { refetchRef.current   = refetchZones }, [refetchZones])
  useEffect(() => { editModeRef.current  = editMode     }, [editMode])

  useEffect(() => {
    const showToast = (msg, t = 'info') => { setToast({ msg, type: t }); setTimeout(() => setToast(null), 2200) }
    const sameLines = (a, b) => a.length === b.length && a.every((l, i) => l.axis === b[i].axis && l.value === b[i].value)

    function handleMouseMove(e) {
      if (!editModeRef.current) return

      if (dragRef.current) {
        const drag = dragRef.current
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const zone = zonesRef.current.find(z => z.id === drag.zoneId)
        if (!zone) return

        const rawX = drag.startZoneX + (e.clientX - drag.startMouseX)
        const rawY = drag.startZoneY + (e.clientY - drag.startMouseY)
        const cx = Math.max(0, Math.min(rawX, rect.width  - zone.width))
        const cy = Math.max(0, Math.min(rawY, rect.height - zone.height))

        const others = zonesRef.current.filter(z => z.id !== drag.zoneId)
        const snap = computeSnap({ x: cx, y: cy, width: zone.width, height: zone.height }, others, rect.width, rect.height)
        const fx = Math.max(0, Math.min(snap.x, rect.width  - zone.width))
        const fy = Math.max(0, Math.min(snap.y, rect.height - zone.height))
        drag.currentX = fx; drag.currentY = fy

        if (snap.lines.length > 0 && !drag.hasSentSnapToast) { drag.hasSentSnapToast = true; showToast('Snapped', 'info') }
        if (!sameLines(snapLinesRef.current, snap.lines)) { snapLinesRef.current = snap.lines; setSnapLines([...snap.lines]) }

        const ov = zonesOverlap({ x: fx, y: fy, width: zone.width, height: zone.height }, others)
        overlapRef.current = ov
        const el = zoneElsRef.current[drag.zoneId]
        if (el) {
          el.style.left = fx + 'px'; el.style.top = fy + 'px'
          el.style.boxShadow = ov
            ? '0 4px 16px rgba(108,99,255,0.18), inset 0 0 0 999px rgba(226,75,74,0.22)'
            : '0 4px 16px rgba(108,99,255,0.18)'
        }
      }

      if (resizeRef.current) {
        const r = resizeRef.current
        r.currentW = Math.max(80, r.origW + (e.clientX - r.startMx))
        r.currentH = Math.max(50, r.origH + (e.clientY - r.startMy))
        const el = zoneElsRef.current[r.zoneId]
        if (el) { el.style.width = r.currentW + 'px'; el.style.height = r.currentH + 'px' }
      }
    }

    async function handleMouseUp() {
      try {
        if (dragRef.current) {
          const { zoneId, currentX, currentY, startZoneX: ox, startZoneY: oy } = dragRef.current
          const ov = overlapRef.current
          dragRef.current = null; overlapRef.current = false
          snapLinesRef.current = []; setSnapLines([])
          const el = zoneElsRef.current[zoneId]
          if (el) { el.style.border = ''; el.style.boxShadow = ''; el.style.cursor = '' }
          if (canvasRef.current) canvasRef.current.style.cursor = ''
          if (ov) {
            if (el) { el.style.left = ox + 'px'; el.style.top = oy + 'px' }
            showToast('Cannot place — zones overlapping', 'error'); return
          }
          const zone = zonesRef.current.find(z => z.id === zoneId)
          if (!zone) return
          const cvs = canvasRef.current ? canvasRef.current.getBoundingClientRect() : { width: 900, height: 560 }
          const fx = Math.round(Math.max(0, Math.min(currentX, cvs.width  - zone.width)))
          const fy = Math.round(Math.max(0, Math.min(currentY, cvs.height - zone.height)))
          await saveZones(zonesRef.current.map(z => z.id === zoneId ? { ...z, x: fx, y: fy } : z), apiFetch, refetchRef.current)
        }
        if (resizeRef.current) {
          const { zoneId, currentW, currentH } = resizeRef.current; resizeRef.current = null
          await saveZones(zonesRef.current.map(z => z.id === zoneId ? { ...z, width: Math.round(currentW), height: Math.round(currentH) } : z), apiFetch, refetchRef.current)
        }
      } catch (err) { console.error('Save on drop failed:', err) }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup',   handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [])

  // Cancel active drag when edit mode is toggled off
  useEffect(() => {
    if (!editMode && dragRef.current) {
      const { zoneId, startZoneX: ox, startZoneY: oy } = dragRef.current
      dragRef.current = null
      const el = zoneElsRef.current[zoneId]
      if (el) { el.style.left = ox + 'px'; el.style.top = oy + 'px'; el.style.border = ''; el.style.boxShadow = ''; el.style.cursor = '' }
      snapLinesRef.current = []; setSnapLines([])
    }
    if (!editMode) resizeRef.current = null
  }, [editMode])

  async function handleAddZone() {
    if (!addForm.name.trim()) return
    setAddSaving(true)
    try {
      const z = { id: `Z${Date.now()}`, name: addForm.name.trim(), colour: addForm.colour, x: 20, y: 20, width: 140, height: 90 }
      await saveZones([...zones, z], apiFetch, refetchZones)
      setShowAdd(false); setAddForm({ name: '', colour: '#dbeafe' })
    } finally { setAddSaving(false) }
  }

  async function handleDeleteZone(id) {
    await saveZones(zones.filter(z => z.id !== id), apiFetch, refetchZones)
    setConfirmDel(null)
  }

  const unassigned = equipment.filter(e => !e.zoneId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Delete Zone</div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 18 }}>Delete <strong>{confirmDel.name}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e4e6ea', background: '#f0f2f5', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={() => handleDeleteZone(confirmDel.id)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setShowAdd(v => !v)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#6c63ff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ Add Zone'}
        </button>
        <button onClick={() => setEditMode(m => !m)}
          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: editMode ? '1px solid #185FA5' : '1px solid #ccc', background: editMode ? '#E6F1FB' : 'transparent', color: editMode ? '#185FA5' : 'inherit', fontWeight: editMode ? 500 : 400 }}>
          {editMode ? '✎ Edit mode ON' : 'Edit layout'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #e4e6ea', outline: 'none', fontFamily: 'inherit', width: 180 }}
            placeholder="Zone name" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#888' }}>Colour:</span>
            {PRESET_COLOURS.map(c => (
              <button key={c.value} title={c.label} onClick={() => setAddForm(p => ({ ...p, colour: c.value }))}
                style={{ width: 24, height: 24, borderRadius: 5, background: c.value, border: addForm.colour === c.value ? '2.5px solid #6c63ff' : '1.5px solid #cbd5e1', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
          <button onClick={handleAddZone} disabled={addSaving || !addForm.name.trim()}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: addSaving || !addForm.name.trim() ? '#b0b5cc' : '#6c63ff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {addSaving ? 'Saving…' : 'Add'}
          </button>
        </div>
      )}

      {editMode && (
        <div style={{ fontSize: 11, padding: '4px 12px', background: '#E6F1FB', color: '#185FA5', borderBottom: '1px solid #B5D4F4' }}>
          Edit mode active — drag zones to rearrange. Edges snap together. Overlaps are blocked.
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        <div ref={canvasRef} onClick={() => { setTooltip(null); setIncPop(null) }}
          style={{ flex: '1 1 auto', height: CANVAS_H, position: 'relative', border: '1px solid #e4e6ea', borderRadius: 8, background: '#f9fafb', overflow: 'hidden', userSelect: 'none' }}>

          {toast && (
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', pointerEvents: 'none', background: toast.type === 'error' ? 'rgba(163,45,45,0.9)' : 'rgba(15,110,86,0.9)' }}>
              {toast.msg}
            </div>
          )}

          {/* Snap line overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }}>
            {snapLines.map((line, i) =>
              line.axis === 'x'
                ? <div key={i} style={{ position: 'absolute', left: line.value, top: 0, width: 1, height: '100%', background: 'rgba(24,95,165,0.6)', borderLeft: '1px dashed rgba(24,95,165,0.8)' }} />
                : <div key={i} style={{ position: 'absolute', top: line.value, left: 0, height: 1, width: '100%', background: 'rgba(24,95,165,0.6)', borderTop: '1px dashed rgba(24,95,165,0.8)' }} />
            )}
          </div>

          {zones.map(zone => {
            const zIncs  = incidents.filter(inc => inc.zoneId === zone.id)
            const zEquip = equipment.filter(eq  => eq.zoneId  === zone.id)
            return (
              <div key={zone.id}
                ref={el => { if (el) zoneElsRef.current[zone.id] = el; else delete zoneElsRef.current[zone.id] }}
                onMouseDown={editMode ? e => {
                  e.preventDefault(); e.stopPropagation()
                  e.currentTarget.style.border    = '2.5px solid #6c63ff'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,99,255,0.18)'
                  e.currentTarget.style.cursor    = 'grabbing'
                  if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
                  dragRef.current = { zoneId: zone.id, startMouseX: e.clientX, startMouseY: e.clientY, startZoneX: zone.x, startZoneY: zone.y, currentX: zone.x, currentY: zone.y, hasSentSnapToast: false }
                } : undefined}
                style={{ position: 'absolute', left: zone.x, top: zone.y, width: zone.width, height: zone.height, background: zone.colour, border: '1.5px solid #cbd5e1', borderRadius: 6, cursor: editMode ? 'grab' : 'default', boxSizing: 'border-box', opacity: ZONE_OPACITY }}
              >
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 11, fontWeight: 600, color: '#1e293b', textAlign: 'center', pointerEvents: 'none', maxWidth: '85%', lineHeight: 1.3 }}>
                  {zone.name}
                </div>

                <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setConfirmDel(zone) }}
                  style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
                  title="Delete zone">✕</button>

                {zIncs.length > 0 && (
                  <div onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setIncPop(incPop?.zoneId === zone.id ? null : { zoneId: zone.id }) }}
                    style={{ position: 'absolute', top: 3, left: 3, background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', cursor: 'pointer', fontWeight: 700 }}
                    title={`${zIncs.length} incident(s)`}>⚠️ {zIncs.length}</div>
                )}

                <div style={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {zEquip.slice(0, 10).map(eq => {
                    const svcCol  = serviceStatusColour(eq.nextServiceDate)
                    const riskCol = equipRiskColour(eq.riskLevel)
                    return (
                      <div key={eq.id} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setTooltip(tooltip?.id === eq.id ? null : eq) }} title={eq.name}
                        style={{ width: 16, height: 16, borderRadius: '50%', background: svcCol.bg, border: `2px solid ${riskCol.text}`, cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔧</div>
                    )
                  })}
                </div>

                {editMode && (
                  <div onMouseDown={e => { e.stopPropagation(); e.preventDefault(); resizeRef.current = { zoneId: zone.id, startMx: e.clientX, startMy: e.clientY, origW: zone.width, origH: zone.height, currentW: zone.width, currentH: zone.height } }}
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, cursor: 'se-resize', background: 'rgba(0,0,0,0.2)', borderRadius: '2px 0 4px 0' }} />
                )}
              </div>
            )
          })}

          {incPop && (() => {
            const zone  = zones.find(z => z.id === incPop.zoneId)
            const zIncs = incidents.filter(inc => inc.zoneId === incPop.zoneId)
            if (!zone) return null
            const px = Math.min(zone.x + zone.width + 4, (zonesData?.canvasWidth || 900) - 220)
            const py = Math.min(zone.y, CANVAS_H - 20 - zIncs.length * 26 - 60)
            return (
              <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
                style={{ position: 'absolute', left: px, top: py, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 8, padding: '10px 12px', zIndex: 10, minWidth: 200, maxWidth: 250, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: '#991b1b' }}>Incidents — {zone.name}</div>
                {zIncs.map(inc => (
                  <div key={inc.id} style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f0f2f5', color: '#555' }}>{inc.title}</div>
                ))}
                <button onClick={() => setIncPop(null)} style={{ marginTop: 8, fontSize: 11, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Close</button>
              </div>
            )
          })()}
        </div>

        <div style={{ flex: '0 0 210px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tooltip && (
            <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 10, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#1e1f3b' }}>🔧 {tooltip.name}</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Zone: {zones.find(z => z.id === tooltip.zoneId)?.name || '—'}</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Risk: {equipRiskLabel(tooltip.riskLevel)}</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>Category: {tooltip.category || '—'}</div>
              <div style={{ fontSize: 12, color: serviceStatusColour(tooltip.nextServiceDate).text }}>Next service: {tooltip.nextServiceDate || 'Not set'}</div>
              <button onClick={() => setTooltip(null)} style={{ marginTop: 8, fontSize: 11, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Close</button>
            </div>
          )}
          <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Unassigned ({unassigned.length})</div>
            {unassigned.length === 0 ? (
              <div style={{ fontSize: 12, color: '#b0b5cc', textAlign: 'center', padding: '12px 0' }}>All equipment assigned</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 300, overflowY: 'auto' }}>
                  {unassigned.map(eq => (
                    <div key={eq.id} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, background: '#f9fafb', border: '1px solid #e4e6ea' }}>
                      <div style={{ fontWeight: 600, color: '#1e1f3b' }}>🔧 {eq.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{eq.category}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Assign via Equipment tab → edit item</div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
