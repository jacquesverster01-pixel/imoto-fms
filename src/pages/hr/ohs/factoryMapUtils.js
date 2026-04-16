// factoryMapUtils.js — pure helpers, no JSX, no hooks
import { apiFetch } from '../../../hooks/useApi'

// ── Persistence ──────────────────────────────────────────────────────────────
export function saveZones(updated, refetch) {
  return apiFetch('/ohs-zones', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zones: updated }),
  }).then(() => refetch?.()).catch(err => console.error('saveZones failed:', err))
}

// ── Coordinate helpers ────────────────────────────────────────────────────────
// pixel rect from pct + canvas dims → { x, y, w, h }
export function pctToRect(r, cW, cH) {
  return { x: r.xPct * cW, y: r.yPct * cH, w: r.widthPct * cW, h: r.heightPct * cH }
}

// pct back from pixel rect { x, y, w, h }
export function rectToPct(r, cW, cH) {
  return { xPct: r.x / cW, yPct: r.y / cH, widthPct: r.w / cW, heightPct: r.h / cH }
}

// bounding box across all rects (pixel coords) → { x, y, w, h }
export function zoneBBox(zone, cW, cH) {
  const rects = zone.rects.map(r => pctToRect(r, cW, cH))
  const x  = Math.min(...rects.map(r => r.x))
  const y  = Math.min(...rects.map(r => r.y))
  const x2 = Math.max(...rects.map(r => r.x + r.w))
  const y2 = Math.max(...rects.map(r => r.y + r.h))
  return { x, y, w: x2 - x, h: y2 - y }
}

// two rects overlap? (pixel coords, { x, y, w, h })
export function rectsOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
}

// does any rect of zone overlap any rect of any other zone?
export function zoneOverlapsOthers(zone, allZones, cW, cH) {
  const mine = zone.rects.map(r => pctToRect(r, cW, cH))
  for (const other of allZones) {
    if (other.id === zone.id) continue
    for (const or of other.rects) {
      const ob = pctToRect(or, cW, cH)
      for (const mr of mine) { if (rectsOverlap(mr, ob)) return true }
    }
  }
  return false
}

// unique id
export function uid() { return Math.random().toString(36).slice(2, 9) }

// ── Snap ──────────────────────────────────────────────────────────────────────
// moving + others use { x, y, w, h }
export function computeSnap(moving, others, cW, cH) {
  const { x, y, w, h } = moving
  let sx = x, sy = y, bdx = 16, bdy = 16, xlv = null, ylv = null
  const xc = [0, cW, ...others.flatMap(z => [z.x, z.x + z.w])]
  const yc = [0, cH, ...others.flatMap(z => [z.y, z.y + z.h])]
  for (const cv of xc) {
    let d = Math.abs(x - cv);     if (d < bdx) { bdx = d; sx = cv;     xlv = cv }
        d = Math.abs(x + w - cv); if (d < bdx) { bdx = d; sx = cv - w; xlv = cv }
  }
  for (const cv of yc) {
    let d = Math.abs(y - cv);     if (d < bdy) { bdy = d; sy = cv;     ylv = cv }
        d = Math.abs(y + h - cv); if (d < bdy) { bdy = d; sy = cv - h; ylv = cv }
  }
  const lines = []
  if (xlv !== null) lines.push({ axis: 'x', value: xlv })
  if (ylv !== null) lines.push({ axis: 'y', value: ylv })
  return { x: sx, y: sy, lines }
}

// ── Migration ─────────────────────────────────────────────────────────────────
// Step 1: flat px → pct (idempotent — skips zones that already have xPct)
export function migrateZonesToPct(zones, canvasW, canvasH) {
  return zones.map(z => {
    if (z.xPct !== undefined) return z
    return {
      id: z.id, name: z.name, colour: z.colour,
      xPct: z.x / canvasW, yPct: z.y / canvasH,
      widthPct: z.width / canvasW, heightPct: z.height / canvasH,
    }
  })
}

// Step 2: flat pct → rects array (idempotent — skips zones that already have rects)
export function migrateZonesToRects(zones) {
  return zones.map(z => {
    if (z.rects) return z
    return {
      id: z.id, name: z.name, colour: z.colour,
      rects: [{ id: z.id + '-r0', xPct: z.xPct, yPct: z.yPct, widthPct: z.widthPct, heightPct: z.heightPct }],
    }
  })
}

// ── Floor plan upload ─────────────────────────────────────────────────────────
export async function uploadFloorPlan(file, onSuccess, onError, onLoading) {
  onLoading(true)
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('context', 'factory-map')
    fd.append('contextId', 'floor-plan')
    const res  = await fetch('/api/ohs-files/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.filename) throw new Error('No filename returned')
    await apiFetch('/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factoryMapBg: data.filename }),
    })
    const url = `/uploads/${data.filename}`
    const img = new Image()
    img.onload  = () => { onLoading(false); onSuccess({ url, aspect: img.naturalWidth / img.naturalHeight }) }
    img.onerror = () => { onLoading(false); onError('Floor plan image failed to load') }
    img.src = url
  } catch {
    onLoading(false)
    onError('Floor plan upload failed')
  }
}
