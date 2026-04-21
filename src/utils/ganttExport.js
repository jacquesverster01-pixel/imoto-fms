// Gantt print/export utilities extracted from GanttModal.jsx.

// Injects the print stylesheet and returns a cleanup function.
// Designed to be used directly as a useEffect callback:
//   useEffect(() => injectGanttPrintStyle(), [])
export function injectGanttPrintStyle() {
  const style = document.createElement('style'); style.id = 'gantt-print-style'
  style.innerHTML = '@media print { body > * { display: none !important; } .gantt-print-root { display: flex !important; position: static !important; width: 100vw; height: auto; overflow: visible; } .gantt-right-panel { overflow: visible !important; width: auto !important; } }'
  document.head.appendChild(style)
  return () => { const el = document.getElementById('gantt-print-style'); if (el) el.remove() }
}
