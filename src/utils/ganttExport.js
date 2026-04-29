// Gantt print/export utilities extracted from GanttModal.jsx.

// Injects the print stylesheet and returns a cleanup function.
// Designed to be used directly as a useEffect callback:
//   useEffect(() => injectGanttPrintStyle(), [])
export function injectGanttPrintStyle() {
  const style = document.createElement('style'); style.id = 'gantt-print-style'
  // Use visibility:hidden (not display:none) so that nested .gantt-print-root can override with
  // visibility:visible. display:none on an ancestor cannot be overridden by descendants; visibility can.
  style.innerHTML = '@media print { body > * { visibility: hidden !important; } .gantt-print-root, .gantt-print-root * { visibility: visible !important; } .gantt-print-root { position: absolute !important; top: 0; left: 0; width: 100vw; height: auto; overflow: visible; display: flex !important; flex-direction: column; background: #fff; } .gantt-right-panel { overflow: visible !important; width: auto !important; } }'
  document.head.appendChild(style)
  return () => { const el = document.getElementById('gantt-print-style'); if (el) el.remove() }
}
