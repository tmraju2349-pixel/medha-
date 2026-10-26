/**
 * Generic recursive tree builder for the Dynamic Memory Tree module.
 *
 * Assembles a nested tree from a flat list of nodes linked by parentId.
 * Guards against:
 *   - circular relationships (a node that is its own ancestor)
 *   - a node becoming its own parent
 *   - orphaned nodes (a node whose parent is missing from the list)
 *
 * Cross-patient access is prevented upstream by the service layer, which only
 * ever passes a single patient's nodes into this builder.
 */

/**
 * Build a nested tree rooted at rootId from a flat list of nodes.
 * Returns the root node with a `children` array, or null if the root is absent.
 * Supports unlimited depth.
 */
export function buildTree(nodes, rootId) {
  if (!Array.isArray(nodes)) return null;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const root = byId.get(rootId);
  if (!root) return null;

  // Index children by parent id, skipping orphans and self-parents.
  const childrenByParent = new Map();
  for (const node of nodes) {
    if (node.parentId == null) continue;
    if (node.parentId === node.id) continue; // self-parent guard
    if (!byId.has(node.parentId)) continue; // orphan: parent missing
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  const visited = new Set();

  const attach = (node) => {
    if (visited.has(node.id)) return null; // circular guard
    visited.add(node.id);
    const children = (childrenByParent.get(node.id) ?? [])
      .map(attach)
      .filter(Boolean);
    return { ...node, children };
  };

  return attach(root);
}

/**
 * Compute the category path (breadcrumb) for a node: an ordered array of nodes
 * from the root down to (and including) the given node.
 */
export function getCategoryPath(nodes, nodeId) {
  if (!Array.isArray(nodes)) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path = [];
  const seen = new Set();
  let current = byId.get(nodeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId != null ? byId.get(current.parentId) : null;
  }
  return path;
}

/**
 * Collect the ids of every descendant of nodeId (not including nodeId itself).
 * Used to delete a node together with its whole subtree.
 */
export function collectDescendantIds(nodes, nodeId) {
  if (!Array.isArray(nodes)) return [];
  const childrenByParent = new Map();
  for (const node of nodes) {
    if (node.parentId == null) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node.id);
    childrenByParent.set(node.parentId, list);
  }
  const result = [];
  const stack = [nodeId];
  while (stack.length > 0) {
    const id = stack.pop();
    for (const childId of childrenByParent.get(id) ?? []) {
      result.push(childId);
      stack.push(childId);
    }
  }
  return result;
}
