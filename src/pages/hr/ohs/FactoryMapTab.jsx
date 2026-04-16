import { useState, useRef, useEffect } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { serviceStatusColour, equipRiskColour, equipRiskLabel } from '../../../utils/ohs'
import { saveZones, zoneBBox, migrateZonesToPct, migrateZonesToRects, uploadFloorPlan } from './factoryMapUtils'
import { useMapDrag } from './useMapDrag'
import { AssetPin, AssetPinPopup } from './factoryMapPins'
import AddAssetModal from './AddAssetModal'

const ZONE_OPACITY   = 0.75
const PRESET_COLOURS = [
  { label: 'Blue',   value: '#dbeafe' },
  { label: 'Yellow', value: '#fef3c7' },
  { label: 'Green',  value: '#dcfce7' },
  { label: 'Purple', value: '#ede9fe' },
  { label: 'Pink',   value: '#fce7f3' },
  { label: 'Grey',   value: '#f3f4f6' },
]

export default function FactoryMapTab() {
  const { data: rawZonesData,  refetch: refetchZones  } = useGet('/ohs-zones')
  const { data: rawAssetsData, refetch: refetchAssets  } = useGet('/ohs-map-assets')
  const { data: equipRaw } = useGet('/ohs-equipment')
  const { data: ohsRaw }   = useGet('/ohs')
  const { data: toolsRaw } = useGet('/tools')
  const equipment = Array.isArray(equipRaw) ? equipRaw : []
  const incidents = Array.isArray(ohsRaw)   ? ohsRaw   : []
  const tools     = Array.isArray(toolsRaw) ? toolsRaw : []

  const [zones,           setZones]           = useState([])
  const [assets,          setAssets]          = useState([])
  const [editMode,        setEditMode]        = useState(false)
  const [toast,           setToast]           = useState(null)
  const [showAdd,         setShowAdd]         = useState(false)
  const [addForm,         setAddForm]         = useState({ name: '', colour: '#dbeafe' })
  const [addSaving,       setAddSaving]       = useState(false)
  const [confirmDel,      setConfirmDel]      = useState(null)
  const [tooltip,         setTooltip]         = useState(null)
  const [incPop,          setIncPop]          = useState(null)
  const [floorPlan,       setFloorPlan]       = useState(null)
  const [fpLoading,       setFpLoading]       = useState(false)
  const [addAssetMode,    setAddAssetMode]    = useState(false)
  const [addAssetPos,     setAddAssetPos]     = useState(null)
  const [selectedAsset,   setSelectedAsset]   = useState(null)
  const [confirmDelAsset, setConfirmDelAsset] = useState(null)
  const [selectedZone,    setSelectedZone]    = useState(null)

  const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2200) }

  const canvasRef       = useRef(null)
  const zoneRectElsRef  = useRef({})
  const zoneLabelElsRef = useRef({})
  const zonesRef        = useRef([])
  const refetchRef      = useRef(refetchZones)
  const editModeRef     = useRef(false)
  const showToastRef    = useRef(null)
  showToastRef.current  = showToast

  useEffect(() => { zonesRef.current    = zones        }, [zones])
  useEffect(() => { refetchRef.current  = refetchZones }, [refetchZones])
  useEffect(() => { editModeRef.current = editMode     }, [editMode])

  const { snapLines, startZoneDrag, startAssetDrag, startResizeDrag, cancelZoneDrag, assetElsRef, onZoneDropRef, onAssetDropRef } = useMapDrag(canvasRef, zonesRef, zoneRectElsRef, zoneLabelElsRef, editModeRef, showToastRef)

  onZoneDropRef.current = async (updated) => {
    setZones(updated)
    await saveZones(updated, refetchRef.current)
  }
  onAssetDropRef.current = async (id, xPct, yPct) => {
    try {
      await apiFetch(`/ohs-map-assets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xPct, yPct }) })
      setAssets(a => a.map(x => x.id === id ? { ...x, xPct, yPct } : x))
    } catch (err) { console.error('Asset move failed:', err) }
  }

  useEffect(() => { if (!editMode) { cancelZoneDrag(); setAddAssetMode(false) } }, [editMode])

  // Migration: 3-step zone schema upgrade
  useEffect(() => {
    if (!rawZonesData?.zones) return
    let arr = Array.isArray(rawZonesData.zones) ? rawZonesData.zones : []
    let changed = false
    if (arr.some(z => z.x !== undefined && z.xPct === undefined)) {
      const { width: cW, height: cH } = canvasRef.current?.getBoundingClientRect() || {}
      if (!cW || !cH) return
      arr = migrateZonesToPct(arr, cW, cH); changed = true
    }
    if (arr.some(z => z.xPct !== undefined && !z.rects)) { arr = migrateZonesToRects(arr); changed = true }
    setZones(arr)
    if (changed) saveZones(arr, refetchRef.current)
  }, [rawZonesData])

  useEffect(() => {
    if (!rawAssetsData?.assets) return
    setAssets(Array.isArray(rawAssetsData.assets) ? rawAssetsData.assets : [])
  }, [rawAssetsData])

  useEffect(() => {
    apiFetch('/settings').then(s => {
      if (s?.factoryMapBg) {
        const url = `/uploads/${s.factoryMapBg}`
        const img = new Image()
        img.onload = () => setFloorPlan({ url, aspect: img.naturalWidth / img.naturalHeight })
        img.src = url
      }
    })
  }, [])

  async function handleAddZone() {
    if (!addForm.name.trim()) return
    setAddSaving(true)
    try {
      const { width: cW, height: cH } = canvasRef.current?.getBoundingClientRect() || { width: 900, height: 506 }
      const id = `Z${Date.now()}`
      const z = { id, name: addForm.name.trim(), colour: addForm.colour, rects: [{ id: id + '-r0', xPct: 20 / cW, yPct: 20 / cH, widthPct: 140 / cW, heightPct: 90 / cH }] }
      await saveZones([...zones, z], refetchRef.current)
      setShowAdd(false); setAddForm({ name: '', colour: '#dbeafe' })
    } finally { setAddSaving(false) }
  }

  async function handleDeleteZone(id) { await saveZones(zones.filter(z => z.id !== id), refetchRef.current); setConfirmDel(null) }

  function handleFloorPlanUpload(e) {
    const file = e.target.files[0]; if (!file) return
    uploadFloorPlan(file, setFloorPlan, msg => showToast(msg, 'error'), setFpLoading)
  }

  async function handleRemoveFloorPlan() {
    await apiFetch('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factoryMapBg: '' }) })
    setFloorPlan(null)
  }

  async function handleAddAsset(newAsset) {
    try {
      const updated = [...assets, newAsset]
      await apiFetch('/ohs-map-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assets: updated }) })
      setAssets(updated); setAddAssetPos(null)
    } catch (err) { console.error('Add asset failed:', err) }
  }

  async function handleDeleteAsset(asset) {
    try {
      await apiFetch(`/ohs-map-assets/${asset.id}`, { method: 'DELETE' })
      setAssets(a => a.filter(x => x.id !== asset.id)); setConfirmDelAsset(null)
    } catch (err) { console.error('Delete asset failed:', err) }
  }

  const unassigned = equipment.filter(e => !e.zoneId)

  const selectedZoneTools = selectedZone ? tools.filter(t => t.dept === selectedZone.name) : []

  // Compute incPop data before JSX (no IIFE in JSX)
  let incPopZone = null, incPopIncs = [], incPopPx = 0, incPopPy = 0
  if (incPop) {
    incPopZone = zones.find(z => z.id === incPop.zoneId)
    if (incPopZone) {
      incPopIncs = incidents.filter(inc => inc.zoneId === incPop.zoneId)
      const { width: cW = 900, height: cH = 506 } = canvasRef.current?.getBoundingClientRect() ?? {}
      const bbox = zoneBBox(incPopZone, cW, cH)
      incPopPx = Math.min(bbox.x + bbox.w + 4, cW - 220)
      incPopPy = Math.min(bbox.y, cH - 20 - incPopIncs.length * 26 - 60)
    }
  }

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
      {confirmDelAsset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Delete Asset</div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 18 }}>Delete <strong>{confirmDelAsset.label}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelAsset(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e4e6ea', background: '#f0f2f5', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={() => handleDeleteAsset(confirmDelAsset)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setShowAdd(v => !v)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#6c63ff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{showAdd ? 'Cancel' : '+ Add Zone'}</button>
        <button onClick={() => setEditMode(m => !m)} style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: editMode ? '1px solid #185FA5' : '1px solid #ccc', background: editMode ? '#E6F1FB' : 'transparent', color: editMode ? '#185FA5' : 'inherit', fontWeight: editMode ? 500 : 400 }}>{editMode ? '✎ Edit mode ON' : 'Edit layout'}</button>
        {editMode && (
          <>
            {addAssetMode
              ? <button onClick={() => setAddAssetMode(false)} style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #d97706', background: '#fef3c7', color: '#92400e', cursor: 'pointer' }}>Cancel pin placement</button>
              : <button onClick={() => setAddAssetMode(true)}  style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}>📍 Add Asset</button>
            }
            <label style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: '1px solid #ccc', background: 'transparent' }}>
              {fpLoading ? 'Uploading…' : floorPlan ? 'Replace floor plan' : 'Upload floor plan'}
              <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={handleFloorPlanUpload} />
            </label>
            {floorPlan && <button onClick={handleRemoveFloorPlan} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}>Remove floor plan</button>}
          </>
        )}
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

      {editMode && !addAssetMode && <div style={{ fontSize: 11, padding: '4px 12px', background: '#E6F1FB', color: '#185FA5', borderBottom: '1px solid #B5D4F4' }}>Edit mode — drag zones to rearrange, edges snap, overlaps blocked. Click 📍 Add Asset to place pins.</div>}
      {addAssetMode && <div style={{ fontSize: 11, padding: '4px 12px', background: '#FFF9E6', color: '#92400E', borderBottom: '1px solid #FCD34D' }}>Click anywhere on the map to place the asset pin.</div>}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div ref={canvasRef}
          style={{ flex: '1 1 auto', position: 'relative', aspectRatio: floorPlan ? String(floorPlan.aspect) : '16/9', backgroundImage: floorPlan ? `url(${floorPlan.url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#f9fafb', overflow: 'hidden', borderRadius: 8, border: '0.5px solid #e4e6ea', userSelect: 'none', cursor: addAssetMode ? 'crosshair' : undefined }}
          onClick={e => {
            if (addAssetMode) {
              const rect = canvasRef.current.getBoundingClientRect()
              setAddAssetPos({ xPct: (e.clientX - rect.left) / rect.width, yPct: (e.clientY - rect.top) / rect.height })
              setAddAssetMode(false); return
            }
            setTooltip(null); setIncPop(null); setSelectedAsset(null)
          }}>
          {toast && <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', pointerEvents: 'none', background: toast.type === 'error' ? 'rgba(163,45,45,0.9)' : 'rgba(15,110,86,0.9)' }}>{toast.msg}</div>}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }}>
            {snapLines.map((line, i) =>
              line.axis === 'x'
                ? <div key={i} style={{ position: 'absolute', left: line.value, top: 0, width: 1, height: '100%', background: 'rgba(24,95,165,0.6)', borderLeft: '1px dashed rgba(24,95,165,0.8)' }} />
                : <div key={i} style={{ position: 'absolute', top: line.value, left: 0, height: 1, width: '100%', background: 'rgba(24,95,165,0.6)', borderTop: '1px dashed rgba(24,95,165,0.8)' }} />
            )}
          </div>

          {zones.map(zone => {
            const zIncs      = incidents.filter(inc => inc.zoneId === zone.id)
            const zEquip     = equipment.filter(eq  => eq.zoneId  === zone.id)
            const zoneTools  = tools.filter(t => t.dept === zone.name)
            const minXPct = Math.min(...zone.rects.map(r => r.xPct))
            const minYPct = Math.min(...zone.rects.map(r => r.yPct))
            const maxXPct = Math.max(...zone.rects.map(r => r.xPct + r.widthPct))
            const maxYPct = Math.max(...zone.rects.map(r => r.yPct + r.heightPct))
            return (
              <div key={zone.id}>
                {zone.rects.map((r, ri) => (
                  <div key={r.id}
                    ref={el => { if (el) zoneRectElsRef.current[r.id] = el; else delete zoneRectElsRef.current[r.id] }}
                    onMouseDown={editMode && !addAssetMode ? e => startZoneDrag(e, zone) : undefined}
                    style={{ position: 'absolute', left: `${r.xPct * 100}%`, top: `${r.yPct * 100}%`, width: `${r.widthPct * 100}%`, height: `${r.heightPct * 100}%`, background: zone.colour, opacity: ZONE_OPACITY, border: '1.5px solid #cbd5e1', borderRadius: 6, cursor: editMode && !addAssetMode ? 'grab' : 'default', boxSizing: 'border-box' }}>
                    {ri === 0 && (
                      <>
                        {editMode && <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setConfirmDel(zone) }}
                          style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
                          title="Delete zone">✕</button>}
                        {zIncs.length > 0 && (
                          <div onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setIncPop(incPop?.zoneId === zone.id ? null : { zoneId: zone.id }) }}
                            style={{ position: 'absolute', top: 3, left: 3, background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', cursor: 'pointer', fontWeight: 700 }}>⚠️ {zIncs.length}</div>
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
                        {editMode && !addAssetMode && (
                          <div onMouseDown={e => { e.stopPropagation(); startResizeDrag(e, zone) }}
                            style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#9ca3af', cursor: 'nwse-resize', borderTopLeftRadius: 3, zIndex: 7 }} />
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div ref={el => { if (el) zoneLabelElsRef.current[zone.id] = el; else delete zoneLabelElsRef.current[zone.id] }}
                  style={{ position: 'absolute', left: `${(minXPct + maxXPct) / 2 * 100}%`, top: `${(minYPct + maxYPct) / 2 * 100}%`, transform: 'translate(-50%,-50%)', pointerEvents: 'none', fontSize: 12, fontWeight: 600, color: '#1e293b', opacity: 1, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <span>{zone.name}</span>
                  {zoneTools.length > 0 && (
                    <span onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSelectedZone(selectedZone?.id === zone.id ? null : zone) }}
                      style={{ pointerEvents: 'auto', background: '#1e293b', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', cursor: 'pointer', fontWeight: 700, lineHeight: 1.4, zIndex: 9 }}>
                      {zoneTools.length}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {assets.map(asset => (
            <AssetPin key={asset.id} asset={asset} editMode={editMode}
              containerRef={el => { if (el) assetElsRef.current[asset.id] = el; else delete assetElsRef.current[asset.id] }}
              onDragStart={startAssetDrag}
              onSelect={setSelectedAsset}
              onDelete={setConfirmDelAsset}
            />
          ))}
          {selectedAsset && !editMode && <AssetPinPopup asset={selectedAsset} zones={zones} onClose={() => setSelectedAsset(null)} />}

          {incPop && incPopZone && (
            <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', left: incPopPx, top: incPopPy, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 8, padding: '10px 12px', zIndex: 10, minWidth: 200, maxWidth: 250, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: '#991b1b' }}>Incidents — {incPopZone.name}</div>
              {incPopIncs.map(inc => (
                <div key={inc.id} style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f0f2f5', color: '#555' }}>{inc.title}</div>
              ))}
              <button onClick={() => setIncPop(null)} style={{ marginTop: 8, fontSize: 11, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Close</button>
            </div>
          )}
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
          {selectedZone && (
            <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedZone.name} tools ({selectedZoneTools.length})</div>
                <button onClick={() => setSelectedZone(null)} style={{ fontSize: 11, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
              {selectedZoneTools.length === 0 ? (
                <div style={{ fontSize: 12, color: '#b0b5cc', textAlign: 'center', padding: '12px 0' }}>No tools in this zone</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
                  {selectedZoneTools.map(t => (
                    <div key={t.id} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, background: '#f9fafb', border: '1px solid #e4e6ea' }}>
                      <div style={{ fontWeight: 600, color: '#1e1f3b' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>#{t.id} · {t.status} · {t.dept}</div>
                    </div>
                  ))}
                </div>
              )}
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

      {addAssetPos && (
        <AddAssetModal xPct={addAssetPos.xPct} yPct={addAssetPos.yPct} zones={zones}
          onSave={handleAddAsset} onCancel={() => setAddAssetPos(null)} />
      )}
    </div>
  )
}
