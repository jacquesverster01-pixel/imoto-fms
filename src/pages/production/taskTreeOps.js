export function findNodeById(tasks, id) {
  for (const task of tasks) {
    if (task.id === id) return task
    const found = findNodeById(task.children || [], id)
    if (found) return found
  }
  return null
}

export function findParentId(tasks, id) {
  for (const task of tasks) {
    if ((task.children || []).some(c => c.id === id)) return task.id
    const found = findParentId(task.children || [], id)
    if (found !== null) return found
  }
  return null
}

// Path-clone: returns a new array only along the path to the updated node.
// If id is not found, returns the original tasks reference unchanged.
export function updateNodeById(tasks, id, updater) {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task.id === id) {
      const result = [...tasks]
      result[i] = updater(task)
      return result
    }
    const children = task.children || []
    if (children.length > 0) {
      const newChildren = updateNodeById(children, id, updater)
      if (newChildren !== children) {
        const result = [...tasks]
        result[i] = { ...task, children: newChildren }
        return result
      }
    }
  }
  return tasks
}

export function removeNodeById(tasks, id) {
  const filtered = tasks.filter(t => t.id !== id)
  if (filtered.length < tasks.length) return filtered
  let changed = false
  const result = tasks.map(task => {
    const children = task.children || []
    if (children.length === 0) return task
    const newChildren = removeNodeById(children, id)
    if (newChildren !== children) { changed = true; return { ...task, children: newChildren } }
    return task
  })
  return changed ? result : tasks
}

export function appendChildTo(tasks, parentId, node) {
  if (parentId === null) return [...tasks, node]
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task.id === parentId) {
      const result = [...tasks]
      result[i] = { ...task, children: [...(task.children || []), node] }
      return result
    }
    const children = task.children || []
    if (children.length > 0) {
      const newChildren = appendChildTo(children, parentId, node)
      if (newChildren !== children) {
        const result = [...tasks]
        result[i] = { ...task, children: newChildren }
        return result
      }
    }
  }
  return tasks
}

export function flattenTree(tasks) {
  const out = []
  function walk(nodes) {
    for (const node of nodes) {
      out.push(node)
      if (node.children && node.children.length > 0) walk(node.children)
    }
  }
  walk(tasks)
  return out
}

// Refuses move if newParentId is id itself or any descendant of id (would create cycle).
export function moveNodeTo(tasks, id, newParentId) {
  if (newParentId === id) return tasks
  const node = findNodeById(tasks, id)
  if (!node) return tasks
  if (newParentId !== null) {
    const subtree = flattenTree(node.children || [])
    if (subtree.some(n => n.id === newParentId)) return tasks
  }
  const removed = removeNodeById(tasks, id)
  return appendChildTo(removed, newParentId, node)
}

export function walkTree(tasks, fn, depth = 0, parentId = null) {
  for (const node of tasks) {
    fn(node, depth, parentId)
    if (node.children && node.children.length > 0) walkTree(node.children, fn, depth + 1, node.id)
  }
}

// A row is hidden if any ancestor is collapsed.
// Operates on pre-order flatRows (as produced by flattenTasksForDisplay).
export function filterVisibleRows(flatRows, collapsed) {
  const out = []
  const collapsedAncestors = new Set()
  for (const row of flatRows) {
    for (const id of [...collapsedAncestors]) {
      const ancestorRow = flatRows.find(r => r.task.id === id)
      if (ancestorRow && row.depth <= ancestorRow.depth) collapsedAncestors.delete(id)
    }
    if (collapsedAncestors.size > 0) continue
    out.push(row)
    if (row.isParent && collapsed[row.task.id]) collapsedAncestors.add(row.task.id)
  }
  return out
}
