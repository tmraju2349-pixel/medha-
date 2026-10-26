/**
 * TreeNode — a single node in the visual top-down Dynamic Memory Tree.
 *
 * Renders a large, touch-friendly, high-contrast node card with a clear icon,
 * the node title in large readable text, an expand/collapse chevron for nodes
 * with children, and a visual indicator of node type (root / category /
 * memory). The card styling follows the design contract: the terracotta root
 * card sits at the top, sage-green category cards spread as branches, and
 * white memory cards hang beneath them with a color-coded priority tag.
 *
 * Interaction model (elderly-friendly):
 *   - Desktop (fine pointer): single click selects/expands, double click opens
 *     details.
 *   - Mobile/tablet (coarse pointer): single tap opens details — no double
 *     click required.
 *   - A visible expand control and a visible open button are always present so
 *     every action is reachable regardless of pointer type.
 *
 * Props:
 *   node         — the node object { id, nodeType, title, icon, ... }
 *   depth        — nesting depth (0 for the root)
 *   isExpanded   — whether this node's children are shown
 *   isSelected   — whether this node is the currently selected node
 *   hasChildren  — whether this node has children in the tree
 *   onToggle(id) — expand/collapse a branch
 *   onSelect(id) — select a node
 *   onOpen(id)   — open a node's details
 */

import {
  Apple,
  Cake,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  Eye,
  Flower2,
  Folder,
  Heart,
  Home,
  MapPin,
  Mic,
  PawPrint,
  Sparkles,
  User,
  Users,
  Volume2,
} from "lucide-react";
import { useRef } from "react";

// Map the seed-data icon strings to lucide-react icons. Falls back to a folder
// icon for unknown values so the tree always renders a clear glyph.
const ICON_MAP = {
  user: User,
  users: Users,
  heart: Heart,
  cake: Cake,
  paw: PawPrint,
  map: MapPin,
  home: Home,
  apple: Apple,
  flower: Flower2,
  calendar: Calendar,
};

const TYPE_LABEL = {
  root: "Patient",
  category: "Category",
  memory: "Memory",
};

