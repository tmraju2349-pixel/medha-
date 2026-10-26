import {
  cleanup,
  configure,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemoryAssistant from "./MemoryAssistant.jsx";
import { seedNodes } from "./data/seedData.js";
import { MockMemoryRepository } from "./services/memoryRepository.js";
import { memoryService } from "./services/memoryService.js";

// The module's components use data-ocid attributes rather than data-testid.
configure({ testIdAttribute: "data-ocid" });

/**
 * Component/integration journeys for the MemoryAssistant module. These render
 * the real components against the real service + mock/local repository, so
 * they exercise the full UI -> service -> repository path (no backend).
 *
 * The module's service is a shared singleton, so each test resets its
 * repository to a fresh seeded state to avoid cross-test contamination.
 */

beforeEach(() => {
  memoryService.repository = new MockMemoryRepository(seedNodes);
  // jsdom does not implement matchMedia; TreeNode reads it once at render.
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

// The frontend test script does not enable Vitest globals, so RTL's automatic
// cleanup does not run between tests. Clean up explicitly to avoid DOM
// accumulation across tests in this file.
afterEach(() => {
  cleanup();
});

describe("MemoryAssistant tree rendering", () => {
  it("renders the patient as the root node with its top-level branches", () => {
    render(<MemoryAssistant patientId="patient-ravi" />);

    // Root node (the patient) is shown and expanded by default.
    expect(
      screen.getByRole("treeitem", { name: /Ravi, Patient/ }),
    ).toBeTruthy();
    // Top-level categories are visible because the root is expanded.
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

  it("shows a friendly empty state when no patient is selected", () => {
    render(<MemoryAssistant patientId={null} />);
    expect(screen.getByText("No patient selected")).toBeTruthy();
  });

  it("expanding a branch reveals its children", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);

    // Lakshmi is a child of Family, which is collapsed initially.
    expect(
      screen.queryByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    expect(
      screen.getByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("treeitem", { name: /Rajesh, Memory/ }),
    ).toBeTruthy();
  });
});

describe("MemoryAssistant patient isolation", () => {
  it("switching patientId renders a different, patient-specific tree", () => {
    const { rerender } = render(<MemoryAssistant patientId="patient-ravi" />);
    expect(
      screen.getByRole("treeitem", { name: /Ravi, Patient/ }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("treeitem", { name: /Meera, Patient/ }),
    ).toBeNull();

    rerender(<MemoryAssistant patientId="patient-meera" />);
    expect(
      screen.getByRole("treeitem", { name: /Meera, Patient/ }),
    ).toBeTruthy();
    // No cross-patient leakage: Ravi's branches must not appear for Meera.
    expect(
      screen.queryByRole("treeitem", { name: /Family, Category/ }),
    ).toBeNull();
    expect(
      screen.getByRole("treeitem", { name: /Fruits, Category/ }),
    ).toBeTruthy();
  });
});

describe("MemoryAssistant detail view", () => {
  async function openLakshmi(user) {
    render(<MemoryAssistant patientId="patient-ravi" />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Open Lakshmi" }));
  }

  it("shows photo placeholder, title, category path, importance, dates, and actions", async () => {
    const user = userEvent.setup();
    await openLakshmi(user);

    const detail = screen.getByTestId("memory.detail");
    // "Lakshmi" appears both in the breadcrumb and as the detail title.
    expect(within(detail).getAllByText("Lakshmi").length).toBeGreaterThan(0);
    // Category path breadcrumb.
    expect(within(detail).getByText("Ravi")).toBeTruthy();
    expect(within(detail).getByText("Family")).toBeTruthy();
    // Importance badge.
    expect(within(detail).getByText("High importance")).toBeTruthy();
    // Relationship from metadata.
    expect(within(detail).getByText(/Relationship:/)).toBeTruthy();
    // Created / updated dates.
    expect(within(detail).getByText(/Created:/)).toBeTruthy();
    expect(within(detail).getByText(/Updated:/)).toBeTruthy();
    // Action buttons.
    expect(within(detail).getByRole("button", { name: /Listen/ })).toBeTruthy();
    expect(within(detail).getByRole("button", { name: /Edit/ })).toBeTruthy();
    expect(within(detail).getByRole("button", { name: /Move/ })).toBeTruthy();
    expect(within(detail).getByRole("button", { name: /Delete/ })).toBeTruthy();
    expect(within(detail).getByRole("button", { name: /Back/ })).toBeTruthy();
    expect(
      within(detail).getByRole("button", { name: "Close details" }),
    ).toBeTruthy();
  });

  it("invokes onSpeak with the memory when Listen is clicked", async () => {
    const user = userEvent.setup();
    const onSpeak = vi.fn();
    render(<MemoryAssistant patientId="patient-ravi" onSpeak={onSpeak} />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Open Lakshmi" }));

    await user.click(screen.getByRole("button", { name: /Listen/ }));
    expect(onSpeak).toHaveBeenCalledTimes(1);
    expect(onSpeak).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ravi-lakshmi", title: "Lakshmi" }),
    );
  });

  it("closes the detail view and returns to the tree", async () => {
    const user = userEvent.setup();
    await openLakshmi(user);
    expect(screen.getByTestId("memory.detail")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(screen.queryByTestId("memory.detail")).toBeNull();
    // The tree is still present.
    expect(
      screen.getByRole("treeitem", { name: /Ravi, Patient/ }),
    ).toBeTruthy();
  });

  it("keeps the full tree visible while a node's details are open", async () => {
    const user = userEvent.setup();
    await openLakshmi(user);

    // The detail is open...
    expect(screen.getByTestId("memory.detail")).toBeTruthy();
    // ...but the tree is still fully rendered: the root and every top-level
    // branch remain present and visible alongside the detail. This is the
    // invariant that must survive the detail moving from a fixed column into
    // a popup overlay — opening details must never hide or squeeze the tree.
    expect(
      screen.getByRole("treeitem", { name: /Ravi, Patient/ }),
    ).toBeTruthy();
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
});

describe("MemoryAssistant popup overlay", () => {
  async function openLakshmi(user) {
    render(<MemoryAssistant patientId="patient-ravi" />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Open Lakshmi" }));
  }

  it("opens node details in a dialog overlay floating above the tree", async () => {
    const user = userEvent.setup();
    await openLakshmi(user);

    // The details render inside the popup overlay (a <dialog>), not in a
    // fixed inline column beside the tree.
    const popup = screen.getByTestId("memory.popup");
    expect(popup.tagName).toBe("DIALOG");
    expect(within(popup).getByTestId("memory.detail")).toBeTruthy();
  });

  it("collapses the popup when the user clicks outside of it (the backdrop)", async () => {
    const user = userEvent.setup();
    await openLakshmi(user);
    expect(screen.getByTestId("memory.popup")).toBeTruthy();

    // Clicking the backdrop (the dialog itself, outside the inner panel)
    // dismisses the popup and returns to the tree.
    await user.click(screen.getByTestId("memory.popup"));
    expect(screen.queryByTestId("memory.popup")).toBeNull();
    expect(
      screen.getByRole("treeitem", { name: /Ravi, Patient/ }),
    ).toBeTruthy();
  });

  it("does not collapse the popup when clicking inside the panel", async () => {
    const user = userEvent.setup();
    await openLakshmi(user);

    // Clicking inside the panel (on the detail content) must not dismiss it.
    await user.click(screen.getByTestId("memory.detail"));
    expect(screen.getByTestId("memory.popup")).toBeTruthy();
    expect(screen.getByTestId("memory.detail")).toBeTruthy();
  });
});

describe("MemoryAssistant CRUD journeys", () => {
  it("edits a memory and updates the rendered tree", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Open Lakshmi" }));

    await user.click(screen.getByRole("button", { name: /Edit/ }));
    const titleInput = screen.getByTestId("memory.form_title_input");
    await user.clear(titleInput);
    await user.type(titleInput, "Lakshmi Amma");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    // The updated title appears in the tree.
    expect(
      screen.getByRole("treeitem", { name: /Lakshmi Amma, Memory/ }),
    ).toBeTruthy();
  });

  it("deletes a memory only after confirming the delete dialog", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(memoryService, "deleteNode");
    render(<MemoryAssistant patientId="patient-ravi" />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Open Lakshmi" }));

    // Opening the delete dialog must not delete anything yet.
    await user.click(screen.getByTestId("memory.delete_button"));
    expect(screen.getByText("Delete this memory?")).toBeTruthy();
    expect(deleteSpy).not.toHaveBeenCalled();

    // Confirming removes the node from the tree.
    await user.click(screen.getByTestId("memory.delete_confirm_button"));
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeNull();
  });

  it("cancelling the delete dialog keeps the node", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Open Lakshmi" }));

    await user.click(screen.getByTestId("memory.delete_button"));
    await user.click(screen.getByTestId("memory.delete_cancel_button"));

    // The node is still present after cancelling.
    expect(
      screen.getByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeTruthy();
  });

  it("moves a memory to another parent and updates the tree", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    await user.click(screen.getByRole("button", { name: "Open Lakshmi" }));

    await user.click(screen.getByRole("button", { name: /Move/ }));
    // Move Lakshmi under the Pets category.
    await user.selectOptions(
      screen.getByTestId("memory.form_parent_select"),
      "ravi-pets",
    );
    await user.click(screen.getByRole("button", { name: "Move" }));

    // Lakshmi is no longer under Family.
    expect(
      screen.queryByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeNull();
    // Expand Pets to confirm Lakshmi now lives there.
    await user.click(screen.getByRole("button", { name: "Expand Pets" }));
    expect(
      screen.getByRole("treeitem", { name: /Lakshmi, Memory/ }),
    ).toBeTruthy();
  });

  it("adds a new branch/category immediately to the tree", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);

    await user.click(screen.getByRole("button", { name: /Add Branch/ }));
    await user.type(screen.getByTestId("memory.add_branch_input"), "Pets2");
    await user.click(screen.getByRole("button", { name: "Add" }));

    // The new category appears as a top-level branch with no code changes.
    expect(
      screen.getByRole("treeitem", { name: /Pets2, Category/ }),
    ).toBeTruthy();
  });

  it("adds a memory under the selected parent via the Add Memory form", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);

    // The root is selected by default, so a new memory lands under the root.
    await user.click(screen.getByRole("button", { name: /Add Memory/ }));
    await user.type(
      screen.getByTestId("memory.form_title_input"),
      "First Day of School",
    );
    await user.click(screen.getByRole("button", { name: "Add Memory" }));

    // The new memory appears in the tree as a top-level memory node.
    expect(
      screen.getByRole("treeitem", { name: /First Day of School, Memory/ }),
    ).toBeTruthy();
  });

  it("adds a memory under a specific branch via the parent selector", async () => {
    const user = userEvent.setup();
    render(<MemoryAssistant patientId="patient-ravi" />);

    // Choose Family as the parent so the new memory is created under it.
    await user.click(screen.getByRole("button", { name: /Add Memory/ }));
    await user.selectOptions(
      screen.getByTestId("memory.form_parent_select"),
      "ravi-family",
    );
    await user.type(
      screen.getByTestId("memory.form_title_input"),
      "Family Reunion",
    );
    await user.click(screen.getByRole("button", { name: "Add Memory" }));

    // Expand Family to confirm the new memory lives under it.
    await user.click(screen.getByRole("button", { name: "Expand Family" }));
    expect(
      screen.getByRole("treeitem", { name: /Family Reunion, Memory/ }),
    ).toBeTruthy();
  });
});
