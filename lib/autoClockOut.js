// Auto clock-out logic extracted from the server.js setInterval so it can be unit-tested.
// readData/writeData are injected so tests can point them at a temp directory.
// now is injectable so tests can control the current time.
export function runAutoClockOut(readData, writeData, now = new Date()) {
  try {
    const settings = readData('settings.json')
    const aco = settings?.autoClockOut
    if (!aco?.enabled || !aco.time) return

    // Compute SAST (UTC+2) from the injected clock
    const sast = new Date(now.getTime() + 2 * 3600 * 1000)
    const hh = String(sast.getUTCHours()).padStart(2, '0')
    const mm = String(sast.getUTCMinutes()).padStart(2, '0')
    if (`${hh}:${mm}` !== aco.time) return

    const timelog   = readData('timelog.json')
    const employees = readData('employees.json') || []

    const lastByEmp = {}
    for (const e of timelog) {
      if (!lastByEmp[e.employeeId] || new Date(e.timestamp) > new Date(lastByEmp[e.employeeId].timestamp)) {
        lastByEmp[e.employeeId] = e
      }
    }
    const toClockOut = Object.values(lastByEmp).filter(e => e.type === 'in')
    if (!toClockOut.length) return

    const nowIso = now.toISOString()
    for (const entry of toClockOut) {
      const emp = employees.find(e => e.id === entry.employeeId)
      timelog.push({
        id: `TL${now.getTime()}_${entry.employeeId}`,
        employeeId: entry.employeeId,
        name: entry.name || emp?.name || entry.employeeId,
        dept: entry.dept || emp?.dept || '',
        type: 'out',
        source: 'auto',
        timestamp: nowIso,
      })
    }
    writeData('timelog.json', timelog)
    console.log(`[Auto clock-out] Clocked out ${toClockOut.length} employee(s) at ${aco.time}`)
  } catch (err) {
    console.error('[Auto clock-out] Error:', err.message)
  }
}
