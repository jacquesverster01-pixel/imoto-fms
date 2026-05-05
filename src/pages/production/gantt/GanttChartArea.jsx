import GanttBar from './GanttBar'
import MilestoneRow from './MilestoneRow'
import DependencyOverlay from './DependencyOverlay'
import { isMilestone, getTaskBarColor } from '../ganttUtils'

const ROW_H = 32

export default function GanttChartArea({ visibleRows, tasks, zoomCols, colsWithLeft, colGroups, chartWidth, criticalIds, zoom, job, showBaseline, baseline, allDescendants, ghostBar, rowHeights, rightPanelRef, dragRef, taskRowsRef, dateDrawRef, onRightScroll, handlePanStart, onToggleMilestone, onBarRightClick, startLinkDrag }) {
  return (
    <div ref={rightPanelRef} onScroll={onRightScroll} className="gantt-right-panel"
      style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative', cursor: 'grab' }}
      onMouseDown={e => {
        if (e.button !== 0) return
        if (e.target.closest('[data-task-id]')) return
        if (dateDrawRef.current) return
        handlePanStart(e)
      }}>
      <div style={{ width: chartWidth, minWidth: '100%', position: 'relative' }}>
        <div style={{ height: 24, display: 'flex', position: 'sticky', top: 0, zIndex: 2, background: '#f8f9fb', borderBottom: '1px solid #e4e6ea' }}>
          {colGroups.map((g, i) => <div key={i} style={{ width: g.w, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#5f5e5a', padding: '0 6px', display: 'flex', alignItems: 'center', borderRight: '1px solid #e4e6ea' }}>{g.label}</div>)}
        </div>
        <div style={{ height: 24, display: 'flex', position: 'sticky', top: 24, zIndex: 2, background: '#f8f9fb', borderBottom: '1px solid #e4e6ea' }}>
          {zoomCols.map(c => <div key={c.key} style={{ width: c.widthPx, flexShrink: 0, fontSize: 10, color: '#9298c4', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.isWeekend ? 'rgba(0,0,0,0.05)' : (c.isToday ? 'rgba(79,103,228,0.08)' : undefined), borderLeft: c.isToday ? '2px solid #185fa5' : undefined }}>{c.subLabel}</div>)}
        </div>
        {visibleRows.map((row, ri) => {
          const { task: rt, isParent: rip } = row
          const noDate = !rt.startDate && !isMilestone(rt) && !rip
          return (
            <div key={`${row.parentId||''}-${rt.id}`}
              style={{ height: rowHeights[ri] || ROW_H, position: 'relative', background: ri % 2 === 0 ? '#fff' : '#fafafa', cursor: noDate ? 'crosshair' : undefined }}
              onMouseDown={noDate ? e => {
                if (e.button !== 0) return
                const rect = rightPanelRef.current?.getBoundingClientRect()
                if (!rect) return
                const x = e.clientX - rect.left + (rightPanelRef.current?.scrollLeft || 0)
                dateDrawRef.current = { taskId: rt.id, parentId: row.parentId, rowIndex: ri, startPx: x }
              } : undefined}>
              {zoom === 'day' && colsWithLeft.filter(c => c.isWeekend).map(c => <div key={c.key} style={{ position: 'absolute', left: c.left, top: 0, width: c.widthPx, height: '100%', background: 'rgba(0,0,0,0.03)', pointerEvents: 'none' }} />)}
              {isMilestone(rt)
                ? <MilestoneRow task={rt} zoomCols={zoomCols} job={job} onToggleDone={onToggleMilestone} dragRef={dragRef} taskRowsRef={taskRowsRef} />
                : rt.startDate && rt.endDate
                  ? <GanttBar row={row} job={job} zoomCols={zoomCols} criticalIds={criticalIds} showBaseline={showBaseline} baseline={baseline} dragRef={dragRef} taskRowsRef={taskRowsRef} onBarRightClick={onBarRightClick} barColor={getTaskBarColor(rt, tasks, allDescendants)} onLinkStart={startLinkDrag} />
                  : noDate && !ghostBar && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8, pointerEvents: 'none' }}><span style={{ fontSize: 11, color: '#c0c5d8' }}>Click & drag to set dates</span></div>
              }
              {ghostBar && ghostBar.rowIndex === ri && ghostBar.width > 2 && (
                <div style={{ position: 'absolute', left: ghostBar.left, top: 6, width: ghostBar.width, height: 20, border: '2px dashed #2563eb', background: 'rgba(37,99,235,0.08)', borderRadius: 4, pointerEvents: 'none' }} />
              )}
            </div>
          )
        })}
        <DependencyOverlay rows={visibleRows} zoomCols={zoomCols} chartWidth={chartWidth} rowHeights={rowHeights} />
      </div>
    </div>
  )
}
