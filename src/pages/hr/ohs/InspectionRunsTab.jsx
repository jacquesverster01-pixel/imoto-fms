import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { inspectionProgress, inspectionStatusColour } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'
import ScheduleInspectionModal from './ScheduleInspectionModal'
import InspectionRunnerModal from './InspectionRunnerModal'
import InspectionReportModal from './InspectionReportModal'

const CADENCES = ['', 'weekly', 'monthly', 'quarterly']
const STATUSES = ['', 'pending', 'in-progress', 'completed']

function StatusBadge({ status }) {
  const col = inspectionStatusColour(status)
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
      background: col.bg, color: col.text, textTransform: 'capitalize',
    }}>
      {status}
    </span>
  )
}

function ProgressBar({ inspection }) {
  const { answered, total, percent } = inspectionProgress(inspection)
  if (inspection.status !== 'in-progress') return null
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 3 }}>
        <span>{answered} / {total} answered</span>
        <span>{percent}%</span>
      </div>
      <div style={{ height: 6, background: '#e4e6ea', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: '#6c63ff', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function InspectionCard({ item, onWhatsApp, onView, onDelete }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>{item.assigneeName}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
              background: '#ede9fe', color: '#5b21b6', textTransform: 'capitalize',
            }}>{item.cadence}</span>
            <StatusBadge status={item.status} />
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>Due: {item.dueDate}</div>
          {item.notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{item.notes}</div>}
          <ProgressBar inspection={item} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            style={{ ...styles.btnSmall, background: '#25d366', color: '#fff', whiteSpace: 'nowrap' }}
            onClick={() => onWhatsApp(item.id)}
          >
            WhatsApp
          </button>
          <button
            style={{ ...styles.btnSmall, background: '#6c63ff', color: '#fff', whiteSpace: 'nowrap' }}
            onClick={() => onView(item)}
          >
            {item.status === 'completed' ? 'View' : 'View / Complete'}
          </button>
          <button
            style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b', whiteSpace: 'nowrap' }}
            onClick={() => onDelete(item.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InspectionRunsTab() {
  const { data: rawData, refetch } = useGet('/ohs-inspections-active')
  const inspections = Array.isArray(rawData) ? rawData : []

  const [cadenceFilter, setCadenceFilter] = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [search,        setSearch]        = useState('')
  const [showSchedule,  setShowSchedule]  = useState(false)
  const [runItem,       setRunItem]       = useState(null)
  const [reportItem,    setReportItem]    = useState(null)
  const [waMessages,    setWaMessages]    = useState({})

  const filtered = inspections.filter(item => {
    if (cadenceFilter && item.cadence !== cadenceFilter) return false
    if (statusFilter  && item.status  !== statusFilter)  return false
    if (search && !item.assigneeName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const total      = inspections.length
  const pending    = inspections.filter(i => i.status === 'pending').length
  const inProgress = inspections.filter(i => i.status === 'in-progress').length
  const completed  = inspections.filter(i => i.status === 'completed').length

  async function handleWhatsApp(id) {
    try {
      const result = await apiFetch(`/ohs-inspections-active/${id}/whatsapp-link`)
      if (result.url) {
        window.open(result.url, '_blank')
      } else {
        setWaMessages(prev => ({ ...prev, [id]: 'No phone number on record.' }))
        setTimeout(() => setWaMessages(prev => { const n = { ...prev }; delete n[id]; return n }), 3000)
      }
    } catch {
      setWaMessages(prev => ({ ...prev, [id]: 'Could not generate link.' }))
      setTimeout(() => setWaMessages(prev => { const n = { ...prev }; delete n[id]; return n }), 3000)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this inspection?')) return
    await apiFetch(`/ohs-inspections-active/${id}`, { method: 'DELETE' })
    refetch()
  }

  const KPI_CARDS = [
    { label: 'Total',       value: total,      bg: '#f3f4f6', text: '#374151' },
    { label: 'Pending',     value: pending,    bg: '#e3f2fd', text: '#1565c0' },
    { label: 'In Progress', value: inProgress, bg: '#fff8e1', text: '#f57f17' },
    { label: 'Completed',   value: completed,  bg: '#e8f5e9', text: '#2e7d32' },
  ]

  return (
    <div>
      {showSchedule && (
        <ScheduleInspectionModal
          isOpen={true}
          onClose={() => setShowSchedule(false)}
          onSaved={() => { refetch(); setShowSchedule(false) }}
        />
      )}
      {runItem && (
        <InspectionRunnerModal
          inspection={runItem}
          onClose={() => { setRunItem(null); refetch() }}
        />
      )}
      {reportItem && (
        <InspectionReportModal
          inspection={reportItem}
          onClose={() => setReportItem(null)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {KPI_CARDS.map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.text }}>{card.value}</div>
            <div style={{ fontSize: 12, color: card.text, opacity: 0.8 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...styles.input, marginBottom: 0, flex: '1 1 160px', minWidth: 140 }}
          placeholder="Search assignee…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...styles.input, marginBottom: 0, flex: '0 0 130px' }}
          value={cadenceFilter}
          onChange={e => setCadenceFilter(e.target.value)}
        >
          {CADENCES.map(c => <option key={c} value={c}>{c || 'All cadences'}</option>)}
        </select>
        <select
          style={{ ...styles.input, marginBottom: 0, flex: '0 0 140px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <button style={styles.btnPrimary} onClick={() => setShowSchedule(true)}>
          + Schedule Inspection
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 40 }}>
          No inspections found.
        </div>
      ) : (
        filtered.map(item => (
          <div key={item.id}>
            {waMessages[item.id] && (
              <div style={{ fontSize: 12, color: '#f57f17', marginBottom: 4, paddingLeft: 4 }}>
                {waMessages[item.id]}
              </div>
            )}
            <InspectionCard
              item={item}
              onWhatsApp={handleWhatsApp}
              onView={item => item.status === 'completed' ? setReportItem(item) : setRunItem(item)}
              onDelete={handleDelete}
            />
          </div>
        ))
      )}
    </div>
  )
}
