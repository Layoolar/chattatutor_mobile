// Build Mode eligibility predicate. Single source of truth for "should we
// offer Build Mode for this visual?". Ported from the web frontend's
// lib/visual-eligibility.ts — the rule set is identical so a course generated
// for web is playable on mobile and vice versa.

import type { VisualSpec, VisualType } from "./api";

// Visual types whose layouts can carry the structural scaffolding (group,
// role, order) that makes Build Mode a reasoning task rather than guessing.
const ELIGIBLE_TYPES: ReadonlySet<VisualType> = new Set<VisualType>([
  "flow",
  "tree",
  "cycle",
  "layers",
  "comparison",
  "storymap",
]);

const MIN_PLAYABLE_NODES = 4;
const MAX_PLAYABLE_NODES = 8;

function nodesFor(spec: VisualSpec): VisualSpec["nodes"] {
  return Array.isArray(spec.nodes) ? spec.nodes : [];
}

function edgesFor(spec: VisualSpec): VisualSpec["edges"] {
  return Array.isArray(spec.edges) ? spec.edges : [];
}

function buildAdjacency(spec: VisualSpec): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const nodeIds = new Set<string>();
  for (const n of nodesFor(spec)) {
    adj.set(n.id, new Set());
    nodeIds.add(n.id);
  }
  for (const e of edgesFor(spec)) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    adj.get(e.from)!.add(e.to);
    adj.get(e.to)!.add(e.from);
  }
  return adj;
}

// Reject visuals with edges that reference unknown node ids — a dangling
// edge means the LLM produced a malformed graph.
function hasOnlyKnownEdges(spec: VisualSpec): boolean {
  const nodeIds = new Set(nodesFor(spec).map((n) => n.id));
  for (const e of edgesFor(spec)) {
    if (!nodeIds.has(e.from)) return false;
    if (!nodeIds.has(e.to)) return false;
  }
  return true;
}

function isConnected(spec: VisualSpec): boolean {
  const nodes = nodesFor(spec);
  if (nodes.length === 0) return false;
  const adj = buildAdjacency(spec);
  const seen = new Set<string>();
  const stack: string[] = [nodes[0].id];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const neighbours = adj.get(id);
    if (neighbours) for (const n of neighbours) stack.push(n);
  }
  return seen.size === nodes.length;
}

function hasDistinctLabels(spec: VisualSpec): boolean {
  const seen = new Set<string>();
  for (const n of nodesFor(spec)) {
    const key = (n.label || "").trim().toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

// `layers` / `comparison` must have `group` on every node (their whole point
// is column/row/stratum membership). Other eligible types just need ≥60% of
// nodes to carry either a group or a meaningful description.
function hasReasoningScaffolding(spec: VisualSpec): boolean {
  const nodes = nodesFor(spec);
  if (nodes.length === 0) return false;

  if (spec.type === "layers" || spec.type === "comparison") {
    return nodes.every((n) => !!(n.group && n.group.trim()));
  }

  let scored = 0;
  for (const n of nodes) {
    const hasGroup = !!(n.group && n.group.trim());
    const hasDescription = !!(n.description && n.description.trim().length >= 8);
    if (hasGroup || hasDescription) scored++;
  }
  return scored / spec.nodes.length >= 0.6;
}

export function isBuildModeEligible(visual: VisualSpec | null | undefined): boolean {
  if (!visual) return false;
  if (!ELIGIBLE_TYPES.has(visual.type)) return false;

  const n = nodesFor(visual).length;
  if (n < MIN_PLAYABLE_NODES || n > MAX_PLAYABLE_NODES) return false;

  if (!hasDistinctLabels(visual)) return false;
  if (!hasOnlyKnownEdges(visual)) return false;
  if (!isConnected(visual)) return false;
  if (!hasReasoningScaffolding(visual)) return false;

  return true;
}
