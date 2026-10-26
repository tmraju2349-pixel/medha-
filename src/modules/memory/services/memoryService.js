/**
 * Service layer for the Dynamic Memory Tree module.
 *
 * The UI talks only to this service. It validates patientId scoping and
 * parentId relationships, then delegates storage to the repository. The
 * repository is replaceable (defaults to the mock/local provider).
 */

import { MockMemoryRepository } from "./memoryRepository.js";
import { collectDescendantIds, getCategoryPath } from "./memoryTreeBuilder.js";

export class MemoryService {
  constructor(repository = new MockMemoryRepository()) {
    this.repository = repository;
  }

  /**
   * Return all nodes for a single patient. Scoped strictly to patientId so a
   * caller can never see another patient's nodes.
   */
  getNodes(patientId) {
    if (!patientId) return [];
    return this.repository.getNodes(patientId);
  }

  /**
   * Create a node. Validates that the parent (if any) belongs to the same
   * patient and exists.
   */
  createNode(data) {
    if (!data || !data.patientId) {
      throw new Error("createNode requires a patientId");
    }
    if (data.parentId != null) {
      this.assertValidParent(data.parentId, data.patientId);
    }
    return this.repository.createNode(data);
  }

  /**
   * Update a node's fields. Re-validates the parent relationship if the
   * parentId is being changed.
   */
  updateNode(id, data) {
    const existing = this.findNode(id);
    if (!existing) throw new Error("Node not found");

    const nextParentId =
      data.parentId !== undefined ? data.parentId : existing.parentId;
    if (nextParentId != null) {
      this.assertValidParent(nextParentId, existing.patientId, id);
    }
    return this.repository.updateNode(id, data);
  }

  /**
   * Delete a node together with all of its descendants.
   */
  deleteNode(id) {
    const existing = this.findNode(id);
    if (!existing) throw new Error("Node not found");
    const idsToDelete = [
      id,
      ...collectDescendantIds(this.repository.getNodes(existing.patientId), id),
    ];
    for (const nodeId of idsToDelete) {
      this.repository.deleteNode(nodeId);
    }
    return true;
  }

  /**
   * Move a node under a new parent. Validates that the new parent is not the
   * node itself, not one of its descendants (circular), and belongs to the
   * same patient.
   */
  moveNode(id, newParentId) {
    const existing = this.findNode(id);
    if (!existing) throw new Error("Node not found");

    if (newParentId != null) {
      if (newParentId === id) {
        throw new Error("A node cannot be its own parent");
      }
      this.assertValidParent(newParentId, existing.patientId, id);
      const descendants = collectDescendantIds(
        this.repository.getNodes(existing.patientId),
        id,
      );
      if (descendants.includes(newParentId)) {
        throw new Error("Cannot move a node under one of its own descendants");
      }
    }
    return this.repository.moveNode(id, newParentId);
  }

  /**
   * Expose generic memory objects for MEDHA's cognitive games. Only memory
   * nodes are returned, each with a category path (breadcrumb) for context.
   *
   * options: { categoryPath?: string, limit?: number }
   */
  getMemoryGameItems(patientId, options = {}) {
    const nodes = this.getNodes(patientId);
    const memoryNodes = nodes.filter((node) => node.nodeType === "memory");

    const items = memoryNodes.map((node) => ({
      id: node.id,
      title: node.title,
      imageUrl: node.imageUrl,
      description: node.description,
      metadata: node.metadata ?? {},
      categoryPath: getCategoryPath(nodes, node.id).map((n) => n.title),
    }));

    let result = items;
    if (options.categoryPath) {
      const target = options.categoryPath;
      result = result.filter((item) =>
        item.categoryPath.some((segment) => segment === target),
      );
    }
    if (typeof options.limit === "number" && options.limit > 0) {
      result = result.slice(0, options.limit);
    }
    return result;
  }

  findNode(id) {
    return this.repository.getAllNodes().find((node) => node.id === id) ?? null;
  }

  /**
   * Validate that a parent exists and belongs to the same patient, and is not
   * the node itself (when editing/moving an existing node).
   */
  assertValidParent(parentId, patientId, selfId) {
    if (selfId != null && parentId === selfId) {
      throw new Error("A node cannot be its own parent");
    }
    const parent = this.findNode(parentId);
    if (!parent) {
      throw new Error("Parent node not found");
    }
    if (parent.patientId !== patientId) {
      throw new Error("Cannot attach a node to a parent from another patient");
    }
  }
}

// Shared singleton instance used by the module's public API.
export const memoryService = new MemoryService();
