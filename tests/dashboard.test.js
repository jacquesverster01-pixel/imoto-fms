import { describe, it, expect } from '@jest/globals'
import { calcProductionStats } from '../lib/dashboardStats.js'

// Pin dates so tests are deterministic regardless of when they run.
const TODAY    = '2026-04-21'
const MONTH    = '2026-04'
const LAST_MON = '2026-03'

describe('dashboard production stats', () => {
  it('2a — done+completedDate this month → completedThisMonth=1, only non-done/cancelled → activeJobs=1', () => {
    const jobs = [
      { id: 'j1', status: 'done',        completedDate: '2026-04-15' },
      { id: 'j2', status: 'in_progress', dueDate: '2026-04-30'       },
      { id: 'j3', status: 'cancelled'                                 },
    ]

    const { completedThisMonth, activeJobsCount } = calcProductionStats(jobs, TODAY, MONTH)

    expect(completedThisMonth).toBe(1)
    expect(activeJobsCount).toBe(1)  // only j2 — j1 is 'done', j3 is 'cancelled'
  })

  it('2b — regression: status "done" (canonical Gantt string) is counted as complete, not active', () => {
    const jobs = [
      { id: 'j1', status: 'done',     completedDate: '2026-04-10' },  // canonical string
      { id: 'j2', status: 'complete', completedDate: '2026-04-10' },  // OLD/wrong string
    ]

    const { completedThisMonth, activeJobsCount } = calcProductionStats(jobs, TODAY, MONTH)

    expect(completedThisMonth).toBe(1)   // only 'done' counts
    // 'complete' is not 'done' and not 'cancelled' → treated as active
    expect(activeJobsCount).toBe(1)
  })
})
