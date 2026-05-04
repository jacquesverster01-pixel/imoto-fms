import { taskBarPosition, dependencyArrowPath } from '../ganttUtils'

const ROW_H = 32, HDR_H = 48

function rowTopY(i, rowHeights) {
  let y = HDR_H
  for (let j = 0; j < i; j++) y += (rowHeights[j] || ROW_H)
  return y
}

export default function DependencyOverlay({ rows, zoomCols, chartWidth, rowHeights }) {
  const totalH = HDR_H + rows.reduce((s, _, i) => s + (rowHeights[i] || ROW_H), 0)
  const arrows = []
  rows.forEach((row, i) => {
    if (!row.task.dependsOn?.length) return
    const sp = taskBarPosition(row.task, zoomCols)
    row.task.dependsOn.forEach(depId => {
      const pi = rows.findIndex(r => r.task.id === depId); if (pi === -1) return
      const pp2 = taskBarPosition(rows[pi].task, zoomCols)
      arrows.push(<path key={`${depId}>${row.task.id}`} d={dependencyArrowPath(pp2.left, pp2.width, sp.left, rowTopY(pi, rowHeights)+6, rowTopY(i, rowHeights)+6, zoomCols[0]?.widthPx||28)} fill="none" stroke="#888" strokeWidth="1.5" markerEnd="url(#da)" />)
    })
  })
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: chartWidth, height: totalH, pointerEvents: 'none', zIndex: 1 }}>
      <defs><marker id="da" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      {arrows}
    </svg>
  )
}
