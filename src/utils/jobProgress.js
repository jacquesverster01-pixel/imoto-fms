export function countAllTasks(tasks) {
  if (!tasks) return 0
  return tasks.reduce((sum, t) => sum + 1 + countAllTasks(t.children), 0)
}

export function countDoneTasks(tasks) {
  if (!tasks) return 0
  return tasks.reduce((sum, t) => sum + (t.done ? 1 : 0) + countDoneTasks(t.children), 0)
}

export function computeJobPct(job) {
  const total = countAllTasks(job.tasks)
  if (total === 0) return 0
  return Math.round((countDoneTasks(job.tasks) / total) * 100)
}
