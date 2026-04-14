import { useState } from 'react'
import { apiFetch } from '../../../hooks/useApi'
import { todayStr } from '../../../utils/time'
import {
  ohsRiskColour, countOhsActions, ohsStatusStyle, ohsActionStatusStyle,
  appointmentStatusColour, serviceStatusColour,
} from '../../../utils/ohs'
import { styles } from '../../../utils/hrStyles'
import AddIncidentModal from './AddIncidentModal'
import AddActionModal from './AddActionModal'
import OHSFilePanel from './OHSFilePanel'

export default function OHSDashboard({ incidents, refreshOhs, employees, appointments, appointmentTypes, allEquipment }) {
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState('All')
  const [typeFilter,      setTypeFilter]      = useState('All')
  const [showAddIncident, setShowAddIncident] = useState(false)
  const [editIncident,    setEditIncident]    = useState(null)
  const [addActionFor,    setAddActionFor]    = useState(null)
  const [editAction,      setEditAction]      = useState(null)

  const today = todayStr()

  const totalCount    = incidents.length
  const openCount     = incidents.filter(i => ['Open', 'Assigned', 'In Progress'].includes(i.status)).length
  const resolvedCount = incidents.filter(i => ['Resolved', 'Closed'].includes(i.status)).length
  const highRiskCount = incidents.filter(i => (i.riskScore || 0) >= 9).length

  const filtered = incidents.filter(inc => {
    if (statusFilter !== 'All' && inc.status !== statusFilter) return false
    if (typeFilter   !== 'All' && inc.type   !== typeFilter)   return false
    if (search) {
      const q = search.toLowerCase()
      if (!((inc.title       || '').toLowerCase().includes(q) ||
            (inc.description || '').toLowerCase().includes(q) ||
            (inc.department  || '').toLowerCase().includes(q))) return false
    }
    return true
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  const allActions = incidents.flatMap(inc =>
    (inc.correctiveActions || []).map(a => ({ ...a, incidentId: inc.id, incidentTitle: inc.title }))
  )

  // Dashboard alerts
  const expiringAppts = appointments.filter(a => appointmentStatusColour(a.expiryDate).bg === '#fff8e1')
  const overdueEquip  = allEquipment.filter(eq => serviceStatusColour(eq.nextServiceDate).bg === '#ffebee')

  async function handleDeleteIncident(id) {
    try {
      await apiFetch(`/ohs/${id}`, { method: 'DELETE' })
      refreshOhs()
    } catch (err) { console.error('Delete incident error:', err) }
  }

  async function handleActionStatusChange(incidentId, actionId, newStatus) {
    try {
      await apiFetch(`/ohs/${incidentId}/action/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      refreshOhs()
    } catch (err) { console.error('Action status error:', err) }
  }

  async function handleDeleteAction(incidentId, actionId) {
    try {
      await apiFetch(`/ohs/${incidentId}/action/${actionId}`, { method: 'DELETE' })
      refreshOhs()
    } catch (err) { console.error('Delete action error:', err) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(showAddIncident || editIncident) && (
        <AddIncidentModal
          incident={editIncident}
          onClose={() => { setShowAddIncident(false); setEditIncident(null) }}
          onSaved={() => { setShowAddIncident(false); setEditIncident(null); refreshOhs() }}
        />
      )}
      {addActionFor && (
        <AddActionModal
          incidentId={addActionFor}
          action={null}
          onClose={() => setAddActionFor(null)}
          onSaved={() => { setAddActionFor(null); refreshOhs() }}
        />
      )}
      {editAction && (
        <AddActionModal
          incidentId={editAction.incidentId}
          action={editAction.action}
          onClose={() => setEditAction(null)}
          onSaved={() => { setEditAction(null); refreshOhs() }}
        />
      )}

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Incidents', value: totalCount },
          { label: 'Open',            value: openCount },
          { label: 'Resolved',        value: resolvedCount },
          { label: 'High Risk',       value: highRiskCount },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#6c63ff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Appointment expiry alerts */}
      {expiringAppts.length > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #f57f17', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f57f17', marginBottom: 8 }}>
            Appointments expiring within 60 days
          </div>
          {expiringAppts.map(apt => {
            const emp = employees.find(e => e.id === apt.appointeeId)
            const typ = appointmentTypes.find(t => t.id === apt.typeId)
            return (
              <div key={apt.id} style={{ fontSize: 12, color: '#555', padding: '2px 0' }}>
                <strong>{emp?.name || apt.appointeeId}</strong>
                {' — '}{typ?.label || apt.typeId}
                {' — '}Expires: {apt.expiryDate}
              </div>
            )
          })}
        </div>
      )}

      {/* Equipment service overdue alerts */}
      {overdueEquip.length > 0 && (
        <div style={{ background: '#ffebee', border: '1px solid #c62828', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c62828', marginBottom: 8 }}>
            Equipment service overdue
          </div>
          {overdueEquip.map(eq => (
            <div key={eq.id} style={{ fontSize: 12, color: '#555', padding: '2px 0' }}>
              <strong>{eq.name}</strong> — overdue since {eq.nextServiceDate}
            </div>
          ))}
        </div>
      )}

      {/* Incident List */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={styles.cardTitle}>Incidents</div>
          <button style={styles.btnPrimary} onClick={() => setShowAddIncident(true)}>+ Report Incident</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            style={{ ...styles.input, marginBottom: 0, width: 220 }}
            placeholder="Search title, description, dept…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={{ ...styles.input, marginBottom: 0, width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select style={{ ...styles.input, marginBottom: 0, width: 180 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {['All', 'Hazard', 'Near Miss', 'Injury', 'Property Damage', 'Environmental'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '32px 0', fontSize: 14 }}>No incidents found</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(inc => {
            const rs        = inc.riskScore || 0
            const riskCol   = ohsRiskColour(rs)
            const ac        = countOhsActions(inc)
            const statusSty = ohsStatusStyle(inc.status)
            return (
              <div key={inc.id} style={{ border: '1px solid #e4e6ea', borderRadius: 10, padding: '14px 16px', background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: riskCol + '22', border: `2px solid ${riskCol}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: riskCol }}>{rs}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1f3b' }}>{inc.title}</span>
                      <span style={{ ...styles.pill, background: '#f0f2f5', color: '#555', fontSize: 11 }}>{inc.type}</span>
                      <span style={{ ...styles.pill, ...statusSty }}>{inc.status}</span>
                    </div>
                    {inc.description && (
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {inc.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {inc.department && <span>{inc.department}</span>}
                      {inc.location   && <span>📍 {inc.location}</span>}
                      {inc.reportedBy && <span>👤 {inc.reportedBy}</span>}
                      {inc.date       && <span>📅 {inc.date}</span>}
                      <span style={{ color: ac.total > 0 ? '#6c63ff' : '#aaa' }}>
                        {ac.total} action{ac.total !== 1 ? 's' : ''}{ac.total > 0 ? ` (${ac.done} done)` : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }} onClick={() => setEditIncident(inc)}>Edit</button>
                    <button style={{ ...styles.btnSmall, background: '#ede9fe', color: '#5b21b6' }} onClick={() => setAddActionFor(inc.id)}>Add Action</button>
                    <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => handleDeleteIncident(inc.id)}>Delete</button>
                  </div>
                </div>
                <OHSFilePanel context="incident" contextId={inc.id} uploadedBy="" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Corrective Actions Panel */}
      <div style={{ background: '#fff', border: '1px solid #e4e6ea', borderRadius: 12, padding: 20 }}>
        <div style={{ ...styles.cardTitle, marginBottom: 14 }}>All Corrective Actions</div>
        {allActions.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '24px 0', fontSize: 14 }}>No corrective actions yet</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allActions.map(a => {
            const isOverdue = a.dueDate && a.dueDate < today && a.status !== 'Done'
            const actionSty = ohsActionStatusStyle(a.status)
            return (
              <div key={a.id} style={{ border: '1px solid #e4e6ea', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, background: '#fafafa', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{a.incidentTitle}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1f3b' }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {a.assignedTo && <span>👤 {a.assignedTo}</span>}
                    {a.dueDate    && <span>Due: {a.dueDate}</span>}
                    {isOverdue    && <span style={{ color: '#ef4444', fontWeight: 700 }}>Overdue</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <select
                    style={{ ...styles.pill, ...actionSty, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    value={a.status}
                    onChange={e => handleActionStatusChange(a.incidentId, a.id, e.target.value)}
                  >
                    {['Open', 'In Progress', 'Done'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }} onClick={() => setEditAction({ incidentId: a.incidentId, action: a })}>Edit</button>
                  <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => handleDeleteAction(a.incidentId, a.id)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
