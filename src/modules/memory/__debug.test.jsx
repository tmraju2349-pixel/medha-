import { cleanup, configure, render, screen } from "@testing-library/react";
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
  description: "My mother.",
  imageUrl: null,
  icon: "heart",
  metadata: { relation: "mother", born: "1942" },
  importance: "high",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

/**
 * Focused coverage of the MemoryDetail delete-confirmation dialog (the changed
 * component). A single tap on Delete must never irreversibly delete a node and
 * its subtree, so the user confirms first.
 */
describe("MemoryDetail delete confirmation", () => {
  it("does not call onDelete until the dialog is confirmed", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <MemoryDetail
        node={node}
        path={["Ravi", "Family", "Lakshmi"]}
        onDelete={onDelete}
        onEdit={() => {}}
        onMove={() => {}}
        onBack={() => {}}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByTestId("memory.delete_button"));
    expect(screen.getByText("Delete this memory?")).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("memory.delete_confirm_button"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("does not call onDelete when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <MemoryDetail
        node={node}
        path={["Ravi", "Family", "Lakshmi"]}
        onDelete={onDelete}
        onEdit={() => {}}
        onMove={() => {}}
        onBack={() => {}}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByTestId("memory.delete_button"));
    await user.click(screen.getByTestId("memory.delete_cancel_button"));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
