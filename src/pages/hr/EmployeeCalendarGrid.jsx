import { fmtTime } from '../../utils/time'

export default function EmployeeCalendarGrid({ firstDow, daysInMonth, monthPrefix, today, getDayData, setConfirmCell }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#aaa', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 70px)', gap: 3 }}>
        {Array.from({ length: 42 }).map((_, i) => {
          const day = i - firstDow + 1
          if (day < 1 || day > daysInMonth) return <div key={i} />
          const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`
          const { status, leaveRecord, excusedRecord, shifts, totalHours, late, overtime, isWeekend } = getDayData(dateStr)
          const isCurrentDay = dateStr === today
          const isCalendarLeave = leaveRecord?.source === 'calendar'
          const isClickable = status === 'absent' || status === 'excused' || isCalendarLeave

          let cellBg = '#fff'
          if (status === 'absent') cellBg = '#fff5f5'
          else if (status === 'excused') cellBg = '#f0fdf4'
          else if (status === 'leave') cellBg = '#eff6ff'
          else if (isWeekend) cellBg = '#f8f9fb'
          else if (status === 'present') cellBg = '#f0fdf4'

          function handleCellClick() {
            if (status === 'absent') setConfirmCell({ dateStr, action: 'excuse' })
            else if (status === 'excused') setConfirmCell({ dateStr, excusedRecord, action: 'remove-excused' })
            else if (isCalendarLeave) setConfirmCell({ dateStr, leaveRecord, action: 'remove-leave' })
          }

          return (
            <div
              key={i}
              onClick={isClickable ? handleCellClick : undefined}
              title={status === 'absent' ? 'Click to add excuse' : status === 'excused' ? 'Click to remove excuse' : isCalendarLeave ? `Click to remove ${leaveRecord.type}` : undefined}
              style={{ borderRadius: 6, background: cellBg, border: isCurrentDay ? '2px solid #6c63ff' : status === 'excused' ? '1px solid #86efac' : isCalendarLeave ? '1px solid #c4b5fd' : '1px solid #eee', padding: '4px 5px', overflow: 'hidden', cursor: isClickable ? 'pointer' : 'default' }}
            >
              <div style={{ fontSize: 10, fontWeight: isCurrentDay ? 800 : 500, color: isWeekend ? '#ccc' : isCurrentDay ? '#6c63ff' : '#555', marginBottom: 2 }}>{day}</div>
              {status === 'absent' && <div style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', background: '#fee2e2', borderRadius: 3, padding: '1px 4px', marginBottom: 1 }}>ABSENT</div>}
              {status === 'excused' && <div style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 3, padding: '1px 4px', marginBottom: 1 }}>EXCUSED</div>}
              {status === 'leave' && (
                <div style={{ fontSize: 9, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 3, padding: '1px 4px', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {leaveRecord?.type || 'Leave'}
                </div>
              )}
              {status === 'present' && shifts.map((s, si) => (
                <div key={si} style={{ fontSize: 9, color: '#374151', lineHeight: 1.4 }}>
                  {fmtTime(s.in.timestamp)}{s.out ? `–${fmtTime(s.out.timestamp)}` : '→'}
                </div>
              ))}
              {status === 'present' && totalHours > 0 && (
                <div style={{ fontSize: 9, fontWeight: 700, color: overtime ? '#6c63ff' : '#16a34a', marginTop: 1 }}>
                  {totalHours.toFixed(1)}h{overtime ? ' OT' : ''}
                </div>
              )}
              {late && status === 'present' && <div style={{ fontSize: 9, fontWeight: 700, color: '#854d0e', background: '#fef9c3', borderRadius: 3, padding: '1px 4px', marginTop: 1 }}>LATE</div>}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid #f0f2f5' }}>
        {[
          { bg: '#f0fdf4', border: '#86efac', label: 'Present' },
          { bg: '#fee2e2', border: '#fca5a5', label: 'Absent (click to excuse)' },
          { bg: '#dcfce7', border: '#86efac', label: 'Excused (click to remove)' },
          { bg: '#dbeafe', border: '#93c5fd', label: 'Leave' },
          { bg: '#fef9c3', border: '#fde68a', label: 'Late' },
          { bg: '#f5f3ff', border: '#c4b5fd', label: 'Overtime >8h' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: item.bg, border: `1px solid ${item.border}` }} />
            <span style={{ fontSize: 11, color: '#888' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  )
}
