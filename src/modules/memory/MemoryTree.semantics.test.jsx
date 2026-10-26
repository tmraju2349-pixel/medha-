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
 * Semantic/accessibility contract of the Memory Tree. The tree is being
 * redesigned from an indented list into a visual top-down hierarchy, so the
 * exact DOM/layout is intentionally NOT frozen here. What must survive the
 * redesign is the accessible tree semantics: a `role="tree"` container whose
 * nodes are `role="treeitem"` elements that expose their expand/collapse state
 * through `aria-expanded`, with the patient root expanded by default and
 * branches toggling in both directions.
 */

beforeEach(() => {
  memoryService.repository = new MockMemoryRepository(seedNodes);
  // jsdom does not implement matchMedia; TreeNode reads it once at render.
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
});

describe("Memory tree accessibility semantics", () => {
  it("renders a tree container with an accessible label", () => {
    render(<MemoryAssistant patientId="patient-ravi" />);
    const tree = screen.getByRole("tree", { name: "Memory tree" });
    expect(tree).toBeTruthy();
  });

  it("exposes the patient root as a treeitem expanded by default", () => {
    render(<MemoryAssistant patientId="patient-ravi" />);
    const root = screen.getByRole("treeitem", { name: /Ravi, Patient/ });
    expect(root.getAttribute("aria-expanded")).toBe("true");
  });

  it("marks a collapsed branch with aria-expanded=false and hides its children", () => {
    render(<MemoryAssistant patientId="patient-ravi" />);
    // Family is a top-level branch that starts collapsed.
    const family = screen.getByRole("treeitem", { name: /Family, Category/ });
    expect(family.getAttribute("aria-expanded")).toBe("false");
    // Its children are not in the tree until expanded.
    expect(
      screen.queryByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeNull();
  });

  it("toggles a branch open and closed, updating aria-expanded both ways", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);

    const family = screen.getByRole("treeitem", { name: /Family, Category/ });
    expect(family.getAttribute("aria-expanded")).toBe("false");

    // Expand: children appear and aria-expanded flips to true.
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    expect(
      screen.getByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("treeitem", { name: /Family, Category/ })
        .getAttribute("aria-expanded"),
    ).toBe("true");

    // Collapse: children disappear and aria-expanded flips back to false.
    await user.click(screen.getByRole("button", { name: "Collapse Family" }));
    expect(
      screen.queryByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeNull();
    expect(
      screen
        .getByRole("treeitem", { name: /Family, Category/ })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });
});

describe("Memory tree leaf nodes", () => {
  it("does not expose aria-expanded on a leaf memory node", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    const lakshmi = screen.getByRole("treeitem", { name: /Lakshmi, Memory/ });
    expect(lakshmi.getAttribute("aria-expanded")).toBeNull();
  });
});
