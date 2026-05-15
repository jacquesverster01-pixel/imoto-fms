// Auto clock-out logic extracted from the server.js setInterval so it can be unit-tested.
// readData/writeData are injected so tests can point them at a temp directory.
// now is injectable so tests can control the current time.
export function runAutoClockOut(readData, writeData, now = new Date()) {
  try {
    const settings = readData('settings.json')
    const aco = settings?.autoClockOut
    if (!aco?.enabled || !aco.clockOutTime || !aco.deadlineTime) return

    // Compute SAST (UTC+2) from the injected clock
    const sast = new Date(now.getTime() + 2 * 3600 * 1000)
    const hh = String(sast.getUTCHours()).padStart(2, '0')
    const mm = String(sast.getUTCMinutes()).padStart(2, '0')
    const nowHHMM = `${hh}:${mm}`

    if (nowHHMM < aco.deadlineTime) return

    const todayStr = sast.toISOString().split('T')[0] // SAST date, e.g. "2026-05-15"

    const timelog   = readData('timelog.json')
    const employees = readData('employees.json') || []

    // Filter to entries that occurred today in SAST
    const todayEntries = timelog.filter(e => {
      const entrySast = new Date(new Date(e.timestamp).getTime() + 2 * 3600 * 1000)
      return entrySast.toISOString().startsWith(todayStr)
    })

    // Last entry per employee today
    todayEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const lastByEmp = {}
    for (const e of todayEntries) {
      lastByEmp[e.employeeId] = e
    }

    // Build clock-out UTC timestamp: today (SAST) at clockOutTime
    const [outH, outM] = aco.clockOutTime.split(':').map(Number)
    const clockOutUtc = new Date(Date.UTC(
      sast.getUTCFullYear(), sast.getUTCMonth(), sast.getUTCDate(),
      outH - 2, outM, 0, 0  // SAST = UTC+2, so subtract 2h to get UTC
    ))

    const toClockOut = Object.values(lastByEmp).filter(e => e.type === 'in')
    if (!toClockOut.length) return

    let count = 0
    for (const entry of toClockOut) {
      if (clockOutUtc <= new Date(entry.timestamp)) continue // clock-out must be after clock-in
      const emp = employees.find(e => e.id === entry.employeeId)
      timelog.push({
        id: `TL${now.getTime()}_${entry.employeeId}`,
        employeeId: entry.employeeId,
        name: entry.name || emp?.name || entry.employeeId,
        dept: entry.dept || emp?.dept || '',
        type: 'out',
        source: 'auto',
        timestamp: clockOutUtc.toISOString(),
      })
      count++
    }
    if (count === 0) return
    writeData('timelog.json', timelog)
    console.log(`[Auto clock-out] Clocked out ${count} employee(s) at ${aco.clockOutTime}`)
  } catch (err) {
    console.error('[Auto clock-out] Error:', err.message)
  }
}
