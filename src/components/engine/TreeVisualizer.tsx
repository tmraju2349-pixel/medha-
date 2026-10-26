/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive Decision Tree Visualizer
 * Renders the ML Random Tree structure with active path highlight
 */

import React, { useMemo } from 'react';
import type { DecisionTreeNode, CognitiveState } from '../../modules/medha/types';
import { FEATURE_METADATA } from '../../modules/medha/ml/trainingData';

interface TreeVisualizerProps {
  root: DecisionTreeNode | null;
  activePathNodeIds: string[];
  onSelectNode?: (node: DecisionTreeNode) => void;
  selectedNodeId?: string | null;
}

interface LayoutNode {
  node: DecisionTreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutNode[];
}

const STATE_COLORS: Record<CognitiveState, { bg: string; text: string; border: string; glow: string }> = {
  OPTIMAL_ENGAGED: {
    bg: 'bg-emerald-950/80',
    text: 'text-emerald-300',
    border: 'border-emerald-500',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  COGNITIVE_FATIGUE: {
    bg: 'bg-amber-950/80',
    text: 'text-amber-300',
    border: 'border-amber-500',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  ATTENTIONAL_LAPSE: {
    bg: 'bg-blue-950/80',
    text: 'text-blue-300',
    border: 'border-blue-500',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  CONFUSION_OVERLOAD: {
    bg: 'bg-purple-950/80',
    text: 'text-purple-300',
    border: 'border-purple-500',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
  POTENTIAL_DECLINE: {
    bg: 'bg-rose-950/80',
    text: 'text-rose-300',
    border: 'border-rose-500',
    glow: 'rgba(244, 63, 94, 0.5)',
  },
};

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  root,
  activePathNodeIds,
  onSelectNode,
  selectedNodeId,
}) => {
  const activeSet = useMemo(() => new Set(activePathNodeIds), [activePathNodeIds]);

  // Compute hierarchical coordinates for SVG rendering
  const layout = useMemo(() => {
    if (!root) return null;

    const nodeWidth = 160;
    const nodeHeight = 68;
    const levelHeight = 110;

    // First pass: assign x positions based on leaf index
    let leafCounter = 0;
    function computePositions(node: DecisionTreeNode, depth: number): LayoutNode {
      if (node.isLeaf || (!node.left && !node.right)) {
        const x = leafCounter * (nodeWidth + 24) + 40;
        leafCounter++;
        return {
          node,
          x,
          y: depth * levelHeight + 30,
          width: nodeWidth,
          height: nodeHeight,
          children: [],
        };
      }

      const children: LayoutNode[] = [];
      if (node.left) children.push(computePositions(node.left, depth + 1));
      if (node.right) children.push(computePositions(node.right, depth + 1));

      const avgX = children.reduce((acc, c) => acc + c.x, 0) / children.length;
      return {
        node,
        x: avgX,
        y: depth * levelHeight + 30,
        width: nodeWidth,
        height: nodeHeight,
        children,
      };
    }

    const tree = computePositions(root, 0);
    const totalWidth = Math.max(860, leafCounter * (nodeWidth + 24) + 80);
    const totalHeight = 4 * levelHeight + 120;

    return { tree, totalWidth, totalHeight };
  }, [root]);

  if (!layout) {
    return (
      <div className="p-8 text-center text-slate-400">
        No tree model generated yet.
      </div>
    );
  }

  // Collect all links (edges)
  const links: {
    from: { x: number; y: number; id: string };
    to: { x: number; y: number; id: string };
    branchLabel: string;
    isActive: boolean;
  }[] = [];

  function collectLinks(layoutNode: LayoutNode) {
    layoutNode.children.forEach((child, idx) => {
      const isLeft = idx === 0;
      const isActive =
        activeSet.has(layoutNode.node.id) && activeSet.has(child.node.id);
      links.push({
        from: {
          x: layoutNode.x + layoutNode.width / 2,
          y: layoutNode.y + layoutNode.height,
          id: layoutNode.node.id,
        },
        to: {
          x: child.x + child.width / 2,
          y: child.y,
          id: child.node.id,
        },
        branchLabel: isLeft ? '≤ True' : '> False',
        isActive,
      });
      collectLinks(child);
    });
  }
  collectLinks(layout.tree);

  // Flatten nodes for rendering
  const flatNodes: LayoutNode[] = [];
  function collectNodes(n: LayoutNode) {
    flatNodes.push(n);
    n.children.forEach(collectNodes);
  }
  collectNodes(layout.tree);

  return (
    <div className="w-full overflow-x-auto rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-200">
            ML Decision Tree Architecture &amp; Active Inference Path
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-emerald-500 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            Active Real-time Path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-slate-700 rounded-sm" />
            Alternate Branch
          </span>
        </div>
      </div>

      <div className="relative min-w-[860px]" style={{ height: layout.totalHeight }}>
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={layout.totalWidth}
          height={layout.totalHeight}
        >
          <defs>
            <linearGradient id="activeEdgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Render Connections */}
          {links.map((link, i) => {
            const pathD = `M ${link.from.x} ${link.from.y} C ${link.from.x} ${
              (link.from.y + link.to.y) / 2
            }, ${link.to.x} ${(link.from.y + link.to.y) / 2}, ${link.to.x} ${link.to.y}`;

            return (
              <g key={`link_${i}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={link.isActive ? 'url(#activeEdgeGradient)' : '#334155'}
                  strokeWidth={link.isActive ? 3 : 1.5}
                  strokeDasharray={link.isActive ? 'none' : '4 4'}
                  filter={link.isActive ? 'url(#glowEffect)' : undefined}
                  className="transition-all duration-300"
                />
                {/* Branch Condition Label */}
                <rect
                  x={(link.from.x + link.to.x) / 2 - 24}
                  y={(link.from.y + link.to.y) / 2 - 8}
                  width="48"
                  height="16"
                  rx="4"
                  fill={link.isActive ? '#064e3b' : '#0f172a'}
                  stroke={link.isActive ? '#10b981' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x={(link.from.x + link.to.x) / 2}
                  y={(link.from.y + link.to.y) / 2 + 4}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-slate-300"
                >
                  {link.branchLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Render Interactive Nodes */}
        {flatNodes.map(({ node, x, y, width, height }) => {
          const isActive = activeSet.has(node.id);
          const isSelected = selectedNodeId === node.id;
          const featMeta = node.feature ? FEATURE_METADATA[node.feature] : null;

          if (node.isLeaf && node.prediction) {
            const style = STATE_COLORS[node.prediction];
            return (
              <div
                key={node.id}
                id={`tree-node-${node.id}`}
                onClick={() => onSelectNode?.(node)}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                }}
                className={`absolute cursor-pointer rounded-xl border p-2 flex flex-col justify-between transition-all duration-300 ${
                  style.bg
                } ${style.border} ${
                  isActive
                    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)] z-20'
                    : 'opacity-70 hover:opacity-100'
                } ${isSelected ? 'outline outline-2 outline-white' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                    Leaf Decision
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                    N={node.samplesCount}
                  </span>
                </div>
                <div className={`text-xs font-bold truncate ${style.text}`}>
                  {node.prediction.replace('_', ' ')}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Gini: {node.impurity.toFixed(2)}</span>
                  {isActive && <span className="text-emerald-400 font-bold">● Active</span>}
                </div>
              </div>
            );
          }

          // Split Internal Node
          return (
            <div
              key={node.id}
              id={`tree-node-${node.id}`}
              onClick={() => onSelectNode?.(node)}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
              className={`absolute cursor-pointer rounded-xl border p-2 flex flex-col justify-between transition-all duration-300 bg-slate-900/90 ${
                isActive
                  ? 'border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/80 z-20'
                  : 'border-slate-700/80 opacity-75 hover:opacity-100 hover:border-slate-500'
              } ${isSelected ? 'outline outline-2 outline-white' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-cyan-400 truncate max-w-[90px]">
                  {featMeta ? featMeta.name : node.feature}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  N={node.samplesCount}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-100 font-mono">
                ≤ {node.threshold} {featMeta?.unit}
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>Gini: {node.impurity.toFixed(2)}</span>
                {isActive && <span className="text-emerald-400 font-bold">In Path</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
