// Pure production-stats calculation extracted from routes/dashboard.js for testability.
// Accepts the jobs array plus pre-computed date strings so tests can pin the clock.
export function calcProductionStats(jobs, todayStr, monthStr) {
  const activeJobs         = jobs.filter(j => j.status !== 'done' && j.status !== 'cancelled')
  const overdueJobs        = activeJobs.filter(j => j.due && j.due < todayStr).length
  const completedThisMonth = jobs.filter(j =>
    j.status === 'done' && j.completedDate && j.completedDate.startsWith(monthStr)
  ).length
  return { activeJobs, activeJobsCount: activeJobs.length, overdueJobs, completedThisMonth }
}
