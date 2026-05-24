// Build Mode anchor selection. Picks the node(s) that stay visible (pre-placed)
// when Build Mode starts — the "crossword starter letters" the learner reasons
// from. Deterministic and frontend-only, no LLM input.
//
// Ported from web's lib/visual-anchor.ts unchanged so courses produced for
// web have the same starter set on mobile.

import type { VisualSpec } from "./api";

// Anchor count by node count:
//   ≤3 nodes → 0 anchors (too small to matter)
//    4–6     → 1 anchor (the hub)
//    7+      → 2 anchors (hub + secondary)
function anchorCountFor(nodeCount: number): number {
  if (nodeCount <= 3) return 0;
  if (nodeCount <= 6) return 1;
  return 2;
}

function degreeMap(spec: VisualSpec): Map<string, number> {
  const m = new Map<string, number>();
  const nodes = Array.isArray(spec.nodes) ? spec.nodes : [];
  const edges = Array.isArray(spec.edges) ? spec.edges : [];
  for (const n of nodes) m.set(n.id, 0);
  for (const e of edges) {
    m.set(e.from, (m.get(e.from) ?? 0) + 1);
    m.set(e.to, (m.get(e.to) ?? 0) + 1);
  }
  return m;
}

// Sort by degree descending, tie-break by original node order (stable across
// re-renders so the same node always anchors).
export function pickAnchorIds(visual: VisualSpec | null | undefined): string[] {
  if (!visual) return [];
  const nodes = Array.isArray(visual.nodes) ? visual.nodes : [];
  const count = anchorCountFor(nodes.length);
  if (count === 0) return [];

  const degrees = degreeMap(visual);
  const ranked = nodes
    .map((n, idx) => ({ id: n.id, degree: degrees.get(n.id) ?? 0, idx }))
    .sort((a, b) => {
      if (b.degree !== a.degree) return b.degree - a.degree;
      return a.idx - b.idx;
    });

  return ranked.slice(0, count).map((r) => r.id);
}
