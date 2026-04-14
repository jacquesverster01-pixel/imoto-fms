const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LEAVE_COLORS = { Annual: '#6c63ff', Sick: '#ef4444', 'Family Responsibility': '#f59e0b', Unpaid: '#9ca3af' }

export default function LeaveCalendarPicker({
  calYear, calMonth, prevMonth, nextMonth,
  startDate, endDate, hoverDate, setHoverDate,
  handleDayClick,
  employeeId, leaveRecords, empPunchDates, today,
}) {
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDow = new Date(calYear, calMonth, 1).getDay()

  function isStart(d) { return d === startDate }
  function isEnd(d) { return d === endDate }
  function inRange(d) {
    const hi = endDate || hoverDate
    if (!startDate) return false
    return d >= startDate && d <= hi
  }

  return (
    <>
      <div style={{ border: '1px solid #e4e6ea', borderRadius: 10, padding: 12, marginBottom: 12, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={prevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#555' }}>◀</button>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{MONTH_NAMES[calMonth]} {calYear}</span>
          <button onClick={nextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#555' }}>▶</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#aaa', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay()
            const weekend = dow === 0 || dow === 6
            const isPast = dateStr < today
            const start = isStart(dateStr)
            const end = isEnd(dateStr)
            const between = inRange(dateStr)
            const dayLeave = employeeId
              ? leaveRecords.find(l => l.employeeId === employeeId && l.status === 'approved' && l.startDate <= dateStr && l.endDate >= dateStr) || null
              : null
            const isAbsent = employeeId && isPast && !weekend && !dayLeave && !empPunchDates.has(dateStr)
            const leaveCol = dayLeave ? (LEAVE_COLORS[dayLeave.type] || '#888') : null

            let cellBg = 'transparent'
            if (start || end) cellBg = '#6c63ff'
            else if (between) cellBg = '#ede9ff'
            else if (dayLeave) cellBg = leaveCol + '30'
            else if (isAbsent) cellBg = '#fee2e2'

            return (
              <div
                key={day}
                onClick={() => !weekend && handleDayClick(dateStr)}
                onMouseEnter={() => startDate && !endDate && setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate('')}
                style={{
                  textAlign: 'center', padding: '4px 2px 3px', borderRadius: 6, fontSize: 12,
                  cursor: weekend ? 'default' : 'pointer',
                  fontWeight: start || end ? 700 : 400,
                  color: start || end ? '#fff' : weekend ? '#ccc' : between ? '#6c63ff' : '#333',
                  background: cellBg,
                  lineHeight: 1.3,
                }}
              >
                {day}
                {!start && !end && dayLeave && (
                  <div style={{ fontSize: 7, fontWeight: 700, color: leaveCol, lineHeight: 1 }}>
                    {dayLeave.type.slice(0, 3).toUpperCase()}
                  </div>
                )}
                {!start && !end && isAbsent && (
                  <div style={{ fontSize: 7, fontWeight: 700, color: '#dc2626', lineHeight: 1 }}>ABS</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {employeeId && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 11, color: '#888' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#dbeafe' }} /> Annual leave
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fee2e2' }} /> Sick leave
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fee2e2', border: '1px solid #fca5a5' }} /> Absent
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6c63ff' }} /> Selected
          </div>
        </div>
      )}
    </>
  )
}
