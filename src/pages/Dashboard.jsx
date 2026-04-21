import { useState } from 'react'
import { useGet } from '../hooks/useApi'
import FactoryFloorList from './dashboard/FactoryFloorList'
import ZkUnmatchedBanner from '../components/ZkUnmatchedBanner'

const CARD = { background: '#fff', border: '1px solid #e4e6ea', borderRadius: 14, padding: '24px 28px' }

function jobStatusStyle(status) {
  if (status === 'on-track') return { bg: '#e8f8f0', text: '#16a34a' }
  if (status === 'at-risk')  return { bg: '#fffbeb', text: '#b45309' }
  if (status === 'blocked')  return { bg: '#fee2e2', text: '#dc2626' }
  if (status === 'done') return { bg: '#ede9fe', text: '#6c63ff' }
  return { bg: '#f3f4f6', text: '#6b7280' }
}

function sortKey(e) {
  if (e.status === 'late')  return 0
  if (e.status === 'in')    return 1
  if (e.status === 'leave') return 2
  if (e.status === 'out' && e.clockInTime) return 3
  return 4
}

export default function Dashboard({ onNavigate }) {
  const [zkBannerDismissed, setZkBannerDismissed] = useState(false)
  const { data: raw, refetch } = useGet('/dashboard')
  const d    = raw || {}
  const hr   = d.hr         || {}
  const prod = d.production || {}
  const ohs  = d.ohs        || {}
  const stk  = d.stock      || {}
  const tls  = d.tools      || {}
  const empStatus = Array.isArray(d.employeeStatus) ? d.employeeStatus : []
  const ganttJobs = (Array.isArray(prod.jobs) ? prod.jobs : [])
    .filter(j => j.status !== 'done' && j.status !== 'cancelled')
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
    .slice(0, 8)
  const sorted     = [...empStatus].sort((a, b) => sortKey(a) - sortKey(b))
  const inCount    = empStatus.filter(e => e.status === 'in').length
  const lateCount  = empStatus.filter(e => e.status === 'late').length
  const leaveCount = empStatus.filter(e => e.status === 'leave').length
  const notInCount = empStatus.filter(e => e.status === 'out' && !e.clockInTime).length
  const unmatchedZkPunches = Array.isArray(d.unmatchedZkPunches) ? d.unmatchedZkPunches : []

  const kpiGroups = [
    { title: 'HR', nav: 'employees', stats: [
        { label: 'Clocked in',  value: hr.clockedInCount   ?? 0, problem: false },
        { label: 'On leave',    value: hr.onLeaveToday     ?? 0, problem: false },
        { label: 'Late today',  value: hr.lateArrivalCount ?? 0, problem: true  },
      ] },
    { title: 'Production', nav: 'production', stats: [
        { label: 'Active jobs',     value: prod.activeJobs        ?? 0, problem: false },
        { label: 'Overdue',         value: prod.overdueJobs       ?? 0, problem: true  },
        { label: 'Done this month', value: prod.completedThisMonth ?? 0, problem: false },
      ] },
    { title: 'OHS', nav: 'health-safety', stats: [
        { label: 'Open incidents',  value: ohs.openIncidents       ?? 0, problem: true },
        { label: 'Overdue insp.',   value: ohs.overdueInspections  ?? 0, problem: true },
        { label: 'Reviews due',     value: ohs.overdueReviews      ?? 0, problem: true },
        { label: 'Service due',     value: ohs.equipmentServiceDue ?? 0, problem: true },
      ] },
    { title: 'Stock', nav: 'stock', stats: [{ label: 'Low / out of stock', value: stk.lowStockCount ?? 0, problem: true }] },
    { title: 'Tools', nav: 'tools', stats: [
        { label: 'Overdue', value: tls.overdueCount ?? 0, problem: true },
        { label: 'Missing', value: tls.missingCount ?? 0, problem: true },
      ] },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!zkBannerDismissed && <ZkUnmatchedBanner punches={unmatchedZkPunches} onDismiss={() => setZkBannerDismissed(true)} />}
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {kpiGroups.map(grp => (
            <div
              key={grp.title}
              onClick={() => onNavigate(grp.nav)}
              style={{ ...CARD, cursor: 'pointer', flex: '1 1 160px', minWidth: 160 }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,99,255,0.14)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                {grp.title}
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {grp.stats.map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: s.problem && s.value > 0 ? '#dc2626' : s.value === 0 ? '#cbd5e1' : '#6c63ff' }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ ...CARD, flex: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1f3b' }}>Active Jobs</div>
            <button onClick={() => onNavigate('jobs')} style={{ fontSize: 12, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              View all →
            </button>
          </div>
          {ganttJobs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#ccc', padding: '28px 0', fontSize: 13 }}>No active jobs</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ganttJobs.map(j => {
                const sty = jobStatusStyle(j.status)
                return (
                  <div key={j.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e1f3b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{j.name}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: sty.bg, color: sty.text }}>{j.status}</span>
                        {j.due && <span style={{ fontSize: 11, color: '#888' }}>Due {j.due}</span>}
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#f0f2f5', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${j.pct || 0}%`, background: sty.text, borderRadius: 3 }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ ...CARD, flex: 1, minWidth: 210 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1f3b' }}>OHS Snapshot</div>
            <button onClick={() => onNavigate('health-safety')} style={{ fontSize: 12, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              View OHS →
            </button>
          </div>
          {[
            { label: 'Open incidents',  value: ohs.openIncidents      ?? 0 },
            { label: 'Overdue insp.',   value: ohs.overdueInspections ?? 0 },
            { label: 'Overdue reviews', value: ohs.overdueReviews     ?? 0 },
            { label: 'Equipment due',   value: ohs.equipmentServiceDue ?? 0 },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 13, color: '#555' }}>{row.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: row.value > 0 ? '#dc2626' : '#22c55e' }}>{row.value}</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.value > 0 ? '#dc2626' : '#22c55e' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <FactoryFloorList sorted={sorted} inCount={inCount} lateCount={lateCount} leaveCount={leaveCount} notInCount={notInCount} refetch={refetch} />
    </div>
  )
}
