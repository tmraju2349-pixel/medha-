import { describe, expect, it } from "vitest";
import { seedNodes } from "../data/seedData.js";
import { MockMemoryRepository } from "./memoryRepository.js";
import { MemoryService } from "./memoryService.js";

/**
 * Service-layer contract tests. The UI talks only to this service, which
 * validates patientId scoping and parent relationships before delegating to
 * the (replaceable) repository. These tests exercise the real service against
 * the mock/local repository seeded with the module's seed data.
 */

function makeService() {
  return new MemoryService(new MockMemoryRepository(seedNodes));
}

describe("MemoryService.getNodes", () => {
  it("returns only the requested patient's nodes", () => {
    const service = makeService();
    const ravi = service.getNodes("patient-ravi");
    const meera = service.getNodes("patient-meera");

    expect(ravi.length).toBeGreaterThan(0);
    expect(meera.length).toBeGreaterThan(0);
    expect(ravi.every((n) => n.patientId === "patient-ravi")).toBe(true);
    expect(meera.every((n) => n.patientId === "patient-meera")).toBe(true);
  });

  it("returns an empty array for an unknown or missing patientId", () => {
    const service = makeService();
    expect(service.getNodes("patient-unknown")).toEqual([]);
    expect(service.getNodes(null)).toEqual([]);
    expect(service.getNodes(undefined)).toEqual([]);
  });
});

describe("MemoryService.createNode", () => {
  it("requires a patientId", () => {
    const service = makeService();
    expect(() => service.createNode({ title: "No patient" })).toThrow(
      /patientId/,
    );
  });

  it("rejects a parent that belongs to another patient", () => {
    const service = makeService();
    expect(() =>
      service.createNode({
        patientId: "patient-ravi",
        title: "Cross patient",
        parentId: "meera-root",
      }),
    ).toThrow(/another patient/);
  });

  it("creates a node under a valid same-patient parent", () => {
    const service = makeService();
    const created = service.createNode({
      patientId: "patient-ravi",
      title: "New Memory",
      nodeType: "memory",
      parentId: "ravi-family",
    });
    expect(created.id).toBeTruthy();
    expect(created.patientId).toBe("patient-ravi");
    expect(created.parentId).toBe("ravi-family");
    expect(service.getNodes("patient-ravi")).toContainEqual(
      expect.objectContaining({ id: created.id, title: "New Memory" }),
    );
  });
});

describe("MemoryService.updateNode", () => {
  it("updates a node's fields", () => {
    const service = makeService();
    const updated = service.updateNode("ravi-bruno", {
      title: "Bruno the Retriever",
      importance: "high",
    });
    expect(updated.title).toBe("Bruno the Retriever");
    expect(service.getNodes("patient-ravi")).toContainEqual(
      expect.objectContaining({
        id: "ravi-bruno",
        title: "Bruno the Retriever",
      }),
    );
  });

  it("throws when the node does not exist", () => {
    const service = makeService();
    expect(() => service.updateNode("missing-node", { title: "x" })).toThrow(
      /not found/i,
    );
  });

  it("rejects making a node its own parent", () => {
    const service = makeService();
    expect(() =>
      service.updateNode("ravi-bruno", { parentId: "ravi-bruno" }),
    ).toThrow(/own parent/);
  });
});

describe("MemoryService.moveNode", () => {
  it("moves a node to a new valid parent", () => {
    const service = makeService();
    const moved = service.moveNode("ravi-bruno", "ravi-family");
    expect(moved.parentId).toBe("ravi-family");
    expect(service.getNodes("patient-ravi")).toContainEqual(
      expect.objectContaining({ id: "ravi-bruno", parentId: "ravi-family" }),
    );
  });

  it("rejects a node becoming its own parent", () => {
    const service = makeService();
    expect(() => service.moveNode("ravi-bruno", "ravi-bruno")).toThrow(
      /own parent/,
    );
  });

  it("rejects moving a node under one of its own descendants (circular)", () => {
    const service = makeService();
    // ravi-rajesh-events is a descendant of ravi-rajesh.
    expect(() => service.moveNode("ravi-rajesh", "ravi-rajesh-events")).toThrow(
      /descendant/,
    );
  });

  it("rejects moving a node to a parent from another patient", () => {
    const service = makeService();
    expect(() => service.moveNode("ravi-bruno", "meera-root")).toThrow(
      /another patient/,
    );
  });
});

describe("MemoryService.deleteNode", () => {
  it("deletes a node together with all of its descendants", () => {
    const service = makeService();
    // ravi-rajesh has a descendant subtree (Important Events -> Wedding/Birthday).
    service.deleteNode("ravi-rajesh");
    const remaining = service.getNodes("patient-ravi");
    expect(remaining.some((n) => n.id === "ravi-rajesh")).toBe(false);
    expect(remaining.some((n) => n.id === "ravi-rajesh-events")).toBe(false);
    expect(remaining.some((n) => n.id === "ravi-rajesh-wedding")).toBe(false);
    expect(remaining.some((n) => n.id === "ravi-rajesh-birthday")).toBe(false);
  });

  it("throws when the node does not exist", () => {
    const service = makeService();
    expect(() => service.deleteNode("missing-node")).toThrow(/not found/i);
  });
});

describe("MemoryService.getMemoryGameItems", () => {
  it("returns generic memory objects with the required shape", () => {
    const service = makeService();
    const items = service.getMemoryGameItems("patient-ravi");

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          metadata: expect.any(Object),
          categoryPath: expect.any(Array),
        }),
      );
      // imageUrl may be null for seeded memories.
      expect("imageUrl" in item).toBe(true);
    }
  });

  it("only returns memory nodes (not roots or categories)", () => {
    const service = makeService();
    const items = service.getMemoryGameItems("patient-ravi");
    const titles = items.map((i) => i.title);
    expect(titles).not.toContain("Ravi"); // root
    expect(titles).not.toContain("Family"); // category
    expect(titles).toContain("Lakshmi");
    expect(titles).toContain("Wedding");
  });

  it("includes the category path breadcrumb for each memory", () => {
    const service = makeService();
    const items = service.getMemoryGameItems("patient-ravi");
    const wedding = items.find((i) => i.title === "Wedding");
    expect(wedding.categoryPath).toEqual([
      "Ravi",
      "Family",
      "Rajesh",
      "Important Events",
      "Wedding",
    ]);
  });

  it("filters by categoryPath segment and applies a limit", () => {
    const service = makeService();
    const familyItems = service.getMemoryGameItems("patient-ravi", {
      categoryPath: "Family",
    });
    expect(familyItems.length).toBeGreaterThan(0);
    expect(familyItems.every((i) => i.categoryPath.includes("Family"))).toBe(
      true,
    );

    const limited = service.getMemoryGameItems("patient-ravi", { limit: 2 });
    expect(limited.length).toBe(2);
  });
});
