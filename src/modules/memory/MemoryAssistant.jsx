/**
 * MemoryAssistant — main container for the Dynamic Memory Tree / Memory Vault
 * module.
 *
 * Props:
 *   patientId (required) — the patient whose tree to show. Always comes from
 *     the parent app; never defaulted to a real patient. When missing, a
 *     friendly "no patient selected" state is shown.
 *   onSpeak (optional) — integration point for the parent MEDHA voice system.
 *     Called with a memory object when the user asks to hear a memory.
 *
 * The container owns state (flat nodes, expanded ids, selected node, open
 * detail node, and CRUD operations wired to memoryService) and composes the
 * tree view and detail/management views.
 */

import {
  Camera,
  ChevronsDownUp,
  ChevronsUpDown,
  Mic,
  Search,
  Sparkles,
  Trees,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddBranch from "./components/AddBranch";
import MemoryDetail from "./components/MemoryDetail";
import MemoryTree from "./components/MemoryTree";
import NodeForm from "./components/NodeForm";
import { memoryService } from "./services/memoryService";
import { buildTree, getCategoryPath } from "./services/memoryTreeBuilder";

export default function MemoryAssistant({
  patientId,
  patientName,
  onSpeak,
  initialSearchQuery = "",
}) {
  const [nodes, setNodes] = useState([]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [openDetailId, setOpenDetailId] = useState(null);
  const [form, setForm] = useState(null); // { mode, node, parentId }
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");

  // Sync initialSearchQuery when passed from voice assistant
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Load the patient's nodes whenever patientId changes.
  useEffect(() => {
    if (!patientId) {
      setNodes([]);
      setExpandedIds(new Set());
      setSelectedId(null);
      setOpenDetailId(null);
      setForm(null);
      return;
    }
    const displayName = patientName || "Patient";
    let patientNodes = memoryService.getNodes(patientId);
    let root = patientNodes.find((node) => node.nodeType === "root");

    // Automatically create a root node if it doesn't exist
    if (!root) {
      root = memoryService.createNode({
        patientId,
        nodeType: "root",
        title: displayName,
        description: "The root of all memories.",
        parentId: null,
        icon: "user",
        importance: "high",
      });
      patientNodes = memoryService.getNodes(patientId);
    } else if (
      patientName &&
      (root.title === "Biren Saikia" ||
        root.title === "Biren Saikia, Patient" ||
        root.title !== patientName)
    ) {
      // Sync root node title to active patient name
      memoryService.updateNode(root.id, { title: patientName });
      patientNodes = memoryService.getNodes(patientId);
      root = patientNodes.find((node) => node.nodeType === "root");
    }

    // Map nodes to ensure root node always displays current patient name
    const synchronizedNodes = patientNodes.map((n) => {
      if (n.nodeType === "root" && patientName) {
        return { ...n, title: patientName };
      }
      return n;
    });

    setNodes(synchronizedNodes);
    setExpandedIds(new Set(root ? [root.id] : []));
    setSelectedId(root ? root.id : null);
    setOpenDetailId(null);
    setForm(null);
  }, [patientId, patientName]);

  const refresh = useCallback(() => {
    if (!patientId) return;
    const raw = memoryService.getNodes(patientId);
    const mapped = raw.map((n) => {
      if (n.nodeType === "root" && patientName) {
        return { ...n, title: patientName };
      }
      return n;
    });
    setNodes(mapped);
  }, [patientId, patientName]);

  const tree = useMemo(() => {
    const root = nodes.find((node) => node.nodeType === "root");
    return root ? buildTree(nodes, root.id) : null;
  }, [nodes]);

  const openNode = useMemo(
    () => nodes.find((node) => node.id === openDetailId) ?? null,
    [nodes, openDetailId],
  );

  const openPath = useMemo(
    () => (openNode ? getCategoryPath(nodes, openNode.id) : []),
    [nodes, openNode],
  );

  // Candidate parents for add/move forms: same patient, not the node itself,
  // not one of its descendants (avoids circular relationships).
  const parentOptions = useMemo(() => {
    if (!patientId) return [];
    const selfId = form?.node?.id;
    const descendants = selfId
      ? new Set(
          nodes
            .filter((n) => n.id === selfId)
            .flatMap(() => collectDescendants(nodes, selfId)),
        )
      : new Set();
    return nodes.filter(
      (node) =>
        node.id !== selfId &&
        !descendants.has(node.id) &&
        (node.nodeType === "root" || node.nodeType === "category"),
    );
  }, [nodes, patientId, form]);

  const stats = useMemo(() => {
    const memoriesCount = nodes.filter((n) => n.nodeType === "memory").length;
    const categoriesCount = nodes.filter(
      (n) => n.nodeType === "category",
    ).length;
    const photosCount = nodes.filter((n) => Boolean(n.imageUrl)).length;
    const voiceCount = nodes.filter((n) => Boolean(n.audioUrl)).length;
    return { memoriesCount, categoriesCount, photosCount, voiceCount };
  }, [nodes]);

  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(nodes.map((n) => n.id)));
  }, [nodes]);

  const handleCollapseAll = useCallback(() => {
    const root = nodes.find((n) => n.nodeType === "root");
    setExpandedIds(new Set(root ? [root.id] : []));
  }, [nodes]);

  // Search matches computed purely for highlighting and user badge — never auto-expand unexpectedly!
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q),
    );
  }, [searchQuery, nodes]);

  // If user explicitly requests to reveal search matches in the tree:
  const handleRevealMatches = useCallback(() => {
    if (searchMatches.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const match of searchMatches) {
        let curr = match;
        while (curr?.parentId) {
          next.add(curr.parentId);
          curr = nodes.find((n) => n.id === curr.parentId);
        }
      }
      return next;
    });
  }, [searchMatches, nodes]);

  const handleToggle = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((id) => setSelectedId(id), []);
  const handleOpen = useCallback((id) => setOpenDetailId(id), []);

  // Dismiss the popup (details or form) entirely.
  const closePopup = useCallback(() => {
    setOpenDetailId(null);
    setForm(null);
  }, []);

  // Close the popup with the Escape key.
  useEffect(() => {
    if (!openDetailId && !form) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openDetailId, form, closePopup]);

  // Lock body scroll while the popup is open so the tree behind it stays put.
  useEffect(() => {
    if (!openDetailId && !form) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [openDetailId, form]);

  const handleCreate = useCallback(
    (data) => {
      memoryService.createNode({ ...data, patientId });
      refresh();
      setForm(null);
    },
    [patientId, refresh],
  );

  const handleUpdate = useCallback(
    (id, data) => {
      memoryService.updateNode(id, data);
      refresh();
      setForm(null);
    },
    [refresh],
  );

  const handleDelete = useCallback(
    (id) => {
      memoryService.deleteNode(id);
      refresh();
      setOpenDetailId(null);
      setSelectedId(null);
    },
    [refresh],
  );

  const handleMove = useCallback(
    (id, newParentId) => {
      memoryService.moveNode(id, newParentId);
      refresh();
      setForm(null);
    },
    [refresh],
  );

  if (!patientId) {
    return (
      <div
        data-ocid="memory.empty_state"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-10 text-center shadow-subtle"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-4xl">
          🌳
        </div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          No patient selected
        </h2>
        <p className="max-w-md text-lg text-muted-foreground">
          Please choose a patient from the app to view their memory tree.
        </p>
      </div>
    );
  }

  const popupOpen = Boolean(openDetailId || form);

  return (
    <div className="flex flex-col gap-6">
      {/* Tree view — full width so the whole tree is always visible. There is
          no fixed preview column; details open as an overlay popup instead. */}
      <section
        data-ocid="memory.tree_panel"
        className="overflow-hidden rounded-3xl border-2 border-[#E5DEC9] bg-[#FAF6EF] p-4 shadow-sm sm:p-6"
      >
        <div className="mb-6 flex flex-col gap-4">
          {/* Header row: Title, quick metadata, and creation actions */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <Trees className="h-7 w-7 text-primary" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {patientName ? `${patientName}'s Memory Tree` : "Memory Tree"}
                </h2>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                <span>Visual relationship hierarchy</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-semibold text-primary">
                  🌿 {stats.memoriesCount} Memories
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-semibold text-foreground">
                  📁 {stats.categoriesCount} Branches
                </span>
                {stats.photosCount > 0 && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-accent-foreground">
                      <Camera className="h-3 w-3" /> {stats.photosCount} Photos
                    </span>
                  </>
                )}
                {stats.voiceCount > 0 && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-accent-foreground">
                      <Mic className="h-3 w-3" /> {stats.voiceCount} Voice Notes
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Primary creation actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <AddBranch
                onSubmit={(title) => {
                  const root = nodes.find((node) => node.nodeType === "root");
                  handleCreate({
                    title,
                    nodeType: "category",
                    parentId: root ? root.id : null,
                  });
                }}
                onCancel={() => setForm(null)}
              />

              <button
                type="button"
                data-ocid="memory.add_button"
                onClick={() =>
                  setForm({
                    mode: "addMemory",
                    node: null,
                    parentId: selectedId,
                  })
                }
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-xs transition-smooth hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
              >
                + Add Memory
              </button>
            </div>
          </div>

          {/* Unified Toolbar: Search on left, Expand/Collapse shifted to right */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/50 pt-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories, relatives, places..."
                className="w-full rounded-full border border-input bg-background py-2 pl-10 pr-24 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <>
                    <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-bold text-warning">
                      {searchMatches.length} found
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tree Controls shifted cleanly to the right */}
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {searchQuery && searchMatches.length > 0 && (
                <button
                  type="button"
                  onClick={handleRevealMatches}
                  title="Expand ancestor branches to reveal matches"
                  className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-bold text-warning hover:bg-warning/20 transition-all"
                >
                  <Sparkles className="h-3 w-3" /> Reveal matches
                </button>
              )}

              <button
                type="button"
                onClick={handleExpandAll}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs sm:text-sm font-bold text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ChevronsUpDown className="h-4 w-4 text-primary" /> Expand All
              </button>

              <button
                type="button"
                onClick={handleCollapseAll}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs sm:text-sm font-bold text-secondary-foreground transition-smooth hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ChevronsDownUp className="h-4 w-4 text-muted-foreground" />{" "}
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {tree ? (
          <MemoryTree
            nodes={tree}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSelect={handleSelect}
            onOpen={handleOpen}
            selectedId={selectedId}
            searchQuery={searchQuery}
            patientName={patientName}
          />
        ) : (
          <p className="text-lg text-muted-foreground">No tree to display.</p>
        )}
      </section>

      {/* Overlay popup for node details and add/edit/move forms. It floats above
          the tree, so the tree stays fully visible behind it. Clicking the
          backdrop (outside the panel) or pressing Escape dismisses it. */}
      {popupOpen && (
        <dialog
          open
          data-ocid="memory.popup"
          aria-label={form ? "Memory form" : "Memory details"}
          className="fixed inset-0 z-50 m-0 flex h-full w-full items-start justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-md sm:p-8"
          onClick={closePopup}
          onKeyDown={(event) => {
            if (event.key === "Escape") closePopup();
          }}
        >
          <div
            className="tree-preview-modal my-auto w-full max-w-2xl rounded-3xl p-5 sm:p-8"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {form ? (
              <NodeForm
                mode={form.mode}
                node={form.node}
                parentOptions={parentOptions}
                onSubmit={(data) => {
                  if (form.mode === "edit" && form.node) {
                    handleUpdate(form.node.id, data);
                  } else if (form.mode === "move" && form.node) {
                    handleMove(form.node.id, data.parentId);
                  } else {
                    handleCreate(data);
                  }
                }}
                onCancel={() => setForm(null)}
              />
            ) : openNode ? (
              <MemoryDetail
                node={openNode}
                path={openPath}
                onEdit={() => setForm({ mode: "edit", node: openNode })}
                onDelete={() => handleDelete(openNode.id)}
                onMove={() => setForm({ mode: "move", node: openNode })}
                onBack={() => {
                  const parent = openNode.parentId
                    ? nodes.find((n) => n.id === openNode.parentId)
                    : null;
                  setOpenDetailId(parent ? parent.id : null);
                }}
                onClose={() => setOpenDetailId(null)}
                onSpeak={onSpeak}
                patientName={patientName}
              />
            ) : null}
          </div>
        </dialog>
      )}
    </div>
  );
}

// Local helper: collect descendant ids for a node (used for parent options).
function collectDescendants(nodes, nodeId) {
  const childrenByParent = new Map();
  for (const node of nodes) {
    if (node.parentId == null) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node.id);
    childrenByParent.set(node.parentId, list);
  }
  const result = [];
  const stack = [nodeId];
  while (stack.length > 0) {
    const id = stack.pop();
    for (const childId of childrenByParent.get(id) ?? []) {
      result.push(childId);
      stack.push(childId);
    }
  }
  return result;
}
