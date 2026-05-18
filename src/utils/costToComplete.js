// Unit cost: use component.unitCost from the BOM; override with stockCache avgCost only when > 0.
// Stock availability must never reduce quantities — cost reflects the full BOM requirement.

export function computeJobCost(job, stockCache) {
  const tasks = flattenTasks(job.tasks || [])
  const doneTasks = tasks.filter(t => t.done === true || t.kanbanStatus === 'done')
  const undoneTasks = tasks.filter(t => t.done !== true && t.kanbanStatus !== 'done')

  const componentMap = {}
  for (const task of undoneTasks) {
    for (const comp of task.components || []) {
      const key = comp.itemCode
      if (!key) continue
      if (!componentMap[key]) {
        const cacheAvg = stockCache?.byCode?.[key]?.avgCost
        componentMap[key] = {
          itemCode: key,
          description: comp.itemDescription || comp.description || '',
          unit: comp.unit || '',
          totalQty: 0,
          unitCost: cacheAvg > 0 ? cacheAvg : (comp.unitCost ?? 0),
        }
      }
      componentMap[key].totalQty += (comp.quantity || 0) + (comp.wastageQty || 0)
    }
  }

  const components = Object.values(componentMap).map(c => ({
    ...c,
    totalCost: c.totalQty * c.unitCost,
    status: c.unitCost === 0 ? 'no-cost' : 'costed',
  })).sort((a, b) => b.totalCost - a.totalCost)

  const materialCost = components.reduce((sum, c) => sum + c.totalCost, 0)
  const labourCost = job.labourEstimate || 0

  return {
    jobId: job.id,
    jobTitle: job.title,
    jobColour: job.colour,
    status: job.status,
    materialCost,
    labourCost,
    totalCost: materialCost + labourCost,
    taskCount: tasks.length,
    doneCount: doneTasks.length,
    progressPct: tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0,
    components,
  }
}

function flattenTasks(tasks) {
  return tasks.flatMap(t => [t, ...flattenTasks(t.children || [])])
}

export function formatZAR(amount) {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
