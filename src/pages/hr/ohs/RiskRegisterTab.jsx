import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import { riskRatingColour, reviewStatusColour, reviewStatusLabel } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'
import AddRiskModal from './AddRiskModal'
import RiskReviewModal from './RiskReviewModal'
import OHSFilePanel from './OHSFilePanel'

function RatingBadge({ rating, score }) {
  const col = riskRatingColour(rating)
  return (
    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 8, background: col.bg, color: col.text }}>
      {rating} ({score})
    </span>
  )
}

function ReviewBadge({ status }) {
  const col = reviewStatusColour(status)
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: col.bg, color: col.text }}>
      {reviewStatusLabel(status)}
    </span>
  )
}

function statusPillStyle(status) {
  if (status === 'Controlled')   return { background: '#dcfce7', color: '#166534' }
  if (status === 'Closed')       return { background: '#f3f4f6', color: '#374151' }
  if (status === 'Under Review') return { background: '#dbeafe', color: '#1e40af' }
  return { background: '#fef3c7', color: '#92400e' }
}

export default function RiskRegisterTab({ settingsData }) {
  const { data: risksRaw, refetch: refetchRisks } = useGet('/ohs-risks')
  const risks = Array.isArray(risksRaw) ? risksRaw : []
  const today = todayStr()
  const departments = settingsData?.departments || []

  const [search,        setSearch]        = useState('')
  const [ratingFilter,  setRatingFilter]  = useState('All')
  const [statusFilter,  setStatusFilter]  = useState('All')
  const [deptFilter,    setDeptFilter]    = useState('All')
  const [showAdd,       setShowAdd]       = useState(false)
  const [editRisk,      setEditRisk]      = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expandedSet,   setExpandedSet]   = useState(new Set())
  const [reviewRisk,    setReviewRisk]    = useState(null)

  const totalCount      = risks.length
  const criticalCount   = risks.filter(r => r.riskRating === 'Critical').length
  const highCount       = risks.filter(r => r.riskRating === 'High').length
  const controlledCount = risks.filter(r => r.status === 'Controlled').length

  const overdueCount = risks.filter(r => {
    const status = r.reviewStatus || 'due'
    if (status === 'overdue') return true
    if (r.nextReviewDate && r.nextReviewDate < today) return true
    return false
  }).length

  const deptOptions = ['All', ...departments.map(d => d.name)]

  const filtered = risks.filter(r => {
    if (ratingFilter !== 'All' && r.riskRating !== ratingFilter) return false
    if (statusFilter !== 'All' && r.status !== statusFilter) return false
    if (deptFilter !== 'All' && r.department !== deptFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(
        (r.title       || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.department  || '').toLowerCase().includes(q)
      )) return false
    }
    return true
  }).sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))

  async function handleDelete(id) {
    try {
      await apiFetch(`/ohs-risks/${id}`, { method: 'DELETE' })
      refetchRisks()
    } catch (err) {
      console.error('Delete risk failed:', err)
    } finally {
      setConfirmDelete(null)
    }
  }

  function toggleExpanded(id) {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function getReviewStatus(r) {
    if (r.nextReviewDate && r.nextReviewDate < today) return 'overdue'
    return r.reviewStatus || 'due'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(showAdd || editRisk) && (
        <AddRiskModal
          risk={editRisk}
          departments={departments}
          onClose={() => { setShowAdd(false); setEditRisk(null) }}
          onSaved={() => { setShowAdd(false); setEditRisk(null); refetchRisks() }}
        />
      )}
      {reviewRisk && (
        <RiskReviewModal
          risk={reviewRisk}
          onClose={() => setReviewRisk(null)}
          onSaved={() => { setReviewRisk(null); refetchRisks() }}
        />
      )}
      {confirmDelete && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, width: 360 }}>
            <h3 style={styles.modalTitle}>Delete Risk</h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
              Delete <strong>{confirmDelete.title}</strong>? This cannot be undone.
            </p>
            <div style={styles.modalBtns}>
              <button style={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={{ ...styles.btnPrimary, background: '#dc2626' }} onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Overdue review banner */}
      {overdueCount > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ color: '#991b1b', fontWeight: 600 }}>
            {overdueCount} risk{overdueCount !== 1 ? 's are' : ' is'} overdue for review.
          </span>
          <span style={{ color: '#b91c1c' }}>Review the items marked below.</span>
        </div>
      )}

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Risks',  value: totalCount },
          { label: 'Critical',     value: criticalCount,  accent: criticalCount > 0 ? '#991b1b' : undefined },
          { label: 'High',         value: highCount,      accent: highCount > 0 ? '#9a3412' : undefined },
          { label: 'Controlled',   value: controlledCount, accent: '#166534' },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{ flex: 1, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: accent || '#6c63ff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            <input
              style={{ ...styles.input, marginBottom: 0, width: 200 }}
              placeholder="Search risks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={{ ...styles.input, marginBottom: 0, width: 130 }} value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
              {['All','Critical','High','Medium','Low'].map(r => <option key={r}>{r}</option>)}
            </select>
            <select style={{ ...styles.input, marginBottom: 0, width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {['All','Open','Under Review','Controlled','Closed'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select style={{ ...styles.input, marginBottom: 0, width: 150 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              {deptOptions.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <button style={styles.btnPrimary} onClick={() => setShowAdd(true)}>+ Add Risk</button>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '32px 0', fontSize: 14 }}>No risks found</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const reviewOverdue = r.reviewDate && r.reviewDate < today
            const expanded = expandedSet.has(r.id)
            const iScore = r.riskScore ?? (r.likelihood * r.severity)
            const rScore = r.residualScore ?? (r.residualLikelihood * r.residualSeverity)
            const rvStatus = getReviewStatus(r)
            return (
              <div key={r.id} style={{ border: `1px solid ${rvStatus === 'overdue' ? '#fca5a5' : '#e4e6ea'}`, borderRadius: 10, padding: '14px 16px', background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>{r.title}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f0f2f5', color: '#555' }}>{r.category}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, ...statusPillStyle(r.status) }}>{r.status}</span>
                      <ReviewBadge status={rvStatus} />
                    </div>
                    <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                      {r.department && <span>{r.department}</span>}
                      {r.location   && <span>📍 {r.location}</span>}
                      {r.owner      && <span>👤 {r.owner}</span>}
                      {r.reviewDate && (
                        <span style={{ color: reviewOverdue ? '#dc2626' : 'inherit' }}>
                          Review: {r.reviewDate}{reviewOverdue ? ' ⚠ overdue' : ''}
                        </span>
                      )}
                      {r.lastReviewDate && <span>Last reviewed: {r.lastReviewDate}</span>}
                      {r.nextReviewDate && (
                        <span style={{ color: rvStatus === 'overdue' ? '#dc2626' : '#555' }}>
                          Next review: {r.nextReviewDate}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: r.controls ? 8 : 0 }}>
                      <span style={{ fontSize: 12, color: '#888' }}>Inherent:</span>
                      <RatingBadge rating={r.riskRating} score={iScore} />
                      <span style={{ fontSize: 14, color: '#ccc' }}>→</span>
                      <span style={{ fontSize: 12, color: '#888' }}>Residual:</span>
                      <RatingBadge rating={r.residualRating} score={rScore} />
                    </div>
                    {r.controls && (
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <span style={{ color: '#888', marginRight: 4 }}>Controls:</span>
                        <span style={expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.controls}
                        </span>
                        {r.controls.length > 80 && (
                          <button onClick={() => toggleExpanded(r.id)} style={{ marginLeft: 6, fontSize: 11, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer' }}>
                            {expanded ? 'less' : 'more'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button style={{ ...styles.btnSmall, background: '#ede9fe', color: '#5b21b6' }} onClick={() => setReviewRisk(r)}>Review</button>
                    <button style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }} onClick={() => setEditRisk(r)}>Edit</button>
                    <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => setConfirmDelete(r)}>Delete</button>
                  </div>
                </div>
                <OHSFilePanel context="risk" contextId={r.id} uploadedBy="" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
