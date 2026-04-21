// Zoom-column display helpers extracted from GanttModal.jsx.
// Pure functions — no React imports.

// Group consecutive columns that share the same label into one header cell.
export function groupCols(cols) {
  const g = []
  for (const c of cols) {
    if (g.length && g[g.length-1].label === c.label) g[g.length-1].w += c.widthPx
    else g.push({ label: c.label, w: c.widthPx })
  }
  return g
}

// Pixels per day for the current zoom level (used by drag handlers).
export function ppd(zoomCols) {
  const c = zoomCols[0]
  return c ? (c.widthPx / Math.max(1, Math.round((c.endDate - c.startDate) / 86400000) + 1)) : 28
}
