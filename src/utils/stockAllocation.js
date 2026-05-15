function* walkTasks(tasks) {
  for (const task of tasks) {
    yield task
    if (task.children?.length) yield* walkTasks(task.children)
  }
}

export function computeGlobalAllocations(allOpenJobs) {
  const totals = new Map()
  for (const job of allOpenJobs) {
    if (job.status === 'done') continue
    for (const task of walkTasks(job.tasks || [])) {
      if (task.done) continue
      for (const comp of (task.components || [])) {
        if (comp.itemCode) {
          totals.set(comp.itemCode, (totals.get(comp.itemCode) || 0) + (comp.quantity || 0))
        }
      }
    }
  }
  return totals
}

export function checkTaskAllocation(task, stockByCode, globalAllocations) {
  return (task.components || []).map(comp => {
    const cached = stockByCode[comp.itemCode?.toUpperCase()]
    const totalAllocated = globalAllocations.get(comp.itemCode) || 0
    if (!cached) {
      return {
        itemCode: comp.itemCode,
        required: comp.quantity || 0,
        onHand: null,
        totalAllocatedAcrossJobs: totalAllocated,
        available: null,
        status: 'unknown',
      }
    }
    const onHand = cached.onHand
    const available = onHand - totalAllocated
    const required = comp.quantity || 0
    return {
      itemCode: comp.itemCode,
      required,
      onHand,
      totalAllocatedAcrossJobs: totalAllocated,
      available,
      status: available >= required ? 'ok' : available <= 0 ? 'out' : 'short',
    }
  })
}

export function checkJobAllocation(job, stockByCode, globalAllocations) {
  const result = {}
  for (const task of walkTasks(job.tasks || [])) {
    if (!task.components?.length) continue
    const components = checkTaskAllocation(task, stockByCode, globalAllocations)
    result[task.id] = {
      components,
      summary: {
        ok:      components.filter(c => c.status === 'ok').length,
        short:   components.filter(c => c.status === 'short').length,
        out:     components.filter(c => c.status === 'out').length,
        unknown: components.filter(c => c.status === 'unknown').length,
      },
    }
  }
  return result
}
