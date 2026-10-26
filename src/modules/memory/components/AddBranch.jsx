/**
 * AddBranch — a small, prominent '+ Add Branch' control.
 *
 * When clicked it reveals an inline input to enter a new category name
 * (e.g. 'Pets'). On submit it calls onSubmit(title) so the new category is
 * immediately added to the patient's tree with no code changes.
 *
 * Props:
 *   onSubmit(title) — called with the new category name
 *   onCancel        — closes the inline input without adding
 */

import { FolderPlus, X } from "lucide-react";
import { useState } from "react";

export default function AddBranch({ onSubmit, onCancel }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleOpen = () => {
    setOpen(true);
    setTitle("");
  };

  const handleClose = () => {
    setOpen(false);
    setTitle("");
    onCancel?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setOpen(false);
    setTitle("");
  };

  if (!open) {
    return (
      <button
        type="button"
        data-ocid="memory.add_branch_button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-lg font-bold text-accent-foreground transition-smooth hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <FolderPlus className="h-6 w-6" aria-hidden="true" />+ Add Branch
      </button>
    );
  }

  return (
    <form
      data-ocid="memory.add_branch_form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      <label
        htmlFor="add-branch-title"
        className="text-lg font-bold text-foreground"
      >
        New branch name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="add-branch-title"
          data-ocid="memory.add_branch_input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Pets"
          className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            data-ocid="memory.add_branch_submit_button"
            disabled={title.trim().length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-4 text-lg font-bold text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            data-ocid="memory.add_branch_cancel_button"
            onClick={handleClose}
            aria-label="Cancel adding branch"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}
