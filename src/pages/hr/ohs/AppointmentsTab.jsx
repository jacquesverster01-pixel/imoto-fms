import { useState } from 'react'
import { useGet, apiFetch } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import { appointmentStatusColour, appointmentExpiryLabel } from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'
import AddAppointmentModal from './AddAppointmentModal'

const RISK_REGISTER_NOTE = 'Go to Risk Register tab to review them.'

import { UPLOADS_BASE as UPLOADS_URL } from '../../../hooks/useApi'

export default function AppointmentsTab() {
  const { data: aptRaw,        refetch: refetchApts  } = useGet('/ohs-appointments')
  const { data: typesRaw                             } = useGet('/ohs-appointment-types')
  const { data: empData                              } = useGet('/employees')
  const { data: reviewStatRaw                        } = useGet('/ohs-risks/review-status')

  const reviewStatuses = Array.isArray(reviewStatRaw) ? reviewStatRaw : []
  const overdueRisks   = reviewStatuses.filter(r => r.reviewStatus === 'overdue')

  const appointments = Array.isArray(aptRaw)   ? aptRaw   : []
  const types        = Array.isArray(typesRaw)  ? typesRaw : []
  const employees    = empData?.employees || []

  const [search,        setSearch]        = useState('')
  const [typeFilter,    setTypeFilter]    = useState('')
  const [showAdd,       setShowAdd]       = useState(false)
  const [editItem,      setEditItem]      = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const today = todayStr()

  // KPI values
  const totalCount    = appointments.length
  const expiredCount  = appointments.filter(a => a.expiryDate && a.expiryDate < today).length
  const expiringSoon  = appointments.filter(a => {
    const col = appointmentStatusColour(a.expiryDate)
    return col.bg === '#fff8e1'
  })
  const activeCount   = totalCount - expiredCount

  // Filtered list
  const filtered = appointments.filter(a => {
    if (typeFilter && a.typeId !== typeFilter) return false
    if (search) {
      const q   = search.toLowerCase()
      const emp = employees.find(e => e.id === a.appointeeId)
      const typ = types.find(t => t.id === a.typeId)
      if (!(
        (emp?.name  || '').toLowerCase().includes(q) ||
        (typ?.label || '').toLowerCase().includes(q)
      )) return false
    }
    return true
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  async function handleDelete(id) {
    try {
      await apiFetch(`/ohs-appointments/${id}`, { method: 'DELETE' })
      refetchApts()
    } catch (err) {
      console.error('Delete appointment failed:', err)
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {overdueRisks.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ color: '#991b1b', fontWeight: 600 }}>
            {overdueRisks.length} risk{overdueRisks.length !== 1 ? 's are' : ' is'} overdue for review.
          </span>
          <span style={{ color: '#b91c1c' }}>{RISK_REGISTER_NOTE}</span>
        </div>
      )}
      {(showAdd || editItem) && (
        <AddAppointmentModal
          isOpen={true}
          editAppointment={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null) }}
          onSaved={() => { setShowAdd(false); setEditItem(null); refetchApts() }}
        />
      )}
      {confirmDelete && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, width: 360 }}>
            <h3 style={styles.modalTitle}>Delete Appointment</h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
              Remove this appointment? This cannot be undone.
            </p>
            <div style={styles.modalBtns}>
              <button style={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={{ ...styles.btnPrimary, background: '#dc2626' }} onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Appointments', value: totalCount },
          { label: 'Active',             value: activeCount, accent: '#166534' },
          { label: 'Expiring Soon',      value: expiringSoon.length, accent: expiringSoon.length > 0 ? '#f57f17' : undefined },
          { label: 'Expired',            value: expiredCount, accent: expiredCount > 0 ? '#c62828' : undefined },
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
              style={{ ...styles.input, marginBottom: 0, width: 220 }}
              placeholder="Search name or type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={{ ...styles.input, marginBottom: 0, width: 220 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All appointment types</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <button style={styles.btnPrimary} onClick={() => setShowAdd(true)}>+ Add Appointment</button>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '32px 0', fontSize: 14 }}>No appointments found</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(apt => {
            const emp     = employees.find(e => e.id === apt.appointeeId)
            const typ     = types.find(t => t.id === apt.typeId)
            const col     = appointmentStatusColour(apt.expiryDate)
            const label   = appointmentExpiryLabel(apt.expiryDate)
            return (
              <div key={apt.id} style={{ border: '1px solid #e4e6ea', borderRadius: 10, padding: '14px 16px', background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>{emp?.name || apt.appointeeId}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#ede9fe', color: '#5b21b6' }}>
                        {typ?.label || apt.typeId}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: col.bg, color: col.text }}>
                        {label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {apt.dateAppointed && <span>Appointed: {apt.dateAppointed}</span>}
                      {typ?.legalRef && <span>{typ.legalRef}</span>}
                      {apt.notes && <span>{apt.notes}</span>}
                    </div>
                    {apt.certificate && (
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={`${UPLOADS_URL}/${apt.certificate.file}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: '#6c63ff' }}
                        >
                          📄 {apt.certificate.name}
                        </a>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }} onClick={() => setEditItem(apt)}>Edit</button>
                    <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => setConfirmDelete(apt)}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
