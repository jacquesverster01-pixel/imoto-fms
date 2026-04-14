import { useState } from 'react'
import { useGet } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import { serviceStatusColour, serviceStatusLabel } from '../../../utils/ohs'

// ─── Date helpers (no Intl, no locale methods) ─────────────

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay() // 0=Sun
}

function buildCalendarGrid(year, month, items) {
  const total  = getDaysInMonth(year, month)
  const first  = getFirstDayOfMonth(year, month)
  const offset = (first + 6) % 7  // Mon=0 offset
  const cells  = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({ date: dateStr, day: d, items: items.filter(it => it.date === dateStr) })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function daysUntil(dateStr, today) {
  return Math.round((Date.parse(dateStr + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000)
}

function fmtMonthYear(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function adjMonth(year, month, delta) {
  let m = month + delta
  let y = year
  if (m < 1)  { m = 12; y-- }
  if (m > 12) { m = 1;  y++ }
  return { year: y, month: m }
}

// ──────────────────────────────────────────────────────────

export default function ComplianceCalendarTab() {
  const { data: equipRaw } = useGet('/ohs-equipment')
  const equipment = Array.isArray(equipRaw) ? equipRaw : []

  const today = todayStr()
  const [ty, tm] = today.split('-').map(Number)
  const todayMonth = tm

  const [view,      setView]      = useState('list')   // 'list' | 'calendar'
  const [filter,    setFilter]    = useState('All')    // All | Overdue | Month | Upcoming
  const [calYear,   setCalYear]   = useState(ty)
  const [calMonth,  setCalMonth]  = useState(tm)
  const [hoverItem, setHoverItem] = useState(null)     // { id, name, x, y }

  // Build compliance items from equipment
  const allItems = equipment
    .filter(eq => eq.nextServiceDate)
    .map(eq => ({ type: 'Equipment Service', id: eq.id, name: eq.name, date: eq.nextServiceDate }))
    .sort((a, b) => a.date.localeCompare(b.date))

  function itemFilter(it) {
    const days = daysUntil(it.date, today)
    if (filter === 'Overdue')  return days < 0
    if (filter === 'Month')    return it.date.slice(0, 7) === `${ty}-${String(todayMonth).padStart(2,'0')}`
    if (filter === 'Upcoming') return days >= 0
    return true
  }

  const listItems = allItems.filter(itemFilter)

  // Calendar grid
  const calItems  = allItems.filter(it => it.date.slice(0, 7) === `${calYear}-${String(calMonth).padStart(2,'0')}`)
  const calGrid   = buildCalendarGrid(calYear, calMonth, calItems)

  function navMonth(delta) {
    const { year, month } = adjMonth(calYear, calMonth, delta)
    setCalYear(year)
    setCalMonth(month)
  }

  // ── List view ────────────────────────────────────────────

  function ListRow({ it }) {
    const days = daysUntil(it.date, today)
    const col  = serviceStatusColour(it.date)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 100px 140px', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f0f2f5', fontSize: 13 }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>{it.type}</span>
        <span style={{ fontWeight: 600, color: '#1e1f3b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
        <span style={{ color: '#555' }}>{it.date}</span>
        <span style={{ fontWeight: 700, color: days < 0 ? '#dc2626' : days <= 30 ? '#f59e0b' : '#166534' }}>
          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
        </span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: col.bg, color: col.text }}>{serviceStatusLabel(it.date)}</span>
      </div>
    )
  }

  // ── Calendar view ────────────────────────────────────────

  const cellStyle = (isToday) => ({
    minHeight: 72, verticalAlign: 'top', padding: 4, border: '1px solid #e4e6ea',
    background: isToday ? '#f0ecff' : '#fff',
    position: 'relative',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All','Overdue','Month','Upcoming'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: filter === f ? '#6c63ff' : '#f3f4f6', color: filter === f ? '#fff' : '#374151' }}>
              {f === 'Month' ? 'Due this month' : f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['list','calendar'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: view === v ? '#1e1f3b' : '#f3f4f6', color: view === v ? '#fff' : '#374151' }}>
              {v === 'list' ? 'List' : 'Calendar'}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 100px 140px', gap: 12, padding: '10px 16px', background: '#f9fafb', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e4e6ea' }}>
            <span>Type</span><span>Item</span><span>Due Date</span><span>Days Until</span><span>Status</span>
          </div>
          {listItems.length === 0 && (
            <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0', fontSize: 14 }}>No items for this filter</div>
          )}
          {listItems.map(it => <ListRow key={it.id} it={it} />)}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e4e6ea' }}>
            <button onClick={() => navMonth(-1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e4e6ea', background: '#f3f4f6', cursor: 'pointer', fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e1f3b' }}>{fmtMonthYear(calYear, calMonth)}</span>
            <button onClick={() => navMonth(1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e4e6ea', background: '#f3f4f6', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {DAY_HEADERS.map(d => (
                  <th key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#888', background: '#f9fafb', borderBottom: '1px solid #e4e6ea' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calGrid.map((week, wi) => (
                <tr key={wi}>
                  {week.map((cell, ci) => {
                    const isToday = cell?.date === today
                    return (
                      <td key={ci} style={cellStyle(isToday)}>
                        {cell && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? '#6c63ff' : '#374151', marginBottom: 4 }}>
                              {cell.day}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {cell.items.map(it => {
                                const col = serviceStatusColour(it.date)
                                return (
                                  <div
                                    key={it.id}
                                    title={it.name}
                                    onMouseEnter={e => setHoverItem({ id: it.id, name: it.name, type: it.type })}
                                    onMouseLeave={() => setHoverItem(null)}
                                    style={{ width: 10, height: 10, borderRadius: '50%', background: col.text, cursor: 'default', flexShrink: 0 }}
                                  />
                                )
                              })}
                            </div>
                          </>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Hover tooltip */}
          {hoverItem && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid #e4e6ea', fontSize: 12, color: '#555', background: '#f9fafb' }}>
              <strong>{hoverItem.name}</strong> — {hoverItem.type}
            </div>
          )}

          {calItems.length === 0 && (
            <div style={{ textAlign: 'center', color: '#ccc', padding: '24px 0', fontSize: 13 }}>No items due this month</div>
          )}
        </div>
      )}
    </div>
  )
}
