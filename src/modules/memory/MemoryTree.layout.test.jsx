import { cleanup, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemoryAssistant from "./MemoryAssistant.jsx";
import { seedNodes } from "./data/seedData.js";
import { MockMemoryRepository } from "./services/memoryRepository.js";
import { memoryService } from "./services/memoryService.js";

// The module's components use data-ocid attributes rather than data-testid.
configure({ testIdAttribute: "data-ocid" });

/**
 * Cover for the Memory Tree redesign: the tree was rebuilt from a nested
 * indented list into a visual top-down hierarchy (patient root pinned at the
 * top, category branches spreading below on a shared rail, memory nodes hanging
 * beneath) with connector lines. These tests assert the observable structure of
 * that new layout — the root at depth 0, branches in level-specific containers,
 * connector elements linking parents to children, and clean rendering of deep
 * nesting — without freezing CSS classes or animation timing.
 */

beforeEach(() => {
  memoryService.repository = new MockMemoryRepository(seedNodes);
  // jsdom does not implement matchMedia; TreeNode reads it once at render.
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
});

describe("Memory tree visual top-down layout", () => {
  it("renders the patient root at the top with branches spreading below it", () => {
    render(<MemoryAssistant patientId="patient-ravi" />);

    // The root patient card is present at depth 0.
    expect(
      screen.getByRole("treeitem", { name: /Ravi, Patient/ }),
    ).toBeTruthy();

    // The root's children render in a level-1 branch container (the shared
    // rail that spreads the categories horizontally below the root).
    const branch1 = screen.getByTestId("memory.tree.branch.1");
    expect(branch1).toBeTruthy();
    // The top-level categories live inside that level-1 container.
    expect(
      screen.getByRole("treeitem", { name: /Family, Category/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("treeitem", { name: /Pets, Category/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("treeitem", { name: /Places, Category/ }),
    ).toBeTruthy();
  });

  it("draws connector elements linking the root to its branches", () => {
    render(<MemoryAssistant patientId="patient-ravi" />);

    // The vertical trunk drops from the root down to the branch rail.
    expect(document.querySelector(".connector-trunk")).toBeTruthy();
    // The horizontal rail spans the top-level branches.
    expect(document.querySelector(".connector-rail")).toBeTruthy();
    // A vertical drop hangs from the rail to each branch.
    expect(document.querySelectorAll(".connector-drop").length).toBeGreaterThan(
      0,
    );
  });

  it("renders deep nesting in level-specific containers without flattening", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);

    // Expand Family (depth 1) to reveal its children at depth 2.
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    expect(screen.getByTestId("memory.tree.branch.2")).toBeTruthy();
    expect(
      screen.getByRole("treeitem", { name: /Rajesh, Memory/ }),
    ).toBeTruthy();

    // Rajesh is a category with children; expand to depth 3.
    await user.click(screen.getByRole("button", { name: "Expand Rajesh" }));
    expect(screen.getByTestId("memory.tree.branch.3")).toBeTruthy();
    expect(
      screen.getByRole("treeitem", { name: /Important Events, Category/ }),
    ).toBeTruthy();

    // Expand Important Events to depth 4.
    await user.click(
      screen.getByRole("button", { name: "Expand Important Events" }),
    );
    expect(screen.getByTestId("memory.tree.branch.4")).toBeTruthy();
    expect(
      screen.getByRole("treeitem", { name: /Wedding, Memory/ }),
    ).toBeTruthy();
  });

  it("keeps the root visible and expanded while deeper branches are toggled", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);

    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Expand Rajesh" }));

    // The root remains present and expanded throughout.
    const root = screen.getByRole("treeitem", { name: /Ravi, Patient/ });
    expect(root.getAttribute("aria-expanded")).toBe("true");
  });
});
