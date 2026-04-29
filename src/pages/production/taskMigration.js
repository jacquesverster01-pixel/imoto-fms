export function migrateTasksSchema(tasks) {
  return tasks.map(migrateTask)
}

function migrateTask(t) {
  const base = {
    components: t.components ?? [],
    itemCode: 'itemCode' in t ? t.itemCode : null,
    department: 'department' in t ? t.department : null,
    kanbanStatus: t.kanbanStatus ?? 'todo',
    dependsOnAssembly: t.dependsOnAssembly ?? null,
  }

  if (Array.isArray(t.children)) {
    return { ...t, ...base, children: t.children.map(migrateTask) }
  }

  if (Array.isArray(t.subTasks)) {
    const { subTasks, ...rest } = t
    return { ...rest, ...base, children: subTasks.map(migrateTask) }
  }

  return { ...t, ...base, children: [] }
}
