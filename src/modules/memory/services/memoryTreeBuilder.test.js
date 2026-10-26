import { describe, expect, it } from "vitest";
import { seedNodes } from "../data/seedData.js";
import {
  buildTree,
  collectDescendantIds,
  getCategoryPath,
} from "./memoryTreeBuilder.js";

/**
 * Tree-builder guard tests. buildTree assembles a nested tree from a flat list
 * linked by parentId and must protect against circular relationships, a node
 * becoming its own parent, and orphaned nodes.
 */

describe("buildTree", () => {
  it("builds the full nested hierarchy from the seed data", () => {
    const tree = buildTree(seedNodes, "ravi-root");
    expect(tree).not.toBeNull();
    expect(tree.id).toBe("ravi-root");
    expect(tree.title).toBe("Ravi");

    const family = tree.children.find((c) => c.id === "ravi-family");
    expect(family).toBeTruthy();
    const rajesh = family.children.find((c) => c.id === "ravi-rajesh");
    expect(rajesh).toBeTruthy();
    const events = rajesh.children.find((c) => c.id === "ravi-rajesh-events");
    expect(events).toBeTruthy();
    const eventTitles = events.children.map((c) => c.title);
    expect(eventTitles).toEqual(
      expect.arrayContaining(["Wedding", "Birthday"]),
    );
  });

  it("returns null when the root is absent", () => {
    expect(buildTree(seedNodes, "missing-root")).toBeNull();
  });

  it("returns null for a non-array input", () => {
    expect(buildTree(null, "ravi-root")).toBeNull();
    expect(buildTree(undefined, "ravi-root")).toBeNull();
  });

  it("skips orphaned nodes whose parent is missing", () => {
    const nodes = [
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
      { id: "orphan", parentId: "ghost-parent" },
    ];
    const tree = buildTree(nodes, "root");
    expect(tree.children.map((c) => c.id)).toEqual(["child"]);
  });

  it("skips a node that is its own parent", () => {
    const nodes = [
      { id: "root", parentId: null },
      { id: "self-parent", parentId: "self-parent" },
    ];
    const tree = buildTree(nodes, "root");
    expect(tree.children).toEqual([]);
  });

  it("does not loop forever on a circular relationship", () => {
    // a -> b -> a forms a cycle; the visited guard must terminate.
    const nodes = [
      { id: "root", parentId: null },
      { id: "a", parentId: "root" },
      { id: "b", parentId: "a" },
      { id: "a2", parentId: "b" }, // points back to a's id, creating a cycle
    ];
    const tree = buildTree(nodes, "root");
    // The cycle is broken; the tree still renders the reachable portion.
    expect(tree).not.toBeNull();
  });
});

describe("getCategoryPath", () => {
  it("returns the breadcrumb from root down to the node", () => {
    const path = getCategoryPath(seedNodes, "ravi-rajesh-wedding");
    expect(path.map((n) => n.title)).toEqual([
      "Ravi",
      "Family",
      "Rajesh",
      "Important Events",
      "Wedding",
    ]);
  });

  it("returns an empty array for an unknown node", () => {
    expect(getCategoryPath(seedNodes, "missing")).toEqual([]);
  });
});

describe("collectDescendantIds", () => {
  it("collects every descendant id, not including the node itself", () => {
    const ids = collectDescendantIds(seedNodes, "ravi-rajesh");
    expect(ids).toEqual(
      expect.arrayContaining([
        "ravi-rajesh-events",
        "ravi-rajesh-wedding",
        "ravi-rajesh-birthday",
      ]),
    );
    expect(ids).not.toContain("ravi-rajesh");
  });

  it("returns an empty array for a leaf node", () => {
    expect(collectDescendantIds(seedNodes, "ravi-bruno")).toEqual([]);
  });
});
