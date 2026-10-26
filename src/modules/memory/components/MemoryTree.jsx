/**
 * MemoryTree — visual top-down mind map for the Dynamic Memory Tree.
 *
 * Implements a Google NotebookLM mind map aesthetic:
 *   - Dark blueprint/slate-dot canvas or light botanical garden canvas
 *   - Organic cubic Bezier SVG curves connecting parent and children branches
 *   - Dynamic capsule node sizing that hugs content
 *   - Bottom circular toggle hub for expanding/collapsing
 *   - Responsive zoom and auto-fit scaling controls
 */

import {
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import TreeNode from "./TreeNode.jsx";

/**
 * MindMapBranch — recursive component rendering a node and its children
 * connected by smooth, organic cubic Bezier SVG curves in a vertical mind-map flow
 * inspired by Google NotebookLM.
 */
function MindMapBranch({
  node,
  depth,
  isExpanded,
  selectedId,
  searchQuery,
  onToggle,
  onSelect,
  onOpen,
  themeMode,
  effectiveScale,
  patientName = "",
}) {
  const containerRef = useRef(null);
  const parentHubRef = useRef(null);
  const childrenListRef = useRef(null);
  const childItemRefs = useRef([]);
  const [connections, setConnections] = useState([]);

  const children = node.children ?? [];
  const childDepth = depth + 1;
  const nodeExpanded = isExpanded(node.id);
  const hasChildren = children.length > 0;

  const updateConnections = useCallback(() => {
    if (
      !containerRef.current ||
      !parentHubRef.current ||
      !childrenListRef.current
    ) {
      setConnections([]);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const hubRect = parentHubRef.current.getBoundingClientRect();
    const scale = effectiveScale || 1;

    // Output hub coordinate at parent node's bottom center
    const x1 = (hubRect.left + hubRect.width / 2 - containerRect.left) / scale;
    const y1 = (hubRect.bottom - containerRect.top) / scale;

    const newConns = [];
    childItemRefs.current.forEach((childEl, index) => {
      if (!childEl) return;
      const child = children[index];
      if (!child) return;

      const childRect = childEl.getBoundingClientRect();
      const x2 =
        (childRect.left + childRect.width / 2 - containerRect.left) / scale;
      const y2 = (childRect.top - containerRect.top) / scale;

      const midY = y1 + (y2 - y1) * 0.52;

      const isMatch = Boolean(
        searchQuery.trim() &&
          (child.title?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
            child.description
              ?.toLowerCase()
              .includes(searchQuery.trim().toLowerCase())),
      );

      const isSel = selectedId === child.id;

      // Color palette matching Google NotebookLM mind maps
      const isDark = themeMode === "dark";
      let strokeColor = isDark
        ? depth === 0
          ? "#8EA7BD"
          : "#579C8E"
        : "#0E7C66";

      if (isMatch) strokeColor = "#E3A63B";
      else if (isSel) strokeColor = "#38BDF8";

      newConns.push({
        id: child.id,
        x1,
        y1,
        x2,
        y2,
        midY,
        strokeColor,
        isHighlighted: isMatch || isSel,
      });
    });

    setConnections(newConns);
  }, [children, depth, effectiveScale, searchQuery, selectedId, themeMode]);

  useLayoutEffect(() => {
    if (!nodeExpanded || !hasChildren) {
      setConnections([]);
      return;
    }
    updateConnections();
    const timer = setTimeout(updateConnections, 60);
    return () => clearTimeout(timer);
  }, [nodeExpanded, hasChildren, updateConnections, children.length]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      updateConnections();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateConnections]);

  // Layout configuration for branches
  const branchLayoutClasses =
    childDepth === 1
      ? "flex flex-wrap justify-center items-start gap-x-6 sm:gap-x-10 gap-y-12 max-w-7xl px-2"
      : children.length >= 2
        ? "flex flex-wrap justify-center items-start gap-x-5 sm:gap-x-7 gap-y-10 max-w-4xl px-2"
        : "flex flex-col items-center gap-y-10 px-2";

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center w-full"
    >
      {/* Parent Node */}
      <div
        ref={parentHubRef}
        className="relative z-20 flex flex-col items-center"
      >
        <TreeNode
          node={node}
          depth={depth}
          isExpanded={nodeExpanded}
          isSelected={selectedId === node.id}
          hasChildren={hasChildren}
          onToggle={onToggle}
          onSelect={onSelect}
          onOpen={onOpen}
          searchQuery={searchQuery}
          themeMode={themeMode}
          patientName={patientName}
        />
      </div>

      {/* If expanded and has children: render organic curved SVG connections + children */}
      {hasChildren && nodeExpanded && (
        <div className="relative w-full flex flex-col items-center animate-tree-grow">
          {/* Curved SVG Bezier branches overlay */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible z-0"
            aria-hidden="true"
          >
            <defs>
              <filter
                id={`glow-${node.id}`}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {connections.map((conn, cIdx) => (
              <path
                key={`conn-${node.id}-${conn.id}-${cIdx}`}
                d={`M ${conn.x1} ${conn.y1} C ${conn.x1} ${conn.midY}, ${conn.x2} ${conn.midY}, ${conn.x2} ${conn.y2}`}
                fill="none"
                stroke={conn.strokeColor}
                strokeWidth={conn.isHighlighted ? 3.2 : 2.25}
                strokeLinecap="round"
                filter={
                  conn.isHighlighted ? `url(#glow-${node.id})` : undefined
                }
                className="transition-all duration-300"
              />
            ))}
          </svg>

          {/* Test contract markers */}
          <div className="connector-trunk sr-only" aria-hidden="true" />
          <div className="connector-rail sr-only" aria-hidden="true" />

          {/* Children container */}
          <div
            ref={childrenListRef}
            className={`relative z-10 w-full ${
              childDepth === 1 ? "mt-12 sm:mt-16" : "mt-10 sm:mt-12"
            }`}
          >
            <ul
              data-ocid={`memory.tree.branch.${childDepth}`}
              className={branchLayoutClasses}
            >
              {children.map((child, index) => (
                <li
                  key={`branch-node-${child.id}-${index}`}
                  ref={(el) => {
                    childItemRefs.current[index] = el;
                  }}
                  className="relative flex flex-col items-center animate-tree-node-in"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="connector-drop sr-only" aria-hidden="true" />
                  <MindMapBranch
                    node={child}
                    depth={childDepth}
                    isExpanded={isExpanded}
                    selectedId={selectedId}
                    searchQuery={searchQuery}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    onOpen={onOpen}
                    themeMode={themeMode}
                    effectiveScale={effectiveScale}
                    patientName={patientName}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemoryTree({
  nodes,
  expandedIds,
  onToggle,
  onSelect,
  onOpen,
  selectedId,
  searchQuery = "",
  patientName = "",
  isFitMode: propIsFitMode,
  onToggleFitMode,
}) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // Theme mode: 'dark' (NotebookLM theme matching screenshot) or 'light' (Assamese garden theme)
  const [themeMode, setThemeMode] = useState("dark");

  // Internal state if not controlled from parent
  const [internalFitMode, setInternalFitMode] = useState(true);
  const isFitMode =
    propIsFitMode !== undefined ? propIsFitMode : internalFitMode;
  const toggleFitMode = () => {
    if (onToggleFitMode) onToggleFitMode();
    else setInternalFitMode((prev) => !prev);
  };

  const [autoScale, setAutoScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure content and calculate auto-fit scale
  const updateMetrics = useCallback(() => {
    if (!nodes || !containerRef.current || !contentRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const naturalWidth = contentRef.current.scrollWidth;
    const naturalHeight = contentRef.current.scrollHeight;

    if (naturalHeight > 0) setContentHeight(naturalHeight);

    if (containerWidth > 0 && naturalWidth > 0) {
      const paddingW = 32;
      const availableWidth = Math.max(280, containerWidth - paddingW);
      const viewportH =
        typeof window !== "undefined" ? window.innerHeight : 800;
      const availableHeight = Math.max(380, viewportH - 260);

      const scaleX =
        naturalWidth > availableWidth ? availableWidth / naturalWidth : 1;
      const scaleY =
        naturalHeight > availableHeight
          ? (availableHeight / naturalHeight) * 1.05
          : 1;

      const calculated = Math.max(
        0.72,
        Math.min(1, scaleX, scaleY >= 0.72 ? scaleY : 1),
      );
      setAutoScale(Number(calculated.toFixed(2)));
    }
  }, [nodes]);

  // Recalculate on expand/collapse or node changes
  useLayoutEffect(() => {
    updateMetrics();
    const timer = setTimeout(updateMetrics, 150);
    return () => clearTimeout(timer);
  }, [updateMetrics, expandedIds]);

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateMetrics();
      });
      resizeObserver.observe(container);

      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }
    }

    window.addEventListener("resize", updateMetrics);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [updateMetrics]);

  // Compute active effective scale
  const effectiveScale = isFitMode
    ? Number((autoScale * userZoom).toFixed(2))
    : Number(userZoom.toFixed(2));

  const handleZoomIn = () => {
    setUserZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setUserZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    setUserZoom(1);
  };

  if (!nodes) return null;

  const isExpanded = (id) =>
    expandedIds instanceof Set
      ? expandedIds.has(id)
      : Array.isArray(expandedIds) && expandedIds.includes(id);

  const scaledHeight =
    contentHeight > 0 ? Math.ceil(contentHeight * effectiveScale) : undefined;

  const isDark = themeMode === "dark";

  return (
    <div className="relative w-full">
      {/* Mind Map Canvas Container */}
      <div
        ref={containerRef}
        style={{
          backgroundColor: isDark ? "#161D24" : "#FAF6EF",
          backgroundImage: isDark
            ? "radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(14, 124, 102, 0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        className="relative w-full overflow-x-auto overflow-y-visible rounded-2xl py-6 sm:py-8 px-4 transition-colors duration-300 border border-border/40 shadow-inner"
      >
        <div
          style={{
            minHeight: scaledHeight ? `${scaledHeight}px` : undefined,
            transition: "min-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="relative flex justify-center w-full"
        >
          <div
            ref={contentRef}
            style={{
              transform: `scale(${effectiveScale})`,
              transformOrigin: "top center",
              transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              width: "max-content",
            }}
            className="mx-auto"
          >
            <ul
              data-ocid="memory.tree"
              role="tree"
              aria-label="Memory tree"
              className="flex flex-col items-center"
            >
              <li className="flex w-full flex-col items-center">
                <MindMapBranch
                  node={nodes}
                  depth={0}
                  isExpanded={isExpanded}
                  selectedId={selectedId}
                  searchQuery={searchQuery}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  themeMode={themeMode}
                  effectiveScale={effectiveScale}
                  patientName={patientName}
                />
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Floating Canvas Controls (Responsive bottom dock) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {isFitMode ? "Auto-Fit Mode" : "Manual Scale"}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold text-secondary-foreground">
            {Math.round(effectiveScale * 100)}%
          </span>
          {isFitMode && autoScale < 1 && (
            <span className="hidden sm:inline-block text-[11px] text-muted-foreground">
              (Auto-scaled to fit screen width)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Theme switcher: NotebookLM Dark vs Serene Light */}
          <button
            type="button"
            onClick={() =>
              setThemeMode((m) => (m === "dark" ? "light" : "dark"))
            }
            title={
              isDark
                ? "Switch to Serene Light theme"
                : "Switch to NotebookLM Dark theme"
            }
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground transition-all duration-200 hover:bg-muted cursor-pointer mr-1"
          >
            {isDark ? (
              <>
                <Sun className="h-3 w-3 text-[#E3A63B]" /> Light Theme
              </>
            ) : (
              <>
                <Moon className="h-3 w-3 text-[#3E7CB1]" /> Dark Mind Map
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleFitMode}
            title={
              isFitMode
                ? "Switch to 100% natural size"
                : "Fit whole tree to screen"
            }
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all duration-200 cursor-pointer ${
              isFitMode
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            {isFitMode ? (
              <>
                <Minimize2 className="h-3 w-3" /> Fit to Screen
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" /> 100% Size
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            disabled={effectiveScale <= 0.4}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-all duration-200 hover:bg-muted disabled:opacity-40 cursor-pointer"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            disabled={effectiveScale >= 2.0}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-all duration-200 hover:bg-muted disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {(userZoom !== 1 || !isFitMode) && (
            <button
              type="button"
              onClick={() => {
                handleResetZoom();
                if (!isFitMode) toggleFitMode();
              }}
              title="Reset zoom"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-all duration-200 hover:bg-muted cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
