/**
 * NodeForm — a reusable form for adding a branch/category, adding a child
 * memory, editing a node, and moving a node to another parent.
 *
 * Props:
 *   mode          — 'addBranch' | 'addMemory' | 'edit' | 'move'
 *   node          — the node being edited/moved (null for add modes)
 *   parentOptions — array of valid parent nodes to choose from (add/move modes)
 *   onSubmit(data) — called with the form data
 *   onCancel      — closes the form
 *
 * Fields depend on mode: title (required), description, importance, icon, and
 * a parent selector for add/move modes. Large elderly-friendly inputs.
 */

import { FolderPlus, Move, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import PhotoUploader from "./PhotoUploader.jsx";
import VoiceRecorder from "./VoiceRecorder.jsx";

const MODE_META = {
  addBranch: {
    title: "Add Branch",
    icon: FolderPlus,
    submitLabel: "Add Branch",
  },
  addMemory: {
    title: "Add Memory",
    icon: Plus,
    submitLabel: "Add Memory",
  },
  edit: {
    title: "Edit Memory",
    icon: Pencil,
    submitLabel: "Save Changes",
  },
  move: {
    title: "Move Memory",
    icon: Move,
    submitLabel: "Move",
  },
};

const IMPORTANCE_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const ICON_OPTIONS = [
  { value: "heart", label: "Heart" },
  { value: "user", label: "Person" },
  { value: "users", label: "People" },
  { value: "home", label: "Home" },
  { value: "map", label: "Map" },
  { value: "cake", label: "Cake" },
  { value: "paw", label: "Paw" },
  { value: "flower", label: "Flower" },
  { value: "calendar", label: "Calendar" },
  { value: "apple", label: "Apple" },
];

export default function NodeForm({
  mode,
  node = null,
  parentOptions = [],
  onSubmit,
  onCancel,
}) {
  const meta = MODE_META[mode] ?? MODE_META.addMemory;
  const isMove = mode === "move";
  const isAdd = mode === "addBranch" || mode === "addMemory";

  const [title, setTitle] = useState(node?.title ?? "");
  const [description, setDescription] = useState(node?.description ?? "");
  const [importance, setImportance] = useState(node?.importance ?? "medium");
  const [icon, setIcon] = useState(node?.icon ?? "heart");
  const [imageUrl, setImageUrl] = useState(node?.imageUrl ?? null);
  const [audioUrl, setAudioUrl] = useState(node?.audioUrl ?? null);
  const [audioDuration, setAudioDuration] = useState(node?.audioDuration ?? 0);
  const [parentId, setParentId] = useState(
    isMove ? (node?.parentId ?? "") : (parentOptions[0]?.id ?? ""),
  );

  const canSubmit = isMove ? parentId !== "" : title.trim().length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (isMove) {
      onSubmit({ parentId });
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      importance,
      icon,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      audioDuration: audioDuration || 0,
    };
    if (isAdd) {
      data.nodeType = mode === "addBranch" ? "category" : "memory";
      data.parentId = parentId || null;
    }
    onSubmit(data);
  };

  return (
    <form
      data-ocid="memory.form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
          <meta.icon className="h-6 w-6 text-primary" aria-hidden="true" />
          {meta.title}
        </h3>
        <button
          type="button"
          data-ocid="memory.form_cancel_button"
          onClick={onCancel}
          aria-label="Cancel"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Parent selector for add/move modes */}
      {(isAdd || isMove) && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="node-form-parent"
            className="text-lg font-bold text-foreground"
          >
            {isMove ? "Move to parent" : "Parent"}
          </label>
          <select
            id="node-form-parent"
            data-ocid="memory.form_parent_select"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-lg text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {!isMove && <option value="">— No parent (top level) —</option>}
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title — hidden for move mode */}
      {!isMove && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="node-form-title"
            className="text-lg font-bold text-foreground"
          >
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="node-form-title"
            data-ocid="memory.form_title_input"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              mode === "addBranch" ? "e.g. Pets" : "e.g. A special memory"
            }
            className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
      )}

      {/* Description — hidden for move mode */}
      {!isMove && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="node-form-description"
            className="text-lg font-bold text-foreground"
          >
            Description
          </label>
          <textarea
            id="node-form-description"
            data-ocid="memory.form_description_input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Tell the story of this memory…"
            className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-4 text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
      )}

      {/* Importance + icon — hidden for move mode */}
      {!isMove && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="node-form-importance"
              className="text-lg font-bold text-foreground"
            >
              Importance
            </label>
            <select
              id="node-form-importance"
              data-ocid="memory.form_importance_select"
              value={importance}
              onChange={(event) => setImportance(event.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-lg text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {IMPORTANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="node-form-icon"
              className="text-lg font-bold text-foreground"
            >
              Icon
            </label>
            <select
              id="node-form-icon"
              data-ocid="memory.form_icon_select"
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-lg text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Photo attachment & Voice note recorder for memories */}
      {!isMove && mode !== "addBranch" && (
        <div className="flex flex-col gap-5 border-t border-border/70 pt-4">
          <PhotoUploader
            imageUrl={imageUrl}
            onChange={(newUrl) => setImageUrl(newUrl)}
          />

          <VoiceRecorder
            audioUrl={audioUrl}
            audioDuration={audioDuration}
            onChange={(newUrl, dur) => {
              setAudioUrl(newUrl);
              setAudioDuration(dur);
            }}
          />
        </div>
      )}

      {/* Submit / cancel */}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          data-ocid="memory.form_submit_button"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-lg font-bold text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <meta.icon className="h-6 w-6" aria-hidden="true" />
          {meta.submitLabel}
        </button>
        <button
          type="button"
          data-ocid="memory.form_cancel_button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary px-6 py-4 text-lg font-bold text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
