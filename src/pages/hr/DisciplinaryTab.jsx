import { useState } from 'react'
import { useGet, apiFetch, BASE } from '../../hooks/useApi'
import { styles } from '../../utils/hrStyles'
import { DISC_COLORS, getSeverityLevel, getSeverityColour, printWarningLetter } from './disciplinary/printWarningLetter'
import AddDisciplinaryModal from './disciplinary/AddDisciplinaryModal'
import AttachmentsModal from './AttachmentsModal'
import DiscDeleteModal from './DiscDeleteModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function recordIsComplete(record) {
  return record.status === 'complete' || (record.attachments && record.attachments.length > 0)
}

function countPending(records) {
  return records.filter(r => !recordIsComplete(r)).length
}

async function handleDocUpload(recordId, file, onSuccess) {
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/disciplinary/${recordId}/upload`, { method: 'POST', body: formData })
  if (res.ok) {
    onSuccess()
  } else {
    alert('Upload failed. Please try again.')
  }
}

// AttachmentsModal → ./AttachmentsModal.jsx
// DiscDeleteModal  → ./DiscDeleteModal.jsx

// ── DisciplinaryTab ───────────────────────────────────────────────────────────

export default function DisciplinaryTab({ employees }) {
  const { data: discData, refetch: refreshDisc } = useGet('/disciplinary')
  const { data: settingsData } = useGet('/settings')
  const records = Array.isArray(discData) ? discData : []

  const [selectedEmpId, setSelectedEmpId] = useState(null)
  const [search, setSearch] = useState('')
  const [addRecord, setAddRecord] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [deleteRecord, setDeleteRecord] = useState(null)
  const [attachmentsRecord, setAttachmentsRecord] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [uploadOpenId, setUploadOpenId] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const selectedEmp = employees.find(e => e.id === selectedEmpId) || null
  const empRecords = records
    .filter(r => r.employeeId === selectedEmpId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const pendingCount = countPending(empRecords)
  const summaryAllClear = pendingCount === 0

  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase()
    return emp.name.toLowerCase().includes(q) || (emp.dept || '').toLowerCase().includes(q)
  })

  async function handleDelete(rec) {
    await apiFetch(`/disciplinary/${rec.id}`, { method: 'DELETE' })
    refreshDisc()
  }

  function handleSaved() {
    setAddRecord(false)
    setEditRecord(null)
    refreshDisc()
  }

  async function handleConfirmUpload(recordId) {
    setUploading(true)
    await handleDocUpload(recordId, uploadFile, () => {
      setUploadOpenId(null)
      setUploadFile(null)
      refreshDisc()
    })
    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 500 }}>

      {/* Modals */}
      {(addRecord || editRecord) && selectedEmp && (
        <AddDisciplinaryModal
          employee={selectedEmp}
          record={editRecord || null}
          onClose={() => { setAddRecord(false); setEditRecord(null) }}
          onSaved={handleSaved}
        />
      )}
      {deleteRecord && (
        <DiscDeleteModal
          onClose={() => setDeleteRecord(null)}
          onConfirm={() => handleDelete(deleteRecord)}
        />
      )}
      {attachmentsRecord && (
        <AttachmentsModal record={attachmentsRecord} onClose={() => setAttachmentsRecord(null)} />
      )}

      {/* Left panel — employee list */}
      <div style={{ width: '33%', borderRight: '1px solid #e4e6ea', paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          style={{ ...styles.input, marginBottom: 6 }}
          placeholder="Search employee or dept…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {filteredEmployees.map(emp => {
            const empRecs = records.filter(r => r.employeeId === emp.id)
            const level = getSeverityLevel(empRecs)
            const { color, bg } = getSeverityColour(level)
            const isSelected = emp.id === selectedEmpId
            const hasPending = empRecs.some(r => !recordIsComplete(r))
            return (
              <button
                key={emp.id}
                onClick={() => setSelectedEmpId(emp.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, border: 'none',
                  background: isSelected ? '#f5f3ff' : '#fafafa',
                  borderLeft: `3px solid ${isSelected ? '#6c63ff' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  outline: isSelected ? '1px solid #e4e6ea' : 'none',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: emp.color || '#6c63ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 12,
                }}>
                  {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1f3b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.name}
                  </div>
                  {emp.dept && <div style={{ fontSize: 11, color: '#9298c4' }}>{emp.dept}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  {hasPending && (
                    <span
                      title="Has records awaiting signed documents"
                      style={{ fontSize: 13, color: '#d97706', lineHeight: 1 }}
                    >⚠</span>
                  )}
                  {empRecs.length > 0 && (
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>
                      {empRecs.length}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          {filteredEmployees.length === 0 && (
            <div style={{ textAlign: 'center', color: '#ccc', fontSize: 13, padding: '24px 0' }}>No employees found</div>
          )}
        </div>
      </div>

      {/* Right panel — selected employee records */}
      <div style={{ flex: 1, paddingLeft: 20, display: 'flex', flexDirection: 'column' }}>
        {!selectedEmp ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#ccc', fontSize: 14 }}>
            Select an employee to view records
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1e1f3b' }}>{selectedEmp.name}</div>
                {selectedEmp.dept && (
                  <span style={{ ...styles.pill, background: (selectedEmp.color || '#6c63ff') + '20', color: selectedEmp.color || '#6c63ff', marginTop: 4, display: 'inline-block' }}>
                    {selectedEmp.dept}
                  </span>
                )}
              </div>
              <button style={styles.btnPrimary} onClick={() => setAddRecord(true)}>+ Add Record</button>
            </div>

            {/* Summary strip */}
            {empRecords.length > 0 && (
              <div style={{
                fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 7, marginBottom: 14,
                background: summaryAllClear ? '#f0fdf4' : '#fffbeb',
                color: summaryAllClear ? '#15803d' : '#92400e',
                border: `1px solid ${summaryAllClear ? '#bbf7d0' : '#fcd34d'}`,
              }}>
                {empRecords.length} {empRecords.length === 1 ? 'record' : 'records'} —{' '}
                {summaryAllClear ? 'all documents on file' : `${pendingCount} awaiting signed ${pendingCount === 1 ? 'document' : 'documents'}`}
              </div>
            )}

            {/* Records */}
            {empRecords.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, padding: '40px 0' }}>
                No disciplinary records for this employee
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                {empRecords.map(rec => {
                  const typeColor = DISC_COLORS[rec.type] || { bg: '#f1f5f9', color: '#555' }
                  const isExpanded = expandedId === rec.id
                  const complete = recordIsComplete(rec)
                  const uploadOpen = uploadOpenId === rec.id
                  return (
                    <div key={rec.id} style={{ border: '1px solid #e4e6ea', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                      <div style={{ padding: '14px 16px' }}>

                        {/* Top row — type, date, status pill, actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ ...styles.pill, background: typeColor.bg, color: typeColor.color }}>
                            {rec.type}
                          </span>
                          {complete && (
                            <span style={{ ...styles.pill, background: '#dcfce7', color: '#15803d' }}>Docs on file</span>
                          )}
                          <span style={{ fontSize: 12, color: '#888' }}>{rec.date || '—'}</span>
                          {rec.hearingDate && (
                            <span style={{ fontSize: 12, color: '#888' }}>
                              Hearing: {rec.hearingDate}{rec.chairperson ? ` · ${rec.chairperson}` : ''}
                            </span>
                          )}
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                            {rec.attachments?.length > 0 && (
                              <button
                                onClick={() => setAttachmentsRecord(rec)}
                                style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                📎 {rec.attachments.length}
                              </button>
                            )}
                            <button
                              onClick={() => printWarningLetter(selectedEmp, rec, rec.reason || '', settingsData)}
                              style={{
                                ...styles.btnSmall,
                                background: '#fff', border: '1px solid #6c63ff', color: '#6c63ff',
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              🖨 Print
                            </button>
                            <button style={{ ...styles.btnSmall, background: '#f0f2f5', color: '#555' }} onClick={() => setEditRecord(rec)}>Edit</button>
                            <button style={{ ...styles.btnSmall, background: '#fee2e2', color: '#dc2626' }} onClick={() => setDeleteRecord(rec)}>Delete</button>
                          </div>
                        </div>

                        {/* Reason — expandable */}
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                          style={{ fontSize: 13, color: '#333', cursor: rec.reason?.length > 100 ? 'pointer' : 'default', lineHeight: 1.5 }}
                        >
                          <div style={{
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: isExpanded ? 'unset' : 2,
                            WebkitBoxOrient: 'vertical',
                            textOverflow: isExpanded ? 'unset' : 'ellipsis',
                          }}>
                            {rec.reason}
                          </div>
                          {rec.reason?.length > 100 && (
                            <span style={{ fontSize: 11, color: '#6c63ff', marginTop: 2, display: 'inline-block' }}>
                              {isExpanded ? 'Show less' : 'Show more'}
                            </span>
                          )}
                        </div>

                        {/* Outcome */}
                        {rec.outcome && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#555', background: '#f7f8fa', borderRadius: 6, padding: '6px 10px' }}>
                            <strong>Outcome: </strong>{rec.outcome}
                          </div>
                        )}
                      </div>

                      {/* Docs pending banner */}
                      {!complete && (
                        <div style={{
                          borderTop: '1px solid #fcd34d', background: '#fffbeb',
                          padding: '8px 16px', display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap',
                        }}>
                          <span style={{ fontSize: 13, color: '#92400e', flex: 1 }}>
                            Awaiting signed copy — upload document to complete this record
                          </span>
                          {!uploadOpen ? (
                            <button
                              onClick={() => { setUploadOpenId(rec.id); setUploadFile(null) }}
                              style={{
                                flexShrink: 0, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                background: '#fff', border: '1px solid #d97706', color: '#92400e',
                                borderRadius: 6, padding: '4px 10px',
                              }}
                            >
                              Upload
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4, width: '100%' }}>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ fontSize: 12 }}
                                onChange={e => setUploadFile(e.target.files[0] || null)}
                              />
                              <button
                                disabled={!uploadFile || uploading}
                                onClick={() => handleConfirmUpload(rec.id)}
                                style={{
                                  fontSize: 12, fontWeight: 500, cursor: uploadFile && !uploading ? 'pointer' : 'not-allowed',
                                  background: '#d97706', border: 'none', color: '#fff',
                                  borderRadius: 6, padding: '4px 10px', opacity: !uploadFile || uploading ? 0.5 : 1,
                                }}
                              >
                                {uploading ? 'Uploading…' : 'Confirm upload'}
                              </button>
                              <button
                                onClick={() => { setUploadOpenId(null); setUploadFile(null) }}
                                style={{
                                  fontSize: 12, cursor: 'pointer', background: 'none',
                                  border: 'none', color: '#92400e', padding: '4px 6px',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
