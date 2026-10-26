import {
  cleanup,
  configure,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MemoryDetail from "./components/MemoryDetail.jsx";

// The module's components use data-ocid attributes rather than data-testid.
configure({ testIdAttribute: "data-ocid" });

afterEach(() => cleanup());

const node = {
  id: "ravi-lakshmi",
  patientId: "patient-ravi",
  parentId: "ravi-family",
  nodeType: "memory",
  title: "Lakshmi",
  description:
    "My mother. She taught me to cook and always sang while working.",
  imageUrl: null,
  icon: "heart",
  metadata: { relation: "mother", born: "1942", hometown: "Coimbatore" },
  importance: "high",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

/**
 * Characterization of the MemoryDetail content contract. The detail view is
 * being moved from a separate grid column into a popup overlay, so the exact
 * container/layout is intentionally NOT frozen here. What must survive that
 * presentation change is the detail content itself: the title, description,
 * importance badge, category breadcrumb, dates, and the always-visible Back and
 * Close (X) controls. Rendering MemoryDetail directly pins that content
 * independent of whichever container hosts it.
 */
describe("MemoryDetail content contract", () => {
  it("renders the title, description, importance, breadcrumb, and dates", () => {
    render(
      <MemoryDetail
        node={node}
        path={["Ravi", "Family", "Lakshmi"]}
        onEdit={() => {}}
        onDelete={() => {}}
        onMove={() => {}}
        onBack={() => {}}
        onClose={() => {}}
      />,
    );

    const detail = screen.getByTestId("memory.detail");
    // Title appears both in the breadcrumb and as the detail heading.
    expect(within(detail).getAllByText("Lakshmi").length).toBeGreaterThan(0);
    expect(
      within(detail).getByText(/My mother\. She taught me to cook/),
    ).toBeTruthy();
    // Importance badge.
    expect(within(detail).getByText("High importance")).toBeTruthy();
    // Category breadcrumb (root -> category -> node).
    expect(within(detail).getByText("Ravi")).toBeTruthy();
    expect(within(detail).getByText("Family")).toBeTruthy();
    // Relationship from metadata.
    expect(within(detail).getByText(/Relationship:/)).toBeTruthy();
    // Created / updated dates.
    expect(within(detail).getByText(/Created:/)).toBeTruthy();
    expect(within(detail).getByText(/Updated:/)).toBeTruthy();
  });

  it("dismisses via the X close button, calling onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryDetail
        node={node}
        path={["Ravi", "Family", "Lakshmi"]}
        onEdit={() => {}}
        onDelete={() => {}}
        onMove={() => {}}
        onBack={() => {}}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates back via the Back button, calling onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <MemoryDetail
        node={node}
        path={["Ravi", "Family", "Lakshmi"]}
        onEdit={() => {}}
        onDelete={() => {}}
        onMove={() => {}}
        onBack={onBack}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Back/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
