import { describe, expect, it } from "vitest";
import { buildTree, getCategoryPath } from "../services/memoryTreeBuilder.js";
import { seedNodes, seedPatients } from "./seedData.js";

/**
 * Seed-data contract tests. The Memory Vault ships with seed data so every
 * tree option can be exercised: multiple patients, each owning a fully
 * distinct tree, with nodes nested at several depths. These tests pin the
 * structure the rest of the module (tree builder, service scoping, category
 * paths) depends on.
 */

describe("seed data structure", () => {
  it("spans at least two patients", () => {
    const patientIds = new Set(seedNodes.map((n) => n.patientId));
    expect(patientIds.size).toBeGreaterThanOrEqual(2);
  });

  it("declares a matching patient for every patientId used by nodes", () => {
    const declared = new Set(seedPatients.map((p) => p.id));
    for (const node of seedNodes) {
      expect(declared.has(node.patientId)).toBe(true);
    }
  });

  it("has exactly one root node per patient", () => {
    const patientIds = new Set(seedNodes.map((n) => n.patientId));
    for (const patientId of patientIds) {
      const roots = seedNodes.filter(
        (n) => n.patientId === patientId && n.nodeType === "root",
      );
      expect(roots).toHaveLength(1);
    }
  });

  it("nests nodes at multiple depths for each patient", () => {
    const patientIds = new Set(seedNodes.map((n) => n.patientId));
    for (const patientId of patientIds) {
      const patientNodes = seedNodes.filter((n) => n.patientId === patientId);
      const root = patientNodes.find((n) => n.nodeType === "root");
      const tree = buildTree(patientNodes, root.id);

      // Walk the tree and record the maximum depth reached.
      let maxDepth = 0;
      const walk = (node, depth) => {
        maxDepth = Math.max(maxDepth, depth);
        for (const child of node.children ?? []) walk(child, depth + 1);
      };
      walk(tree, 0);

      // Every patient's tree must reach at least depth 2 (root -> category -> memory).
      expect(maxDepth).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps each patient's tree fully distinct (no shared node ids)", () => {
    const byPatient = new Map();
    for (const node of seedNodes) {
      const list = byPatient.get(node.patientId) ?? [];
      list.push(node.id);
      byPatient.set(node.patientId, list);
    }
    const allIds = [...byPatient.values()].flat();
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("seed data richness (images, icons, descriptions, metadata, importance)", () => {
  it("includes memory nodes with imageUrl photos for both patients", () => {
    for (const patientId of ["patient-ravi", "patient-meera"]) {
      const withImage = seedNodes.filter(
        (n) => n.patientId === patientId && n.imageUrl,
      );
      expect(withImage.length).toBeGreaterThan(0);
      for (const node of withImage) {
        expect(node.imageUrl).toMatch(/^\/assets\/generated\/.+\.jpg$/);
      }
    }
  });

  it("gives every node an icon and a description", () => {
    for (const node of seedNodes) {
      expect(node.icon).toBeTruthy();
      expect(node.description).toBeTruthy();
    }
  });

  it("gives memory nodes metadata and covers all three importance levels", () => {
    const memories = seedNodes.filter((n) => n.nodeType === "memory");
    expect(memories.length).toBeGreaterThan(0);
    for (const node of memories) {
      expect(node.metadata).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(node.importance);
    }
    // Every importance level is represented so each UI badge state has data.
    const levels = new Set(memories.map((n) => n.importance));
    expect(levels).toEqual(new Set(["high", "medium", "low"]));
  });

  it("provides rich metadata across both patients", () => {
    for (const patientId of ["patient-ravi", "patient-meera"]) {
      const withMetadata = seedNodes.filter(
        (n) =>
          n.patientId === patientId && Object.keys(n.metadata ?? {}).length > 0,
      );
      expect(withMetadata.length).toBeGreaterThan(0);
    }
  });
});

describe("seed data drives multi-depth behavior", () => {
  it("builds a deep tree for Ravi down to the Important Events memories", () => {
    const ravi = seedNodes.filter((n) => n.patientId === "patient-ravi");
    const tree = buildTree(ravi, "ravi-root");
    const family = tree.children.find((c) => c.id === "ravi-family");
    const rajesh = family.children.find((c) => c.id === "ravi-rajesh");
    const events = rajesh.children.find((c) => c.id === "ravi-rajesh-events");
    expect(events.children.map((c) => c.title)).toEqual(
      expect.arrayContaining(["Wedding", "Birthday"]),
    );
  });

  it("computes a full category path for a deeply nested node", () => {
    const path = getCategoryPath(seedNodes, "ravi-rajesh-wedding");
    expect(path.map((n) => n.title)).toEqual([
      "Ravi",
      "Family",
      "Rajesh",
      "Important Events",
      "Wedding",
    ]);
  });

  it("builds a distinct tree for Meera with its own branches", () => {
    const meera = seedNodes.filter((n) => n.patientId === "patient-meera");
    const tree = buildTree(meera, "meera-root");
    const fruits = tree.children.find((c) => c.id === "meera-fruits");
    expect(fruits.children.map((c) => c.title)).toEqual(
      expect.arrayContaining(["Mango", "Banana"]),
    );
    // Ravi's branches must not leak into Meera's tree.
    expect(tree.children.map((c) => c.id)).not.toContain("ravi-family");
  });
});