const IMPORTANCE_LABEL = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function TreeNode({
  node,
  depth = 0,
  isExpanded = false,
  isSelected = false,
  hasChildren = false,
  onToggle,
  onSelect,
  onOpen,
  searchQuery = "",
  themeMode = "dark",
  patientName = "",
}) {
  const Icon = ICON_MAP[node.icon] ?? Folder;
  const isRoot = node.nodeType === "root";
  const isCategory = node.nodeType === "category";
  const childCount = node.children?.length ?? 0;
  const displayTitle = isRoot && patientName ? patientName : node.title;

  const isMatch = Boolean(
    searchQuery.trim() &&
      (node.title?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        node.description
          ?.toLowerCase()
          .includes(searchQuery.trim().toLowerCase())),
  );

  // Track whether the pointer is coarse (touch) so single tap opens details on
  // mobile/tablet without requiring a double click.
  const coarsePointer = useRef(
    typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches,
  );

  const handleClick = () => {
    if (coarsePointer.current) {
      // Touch: single tap opens details directly.
      onOpen?.(node.id);
      return;
    }
    // Desktop: single click selects and expands/collapses a branch.
    onSelect?.(node.id);
    if (hasChildren) onToggle?.(node.id);
  };

  const handleDoubleClick = () => {
    if (coarsePointer.current) return; // touch never double-clicks
    onOpen?.(node.id);
  };

  const handleToggle = (event) => {
    event.stopPropagation();
    onToggle?.(node.id);
  };

  const handleOpen = (event) => {
    event.stopPropagation();
    onOpen?.(node.id);
  };

  const isDark = themeMode === "dark";

  // Google NotebookLM-style capsule styling
  let cardStyles = "";
  let iconWrapStyles = "";
  let badgeStyles = "";
  let toggleStyles = "";
  let openStyles = "";

  if (isDark) {
    if (isRoot) {
      cardStyles =
        "bg-[#253248] text-[#F8FAFC] border-2 border-[#41557A] shadow-xl shadow-black/35 hover:border-[#5A73A3]";
      iconWrapStyles = "bg-[#344563] text-[#A5C2F2]";
      badgeStyles = "bg-[#344563] text-[#A5C2F2]";
      toggleStyles =
        "bg-[#2B394E] border border-[#506685] text-[#A5C2F2] hover:bg-[#394B66] hover:text-white";
      openStyles =
        "bg-[#344563] text-[#A5C2F2] hover:bg-[#3D5275] hover:text-white";
    } else if (isCategory) {
      cardStyles =
        "bg-[#1E293B] text-[#F1F5F9] border border-[#334155] shadow-lg shadow-black/25 hover:border-[#4B5E77]";
      iconWrapStyles = "bg-[#2A374A] text-[#94ADC7]";
      badgeStyles = "bg-[#2A374A] text-[#94ADC7]";
      toggleStyles =
        "bg-[#253346] border border-[#43556D] text-[#94ADC7] hover:bg-[#32445C] hover:text-white";
      openStyles =
        "bg-[#253346] text-[#94ADC7] hover:bg-[#32445C] hover:text-white";
    } else {
      cardStyles =
        "bg-[#172E27] text-[#ECFDF5] border border-[#275043] shadow-md shadow-black/20 hover:border-[#386D5C]";
      iconWrapStyles = "bg-[#214238] text-[#86EFAC]";
      badgeStyles = "bg-[#214238] text-[#86EFAC]";
      toggleStyles =
        "bg-[#214238] border border-[#346253] text-[#86EFAC] hover:bg-[#2B5448] hover:text-white";
      openStyles =
        "bg-[#214238] text-[#86EFAC] hover:bg-[#2B5448] hover:text-white";
    }
  } else {
    // Light botanical garden styling
    if (isRoot) {
      cardStyles =
        "bg-[#0E7C66] text-white border-2 border-[#0A5C4C] shadow-lg shadow-[#0E7C66]/20";
      iconWrapStyles = "bg-white/20 text-white";
      badgeStyles = "bg-white/20 text-white";
      toggleStyles =
        "bg-[#0A5C4C] border border-white/30 text-white hover:bg-[#074236]";
      openStyles = "bg-white/20 text-white hover:bg-white/30";
    } else if (isCategory) {
      cardStyles =
        "bg-[#FFFFFF] text-[#2B2320] border-2 border-[#E5DEC9] shadow-md shadow-[#2B2320]/10";
      iconWrapStyles = "bg-[#FAF6EF] text-[#0E7C66]";
      badgeStyles = "bg-[#F4EFE6] text-[#2B2320]";
      toggleStyles =
        "bg-[#F4EFE6] border border-[#E5DEC9] text-[#0E7C66] hover:bg-[#ECE3D6]";
      openStyles = "bg-[#F4EFE6] text-[#0E7C66] hover:bg-[#ECE3D6]";
    } else {
      cardStyles =
        "bg-[#FAF6EF] text-[#2B2320] border-2 border-[#E5DEC9] shadow-sm";
      iconWrapStyles = "bg-[#F0EAE1] text-[#0E7C66]";
      badgeStyles = "bg-[#F0EAE1] text-[#63584E]";
      toggleStyles =
        "bg-[#FFFFFF] border border-[#E5DEC9] text-[#0E7C66] hover:bg-[#F4EFE6]";
      openStyles = "bg-[#FFFFFF] text-[#0E7C66] hover:bg-[#F4EFE6]";
    }
  }

  const selectedRing = isSelected
    ? "ring-2 ring-[#38BDF8] ring-offset-2 ring-offset-transparent shadow-xl"
    : "";

  const matchRing = isMatch
    ? "ring-4 ring-[#E3A63B] ring-offset-2 ring-offset-transparent scale-105 animate-match-pulse"
    : "";

  // Dynamic Sizing: hug content with sensible min/max constraints
  const dynamicSizeClasses = isRoot
    ? "w-fit min-w-[180px] max-w-xs sm:max-w-md"
    : isCategory
      ? "w-fit min-w-[140px] max-w-xs sm:max-w-sm"
      : "w-fit min-w-[130px] max-w-xs sm:max-w-sm";

  return (
    <div
      data-ocid={`memory.tree.node.${depth}`}
      role="treeitem"
      aria-expanded={hasChildren ? (isExpanded ? "true" : "false") : undefined}
      aria-selected={isSelected}
      aria-label={`${displayTitle}, ${TYPE_LABEL[node.nodeType] ?? "node"}`}
      className={`group relative flex items-center gap-2 rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-2.5 transition-all duration-200 hover:-translate-y-0.5 ${cardStyles} ${selectedRing} ${matchRing} ${dynamicSizeClasses}`}
    >
      {/* Node body — selects/expands on click, opens on double click (desktop)
          or single tap (touch). A real button so it is keyboard accessible. */}
      <button
        type="button"
        data-ocid={`memory.tree.body.${depth}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-0.5 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
      >
        {node.imageUrl ? (
          <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full overflow-hidden border border-white/25 shadow-xs">
            <img
              src={node.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
        ) : (
          <span
            className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full ${iconWrapStyles}`}
          >
            <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.25} />
          </span>
        )}

        <span className="min-w-0 flex-1 overflow-visible">
          <span className="block break-words whitespace-normal font-semibold text-sm sm:text-base leading-tight text-balance">
            {displayTitle}
          </span>

          <span className="mt-0.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
            <span
              className={`inline-block rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${badgeStyles}`}
            >
              {TYPE_LABEL[node.nodeType] ?? node.nodeType}
            </span>

            {isMatch && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E3A63B]/25 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold text-[#E3A63B]">
                <Sparkles className="h-2.5 w-2.5" /> Match
              </span>
            )}

            {!isRoot && !isCategory && node.importance && (
              <span
                className={`inline-block rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                  node.importance === "high"
                    ? "bg-[#C2452D]/25 text-[#C2452D]"
                    : node.importance === "medium"
                      ? "bg-[#E3A63B]/25 text-[#E3A63B]"
                      : isDark
                        ? "bg-[#253346] text-muted-foreground"
                        : "bg-[#E5DEC9] text-[#63584E]"
                }`}
              >
                {IMPORTANCE_LABEL[node.importance]}
              </span>
            )}

            {node.imageUrl && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1 py-0.2 text-[9px] font-bold ${
                  isDark ? "bg-white/10 text-white/80" : "bg-black/10 text-black/80"
                }`}
              >
                <Camera className="h-2 w-2" /> Photo
              </span>
            )}

            {node.audioUrl && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E3A63B]/20 px-1 py-0.2 text-[9px] font-bold text-[#E3A63B]">
                <Volume2 className="h-2 w-2" /> Audio
              </span>
            )}

            {isCategory && childCount > 0 && (
              <span
                className={`inline-block rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                  isDark ? "text-white/60" : "text-black/60"
                }`}
              >
                {childCount}
              </span>
            )}
          </span>
        </span>
      </button>

      {/* Open details button — always visible for accessibility */}
      <button
        type="button"
        data-ocid={`memory.tree.open.${depth}`}
        aria-label={`Open ${node.title}`}
        onClick={handleOpen}
        className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-ring cursor-pointer ${openStyles}`}
      >
        <Eye className="h-4 w-4" strokeWidth={2.2} />
      </button>

      {/* Circular Toggle Hub Disc — positioned at bottom center like NotebookLM output port */}
      {hasChildren && (
        <button
          type="button"
          data-ocid={`memory.tree.toggle.${depth}`}
          aria-label={
            isExpanded
              ? `Collapse ${node.title}`
              : `Expand ${node.title}`
          }
          onClick={handleToggle}
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 hover:scale-115 active:scale-95 focus-visible:outline-2 focus-visible:outline-ring cursor-pointer shadow-md ${toggleStyles}`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-250 ${
              isExpanded ? "rotate-180" : ""
            }`}
            strokeWidth={2.5}
          />
        </button>
      )}
    </div>
  );
}
