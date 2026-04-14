import { styles } from '../../../utils/hrStyles'
import { ohsInspectionStatusStyle, inspectionScorePercent, inspectionScoreColour } from '../../../utils/ohs'

export default function OHSInspections({
  filteredInspections, inspSearch, setInspSearch,
  inspStatusFilter, setInspStatusFilter,
  setShowSchedule, setRunInspection, setViewInspection, onDeleteInspection
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={styles.cardTitle}>Inspections</div>
        <button style={styles.btnPrimary} onClick={() => setShowSchedule(true)}>+ Schedule Inspection</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, width: 240 }}
          placeholder="Search template, dept, performed by…"
          value={inspSearch}
          onChange={e => setInspSearch(e.target.value)}
        />
        <select style={{ ...styles.input, marginBottom: 0, width: 160 }} value={inspStatusFilter} onChange={e => setInspStatusFilter(e.target.value)}>
          {['All', 'Scheduled', 'In Progress', 'Complete', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {filteredInspections.length === 0 && (
        <div style={{ textAlign: 'center', color: '#ccc', padding: '32px 0', fontSize: 14 }}>No inspections found</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredInspections.map(ins => {
          const pct = inspectionScorePercent(ins)
          const failItems = (ins.items || []).filter(i => i.result === 'Fail')
          const statusSty = ohsInspectionStatusStyle(ins.status)
          const isComplete = ins.status === 'Complete'
          return (
            <div key={ins.id} style={{ border: '1px solid #e4e6ea', borderRadius: 10, padding: '14px 16px', background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>{ins.templateName}</span>
                    {ins.department && <span style={{ ...styles.pill, background: '#f0f2f5', color: '#555', fontSize: 11 }}>{ins.department}</span>}
                    <span style={{ ...styles.pill, ...statusSty }}>{ins.status}</span>
                    {failItems.length > 0 && (
                      <span style={{ ...styles.pill, background: '#fee2e2', color: '#991b1b', fontSize: 11 }}>{failItems.length} failed</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: isComplete && pct !== null ? 8 : 0 }}>
                    {ins.performedBy && <span>👤 {ins.performedBy}</span>}
                    {ins.scheduledDate && <span>📅 Scheduled: {ins.scheduledDate}</span>}
                    {ins.completedDate && <span>✓ Completed: {ins.completedDate}</span>}
                  </div>
                  {isComplete && pct !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: '#e4e6ea', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: inspectionScoreColour(pct), borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: inspectionScoreColour(pct), whiteSpace: 'nowrap' }}>
                        {ins.score} / {ins.maxScore} ({pct}%)
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {isComplete
                    ? <button style={{ ...styles.btnSmall, background: '#ede9fe', color: '#5b21b6' }} onClick={() => setViewInspection(ins)}>View Results</button>
                    : <button style={{ ...styles.btnSmall, background: '#6c63ff', color: '#fff' }} onClick={() => setRunInspection(ins)}>Conduct</button>
                  }
                  <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => onDeleteInspection(ins.id)}>Delete</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
