import { styles } from '../../utils/hrStyles'

const LEAVE_TYPES = ['Annual', 'Sick', 'Family Responsibility', 'Unpaid']
const LEAVE_COLORS = { Annual: '#6c63ff', Sick: '#ef4444', 'Family Responsibility': '#f59e0b', Unpaid: '#9ca3af' }

export default function LeaveFormFields({
  employee, employees, employeeId, setEmployeeId,
  leaveType, setLeaveType, balances, leaveLimits,
  startDate, endDate, days, wouldExceed, monFriCount,
  reason, setReason, pendingFiles, setPendingFiles, children,
}) {
  const currentBal = balances?.[leaveType] ?? null
  const limit = leaveLimits[leaveType] ?? null

  return (
    <>
      {!employee && (
        <>
          <label style={styles.label}>Employee</label>
          <select style={styles.input} value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </>
      )}
      {employee && (
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: '#1e1f3b' }}>{employee.name}</div>
      )}

      <label style={styles.label}>Leave Type</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {LEAVE_TYPES.map(t => {
          const active = leaveType === t
          const col = LEAVE_COLORS[t]
          const bal = balances?.[t]
          const exhausted = bal && leaveLimits[t] != null && bal.remaining === 0
          return (
            <button
              key={t}
              onClick={() => !exhausted && setLeaveType(t)}
              disabled={exhausted}
              title={exhausted ? `No ${t} days remaining` : undefined}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: exhausted ? 'not-allowed' : 'pointer',
                border: `1.5px solid ${active ? col : '#e4e6ea'}`,
                background: active ? col + '18' : '#fff',
                color: active ? col : exhausted ? '#ccc' : '#888',
                opacity: exhausted ? 0.55 : 1,
              }}
            >
              {t}{bal && leaveLimits[t] != null ? ` (${bal.remaining}d)` : ''}
            </button>
          )
        })}
      </div>

      {currentBal && (
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
          Balance: <strong style={{ color: currentBal.remaining === 0 ? '#dc2626' : '#1e1f3b' }}>
            {limit !== null ? `${currentBal.remaining} of ${limit} days remaining` : `${currentBal.used} days taken`}
          </strong>
        </div>
      )}

      <label style={styles.label}>Select dates — click start then end</label>
      {children}

      <div style={{ background: wouldExceed ? '#fff3f3' : '#f5f3ff', border: `1px solid ${wouldExceed ? '#fca5a5' : '#d8d4ff'}`, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, visibility: days > 0 ? 'visible' : 'hidden' }}>
        <strong>{days} working day{days !== 1 ? 's' : ''}</strong>
        {' '}{startDate} → {endDate}
        {wouldExceed && <div style={{ color: '#dc2626', marginTop: 4 }}>⚠ Insufficient balance</div>}
        {monFriCount >= 2 && (
          <div style={{ color: '#d97706', marginTop: 4 }}>⚠ {monFriCount} Monday/Friday sick days in the last 3 weeks</div>
        )}
      </div>

      <label style={styles.label}>Reason (optional)</label>
      <textarea
        style={{ ...styles.input, resize: 'vertical', minHeight: 60 }}
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Brief reason…"
      />

      <label style={styles.label}>Supporting documents (optional)</label>
      <div
        style={{ border: '2px dashed #e4e6ea', borderRadius: 8, padding: '14px 10px', textAlign: 'center', marginBottom: 12, cursor: 'pointer', fontSize: 12, color: '#aaa' }}
        onClick={() => document.getElementById('leave-file-input').click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); setPendingFiles(f => [...f, ...Array.from(e.dataTransfer.files)]) }}
      >
        {pendingFiles.length === 0
          ? 'Click or drag files here (sick notes, etc.)'
          : pendingFiles.map((f, i) => <div key={i} style={{ color: '#6c63ff' }}>{f.name}</div>)
        }
      </div>
      <input id="leave-file-input" type="file" multiple style={{ display: 'none' }} onChange={e => setPendingFiles(f => [...f, ...Array.from(e.target.files)])} />
    </>
  )
}
