/**
 * Replaceable storage provider for the Dynamic Memory Tree module.
 *
 * The service layer depends on the MemoryRepository interface, never on a
 * concrete implementation. Swap in a real provider (e.g. Supabase) by passing
 * a different repository to the service. There is no direct Supabase
 * dependency here.
 */

import { seedNodes } from "../data/seedData.js";

/**
 * Repository interface contract. Any storage provider must implement these
 * methods. The base class throws so a missing method fails loudly.
 */
export class MemoryRepository {
  getNodes(_patientId) {
    throw new Error("MemoryRepository.getNodes is not implemented");
  }
  getAllNodes() {
    throw new Error("MemoryRepository.getAllNodes is not implemented");
  }
  createNode(_data) {
    throw new Error("MemoryRepository.createNode is not implemented");
  }
  updateNode(_id, _data) {
    throw new Error("MemoryRepository.updateNode is not implemented");
  }
  deleteNode(_id) {
    throw new Error("MemoryRepository.deleteNode is not implemented");
  }
  moveNode(_id, _newParentId) {
    throw new Error("MemoryRepository.moveNode is not implemented");
  }
}

/**
 * Mock / local data provider backed by the seed data. Keeps state in memory
 * so the module works standalone without any backend or external service.
 */
export class MockMemoryRepository extends MemoryRepository {
  constructor(initialNodes = seedNodes) {
    super();
    let loaded = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem("medha_memory_tree_nodes");
        if (stored) {
          loaded = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn("Could not load memory nodes from localStorage:", e);
    }
    let rawNodes = (loaded || initialNodes).map((node) => ({ ...node }));
    // Sanitize any legacy hardcoded "Biren Saikia" root node title from old localStorage
    rawNodes = rawNodes.map((n) => {
      if (n.nodeType === "root" && n.title === "Biren Saikia") {
        return { ...n, title: "Patient" };
      }
      return n;
    });
    this.nodes = rawNodes;
    this.nextId = this.computeNextId();
  }

  saveToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "medha_memory_tree_nodes",
          JSON.stringify(this.nodes)
        );
      }
    } catch (e) {
      console.warn("Could not save memory nodes to localStorage:", e);
    }
  }

  computeNextId() {
    let max = 0;
    for (const node of this.nodes) {
      const match = /-(\d+)$/.exec(node.id);
      if (match) max = Math.max(max, Number(match[1]));
    }
    return max + 1;
  }

  generateId() {
    const id = `node-${this.nextId}`;
    this.nextId += 1;
    return id;
  }

  getNodes(patientId) {
    const isDefaultPatient =
      patientId === "PAT-7201-BIREN" || patientId === "patient-biren";
    const matching = this.nodes.filter((node) =>
      isDefaultPatient
        ? node.patientId === "PAT-7201-BIREN" ||
          node.patientId === "patient-biren"
        : node.patientId === patientId,
    );

    // If there's an auto-generated empty root alongside seed root, prefer seed root
    const roots = matching.filter((n) => n.nodeType === "root");
    if (roots.length > 1) {
      const primaryRoot = roots.find((r) => r.id === "biren-root") || roots[0];
      return matching
        .filter((n) => n.nodeType !== "root" || n.id === primaryRoot.id)
        .map((node) => ({ ...node }));
    }

    return matching.map((node) => ({ ...node }));
  }

  getAllNodes() {
    return this.nodes.map((node) => ({ ...node }));
  }

  createNode(data) {
    const now = new Date().toISOString();
    const node = {
      id: this.generateId(),
      parentId: data.parentId ?? null,
      nodeType: data.nodeType ?? "memory",
      title: data.title ?? "",
      description: data.description ?? "",
      imageUrl: data.imageUrl ?? null,
      icon: data.icon ?? null,
      metadata: data.metadata ?? {},
      importance: data.importance ?? "medium",
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    this.nodes.push(node);
    this.saveToStorage();
    return { ...node };
  }

  updateNode(id, data) {
    const index = this.nodes.findIndex((node) => node.id === id);
    if (index === -1) return null;
    const updated = {
      ...this.nodes[index],
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.nodes[index] = updated;
    this.saveToStorage();
    return { ...updated };
  }

  deleteNode(id) {
    const before = this.nodes.length;
    this.nodes = this.nodes.filter((node) => node.id !== id);
    if (this.nodes.length < before) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  moveNode(id, newParentId) {
    const index = this.nodes.findIndex((node) => node.id === id);
    if (index === -1) return null;
    const updated = {
      ...this.nodes[index],
      parentId: newParentId ?? null,
      updatedAt: new Date().toISOString(),
    };
    this.nodes[index] = updated;
    this.saveToStorage();
    return { ...updated };
  }
}
