import { todayStr } from '../../utils/time'

const CARD = { background: '#fff', border: '1px solid #e4e6ea', borderRadius: 14, padding: '24px 28px' }

const STATUS_CFG = {
  in:    { bg: '#16a34a', text: '#fff', label: 'IN' },
  late:  { bg: '#d97706', text: '#fff', label: 'LATE' },
  leave: { bg: '#2563eb', text: '#fff', label: 'LEAVE' },
  out:   { bg: '#9ca3af', text: '#fff', label: 'OUT' },
}

export default function FactoryFloorList({ sorted, inCount, lateCount, leaveCount, notInCount, refetch }) {
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1f3b' }}>Factory Floor — Today</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{todayStr()}</span>
          <button onClick={refetch} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9298c4' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>
        {inCount} in · {lateCount} late · {leaveCount} on leave · {notInCount} not in
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map(emp => {
          const cfg      = STATUS_CFG[emp.status] || STATUS_CFG.out
          const greyed   = emp.status === 'out' && !emp.clockInTime
          const rowStyle = {
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0', borderBottom: '1px solid #f3f4f6',
            opacity: greyed ? 0.4 : 1,
          }
          return (
            <div key={emp.id} style={rowStyle}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: cfg.bg, color: cfg.text, flexShrink: 0, minWidth: 48, textAlign: 'center' }}>
                {cfg.label}{emp.status === 'leave' && emp.leaveType ? <span style={{ fontWeight: 400, fontSize: 10 }}> · {emp.leaveType}</span> : null}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e1f3b', flex: 2, minWidth: 0, fontStyle: greyed ? 'italic' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {emp.name}
              </span>
              <span style={{ fontSize: 12, color: '#6b7280', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {emp.department}
              </span>
              <span style={{ fontSize: 12, color: '#374151', flexShrink: 0, width: 48, textAlign: 'right' }}>
                {emp.clockInTime || '—'}
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, width: 48, textAlign: 'right' }}>
                {emp.clockOutTime || '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
