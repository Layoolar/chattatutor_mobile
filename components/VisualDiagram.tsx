import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import dagre from "dagre";
import {
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react-native";
import type {
  ConceptType,
  VisualEdge,
  VisualNode,
  VisualSpec,
  VisualType,
} from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { pickAnchorIds } from "@/lib/visual-anchor";
import { isBuildModeEligible } from "@/lib/visual-eligibility";

const DEFAULT_W = 152;
const DEFAULT_H = 84;
const STORYMAP_W = 188;
const LAYER_W = 292;
const LAYER_H = 60;
const TIMELINE_W = 132;
const TIMELINE_H = 80;
const CYCLE_RADIUS = 108;
const GRID_GAP_X = 24;
const GRID_GAP_Y = 24;
const LAYER_GAP = 10;
const TIMELINE_GAP = 28;
const CANVAS_PADDING = 16;
const MAX_DIAGRAM_HEIGHT = 360;
const WALKTHROUGH_STEP_MS = 700;
const CASCADE_STEP_MS = 250;
const ENTRANCE_STEP_MS = 40;
const ENTRANCE_MAX_DELAY_MS = 480;
const READING_SPOTLIGHT_MS = 800;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;
const DOT_GRID_TYPES = new Set<VisualType>(["flow", "network"]);
const CONFETTI_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"];
const VISUAL_TYPES: ReadonlySet<string> = new Set([
  "flow",
  "tree",
  "network",
  "comparison",
  "timeline",
  "cycle",
  "matrix",
  "layers",
  "equation",
  "storymap",
]);

interface Theme {
  hex: string;
  border: string;
  highlightBorder: string;
  highlightBg: string;
  defaultBg: string;
  canvasBg: string;
  softBg: string;
}

const THEMES: Record<VisualType, Theme> = {
  flow: {
    hex: "#6366f1",
    border: "#e2e8f0",
    highlightBorder: "#6366f1",
    highlightBg: "#eef2ff",
    defaultBg: "#ffffff",
    canvasBg: "#f8fafc",
    softBg: "#eef2ff",
  },
  tree: {
    hex: "#10b981",
    border: "#d1fae5",
    highlightBorder: "#10b981",
    highlightBg: "#ecfdf5",
    defaultBg: "#ffffff",
    canvasBg: "#f8fafc",
    softBg: "#ecfdf5",
  },
  network: {
    hex: "#a855f7",
    border: "#e9d5ff",
    highlightBorder: "#a855f7",
    highlightBg: "#faf5ff",
    defaultBg: "#ffffff",
    canvasBg: "#fbf7ff",
    softBg: "#faf5ff",
  },
  comparison: {
    hex: "#06b6d4",
    border: "#cffafe",
    highlightBorder: "#06b6d4",
    highlightBg: "#ecfeff",
    defaultBg: "#ffffff",
    canvasBg: "#f8fafc",
    softBg: "#ecfeff",
  },
  timeline: {
    hex: "#14b8a6",
    border: "#ccfbf1",
    highlightBorder: "#14b8a6",
    highlightBg: "#f0fdfa",
    defaultBg: "#ffffff",
    canvasBg: "#f8fafc",
    softBg: "#f0fdfa",
  },
  cycle: {
    hex: "#f43f5e",
    border: "#fecdd3",
    highlightBorder: "#f43f5e",
    highlightBg: "#fff1f2",
    defaultBg: "#ffffff",
    canvasBg: "#fff7f8",
    softBg: "#fff1f2",
  },
  matrix: {
    hex: "#84cc16",
    border: "#d9f99d",
    highlightBorder: "#65a30d",
    highlightBg: "#f7fee7",
    defaultBg: "#ffffff",
    canvasBg: "#fbfef3",
    softBg: "#f7fee7",
  },
  layers: {
    hex: "#f59e0b",
    border: "#fde68a",
    highlightBorder: "#f59e0b",
    highlightBg: "#fffbeb",
    defaultBg: "#fff7ed",
    canvasBg: "#fffaf2",
    softBg: "#fffbeb",
  },
  equation: {
    hex: "#f97316",
    border: "#fed7aa",
    highlightBorder: "#f97316",
    highlightBg: "#fff7ed",
    defaultBg: "#ffffff",
    canvasBg: "#fff7f0",
    softBg: "#fff7ed",
  },
  storymap: {
    hex: "#0ea5e9",
    border: "#bae6fd",
    highlightBorder: "#0ea5e9",
    highlightBg: "#f0f9ff",
    defaultBg: "#ffffff",
    canvasBg: "#f7fbff",
    softBg: "#f0f9ff",
  },
};

const TYPE_LABELS: Record<VisualType, string> = {
  flow: "Flow diagram",
  tree: "Tree diagram",
  network: "Network map",
  comparison: "Comparison",
  timeline: "Timeline",
  cycle: "Cycle",
  matrix: "Matrix",
  layers: "Layers",
  equation: "Equation map",
  storymap: "Story map",
};

const CONCEPT_LABELS: Record<ConceptType, string> = {
  sequential: "Step-by-step",
  relational: "Related ideas",
  hierarchical: "Hierarchy",
  comparison: "Compare",
  spatial: "Spatial",
  temporal: "Sequence",
  causal: "Cause and effect",
  cyclical: "Cycle",
  categorical: "Categories",
  anatomical: "Anatomy",
  mathematical: "Math",
  narrative: "Narrative",
  argumentative: "Argument",
  procedural: "Procedure",
};

interface Placed {
  node: VisualNode;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Layout {
  nodes: Placed[];
  bounds: { width: number; height: number };
}

interface EdgePath {
  from: { x: number; y: number };
  to: { x: number; y: number };
  edge: VisualEdge;
}

interface BuildCard {
  id: string;
  label: string;
  icon?: string;
  group?: string;
  description?: string;
}

interface VisualDiagramProps {
  visual: VisualSpec | null | undefined;
  conceptType?: ConceptType | null;
  buildMode?: boolean;
  style?: ViewStyle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isVisualType(value: unknown): value is VisualType {
  return typeof value === "string" && VISUAL_TYPES.has(value);
}

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function roundZoom(value: number): number {
  return Math.round(value * 100) / 100;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function shuffledBuildCards(nodes: VisualNode[], anchorSet: Set<string>, visualType: VisualType): BuildCard[] {
  return nodes
    .filter((node) => !anchorSet.has(node.id))
    .map((node) => ({
      id: node.id,
      label: node.label,
      icon: node.icon,
      group: node.group,
      description: node.description,
    }))
    .sort((a, b) => hashString(`${visualType}:${a.id}`) - hashString(`${visualType}:${b.id}`));
}

function relationHintsFor(
  nodeId: string,
  edges: VisualEdge[],
  placedMap: Record<string, boolean>,
  nodeById: Map<string, VisualNode>,
): string[] {
  return edges.flatMap((edge): string[] => {
    const otherId = edge.from === nodeId ? edge.to : edge.to === nodeId ? edge.from : null;
    if (!otherId || !placedMap[otherId]) return [];

    const otherNode = nodeById.get(otherId);
    if (!otherNode) return [];

    const relation = cleanString(edge.label);
    return [relation ? `${relation}: ${otherNode.label}` : otherNode.label];
  });
}

function buildHintForNode(
  node: VisualNode,
  attemptCount: number,
  relationHints: string[],
): string {
  if (attemptCount <= 1 && node.group) {
    return `Look for a concept in ${node.group}.`;
  }

  if (relationHints.length > 0) {
    return `Use the anchor clues: ${relationHints.slice(0, 2).join("; ")}.`;
  }

  if (node.description) return node.description;

  return `The matching concept starts with "${node.label.slice(0, 1)}".`;
}

function normalizeVisualSpec(input: VisualSpec | null | undefined): VisualSpec {
  const raw: Record<string, unknown> = isRecord(input) ? input : {};
  const type = isVisualType(raw.type) ? raw.type : "flow";
  const usedIds = new Set<string>();

  const rawNodes: unknown[] = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges: unknown[] = Array.isArray(raw.edges) ? raw.edges : [];

  const nodes = rawNodes
    .flatMap((item, index): VisualNode[] => {
      if (!isRecord(item)) return [];

      const baseId = cleanString(item.id, `node-${index + 1}`);
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);

      const label = cleanString(item.label, id);
      return [
        {
          id,
          label,
          description: cleanString(item.description) || undefined,
          icon: cleanString(item.icon) || undefined,
          group: cleanString(item.group) || undefined,
          state: item.state === "highlighted" ? "highlighted" : "default",
        },
      ];
    })
    .slice(0, 32);

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = rawEdges.flatMap((item): VisualEdge[] => {
    if (!isRecord(item)) return [];
    const from = cleanString(item.from);
    const to = cleanString(item.to);
    if (!from || !to || !nodeIds.has(from) || !nodeIds.has(to)) return [];
    const style = item.style === "dashed" || item.style === "thick" ? item.style : "solid";
    return [
      {
        from,
        to,
        label: cleanString(item.label) || undefined,
        style,
      },
    ];
  });

  const canvas = isRecord(raw.canvas) ? raw.canvas : {};
  const layout = isRecord(raw.layout) ? raw.layout : {};
  const interaction = isRecord(raw.interaction) ? raw.interaction : {};
  const theme = isRecord(raw.theme) ? raw.theme : {};

  return {
    type,
    canvas: {
      orientation: canvas.orientation === "vertical" ? "vertical" : "horizontal",
      aspectRatio: cleanString(canvas.aspectRatio) || undefined,
    },
    layout: {
      alignment: layout.alignment === "distributed" ? "distributed" : "center",
    },
    nodes,
    edges,
    interaction: {
      clickableNodes: interaction.clickableNodes === false ? false : true,
      highlightSequence: Array.isArray(interaction.highlightSequence)
        ? interaction.highlightSequence.filter((id): id is string => typeof id === "string")
        : undefined,
    },
    theme: {
      title: cleanString(theme.title) || undefined,
      summary: cleanString(theme.summary) || undefined,
    },
  };
}

function getTheme(type: VisualType): Theme {
  return THEMES[type] ?? THEMES.flow;
}

function dimensionsFor(type: VisualType): { width: number; height: number } {
  if (type === "layers") return { width: LAYER_W, height: LAYER_H };
  if (type === "storymap") return { width: STORYMAP_W, height: DEFAULT_H };
  if (type === "timeline" || type === "equation") {
    return { width: TIMELINE_W, height: TIMELINE_H };
  }
  return { width: DEFAULT_W, height: DEFAULT_H };
}

function normalizePlaced(nodes: Placed[]): Layout {
  if (nodes.length === 0) return { nodes: [], bounds: { width: 0, height: 0 } };

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const shifted = nodes.map((node) => ({
    ...node,
    x: node.x - minX,
    y: node.y - minY,
  }));
  const width = Math.max(...shifted.map((node) => node.x + node.width));
  const height = Math.max(...shifted.map((node) => node.y + node.height));

  return { nodes: shifted, bounds: { width, height } };
}

function dagreLayout(
  nodes: VisualNode[],
  edges: VisualEdge[],
  type: VisualType,
  direction: "LR" | "TB",
  nodesep = 58,
  ranksep = 78,
): Layout {
  const { width, height } = dimensionsFor(type);
  try {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: direction, nodesep, ranksep, marginx: 0, marginy: 0 });

    nodes.forEach((node) => graph.setNode(node.id, { width, height }));
    edges.forEach((edge) => graph.setEdge(edge.from, edge.to));
    dagre.layout(graph);

    return normalizePlaced(
      nodes.map((node, index) => {
        const position = graph.node(node.id) as { x?: number; y?: number } | undefined;
        return {
          node,
          index,
          x: (position?.x ?? index * (width + GRID_GAP_X)) - width / 2,
          y: (position?.y ?? 0) - height / 2,
          width,
          height,
        };
      }),
    );
  } catch {
    return normalizePlaced(
      nodes.map((node, index) => ({
        node,
        index,
        x: index * (width + GRID_GAP_X),
        y: 0,
        width,
        height,
      })),
    );
  }
}

function layoutLayers(nodes: VisualNode[]): Layout {
  return normalizePlaced(
    nodes.map((node, index) => ({
      node,
      index,
      x: 0,
      y: index * (LAYER_H + LAYER_GAP),
      width: LAYER_W,
      height: LAYER_H,
    })),
  );
}

function layoutCycle(nodes: VisualNode[]): Layout {
  const count = nodes.length;
  const radius = Math.max(CYCLE_RADIUS, count * 22);
  const centerX = radius + DEFAULT_W / 2;
  const centerY = radius + DEFAULT_H / 2;

  return normalizePlaced(
    nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(1, count) - Math.PI / 2;
      return {
        node,
        index,
        x: centerX + radius * Math.cos(angle) - DEFAULT_W / 2,
        y: centerY + radius * Math.sin(angle) - DEFAULT_H / 2,
        width: DEFAULT_W,
        height: DEFAULT_H,
      };
    }),
  );
}

function layoutTimeline(nodes: VisualNode[]): Layout {
  return normalizePlaced(
    nodes.map((node, index) => ({
      node,
      index,
      x: index * (TIMELINE_W + TIMELINE_GAP),
      y: 0,
      width: TIMELINE_W,
      height: TIMELINE_H,
    })),
  );
}

function layoutGrid(nodes: VisualNode[], forcedCols?: number): Layout {
  const columns = forcedCols ?? Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const { width, height } = dimensionsFor("flow");
  return normalizePlaced(
    nodes.map((node, index) => ({
      node,
      index,
      x: (index % columns) * (width + GRID_GAP_X),
      y: Math.floor(index / columns) * (height + GRID_GAP_Y),
      width,
      height,
    })),
  );
}

function computeLayout(spec: VisualSpec): Layout {
  const orientation = spec.canvas?.orientation === "vertical" ? "TB" : "LR";
  switch (spec.type) {
    case "flow":
      return dagreLayout(spec.nodes, spec.edges, spec.type, orientation);
    case "tree":
      return dagreLayout(spec.nodes, spec.edges, spec.type, "TB", 54, 76);
    case "network":
      return dagreLayout(spec.nodes, spec.edges, spec.type, orientation, 92, 104);
    case "storymap":
      return dagreLayout(spec.nodes, spec.edges, spec.type, "LR", 72, 88);
    case "layers":
      return layoutLayers(spec.nodes);
    case "cycle":
      return layoutCycle(spec.nodes);
    case "timeline":
    case "equation":
      return layoutTimeline(spec.nodes);
    case "matrix":
      return layoutGrid(spec.nodes);
    case "comparison":
      return layoutGrid(spec.nodes, 2);
    default:
      return layoutGrid(spec.nodes);
  }
}

function clipToRect(
  fromX: number,
  fromY: number,
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
): { x: number; y: number } {
  const dx = fromX - centerX;
  const dy = fromY - centerY;
  if (dx === 0 && dy === 0) return { x: centerX, y: centerY };
  const tx = Math.abs(dx) < 1e-6 ? Infinity : halfWidth / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-6 ? Infinity : halfHeight / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: centerX + dx * t, y: centerY + dy * t };
}

function routeEdges(layout: Layout, edges: VisualEdge[]): EdgePath[] {
  const byId = new Map(layout.nodes.map((node) => [node.node.id, node]));
  return edges.flatMap((edge) => {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) return [];

    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2,
    };
    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
    };
    return {
      from: clipToRect(
        targetCenter.x,
        targetCenter.y,
        sourceCenter.x,
        sourceCenter.y,
        source.width / 2,
        source.height / 2,
      ),
      to: clipToRect(
        sourceCenter.x,
        sourceCenter.y,
        targetCenter.x,
        targetCenter.y,
        target.width / 2,
        target.height / 2,
      ),
      edge,
    };
  });
}

function buildRoleLabel(placed: Placed, type: VisualType): string {
  if (placed.node.group) return placed.node.group;
  if (type === "layers") return `Layer ${placed.index + 1}`;
  if (type === "timeline" || type === "equation") return `Step ${placed.index + 1}`;
  if (type === "storymap") return `Chapter ${placed.index + 1}`;
  if (type === "cycle") return `Phase ${placed.index + 1}`;
  if (type === "comparison") return `Side ${(placed.index % 2) + 1}`;
  return `Slot ${placed.index + 1}`;
}

function NodeIconDisc({ icon, theme }: { icon?: string; theme: Theme }) {
  if (!icon) return null;
  return (
    <View
      style={{
        height: 26,
        width: 26,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `${theme.hex}1f`,
      }}
    >
      <Text style={{ fontSize: 14, color: theme.hex }}>{icon}</Text>
    </View>
  );
}

function DefaultNode({
  placed,
  theme,
  highlighted,
  showDescription,
}: {
  placed: Placed;
  theme: Theme;
  highlighted: boolean;
  showDescription: boolean;
}) {
  const { node, width, height } = placed;
  return (
    <View
      style={{
        width,
        minHeight: height,
        borderRadius: 14,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? theme.highlightBorder : theme.border,
        backgroundColor: highlighted ? theme.highlightBg : theme.defaultBg,
        padding: 10,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {node.icon ? (
        <View style={{ marginBottom: 4 }}>
          <NodeIconDisc icon={node.icon} theme={theme} />
        </View>
      ) : null}
      <Text
        style={{ fontSize: 12, fontWeight: "700", color: "#0f172a", textAlign: "center" }}
        numberOfLines={2}
      >
        {node.label}
      </Text>
      {node.group ? (
        <Text
          style={{
            marginTop: 2,
            fontSize: 9,
            fontWeight: "600",
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
          numberOfLines={1}
        >
          {node.group}
        </Text>
      ) : null}
      {showDescription && node.description ? (
        <Text
          style={{ marginTop: 2, fontSize: 10, color: "#64748b", textAlign: "center" }}
          numberOfLines={2}
        >
          {node.description}
        </Text>
      ) : null}
    </View>
  );
}

function LayerNode({
  placed,
  theme,
  highlighted,
}: {
  placed: Placed;
  theme: Theme;
  highlighted: boolean;
}) {
  const { node, width, height } = placed;
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 12,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? theme.highlightBorder : theme.border,
        backgroundColor: highlighted ? theme.highlightBg : theme.defaultBg,
        paddingHorizontal: 14,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        shadowColor: "#0f172a",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <NodeIconDisc icon={node.icon} theme={theme} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#0f172a" }} numberOfLines={1}>
          {node.label}
        </Text>
        {node.group ? (
          <Text
            style={{
              fontSize: 9,
              fontWeight: "600",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
            numberOfLines={1}
          >
            {node.group}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function CycleNode({
  placed,
  theme,
  highlighted,
}: {
  placed: Placed;
  theme: Theme;
  highlighted: boolean;
}) {
  const { node, width, height } = placed;
  return (
    <View
      style={{
        width,
        minHeight: height,
        borderRadius: 999,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? theme.highlightBorder : theme.border,
        backgroundColor: highlighted ? theme.highlightBg : theme.defaultBg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0f172a",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      {node.icon ? (
        <View style={{ marginBottom: 4 }}>
          <NodeIconDisc icon={node.icon} theme={theme} />
        </View>
      ) : null}
      <Text
        style={{ fontSize: 12, fontWeight: "700", color: "#0f172a", textAlign: "center" }}
        numberOfLines={2}
      >
        {node.label}
      </Text>
    </View>
  );
}

function TimelineNode({
  placed,
  theme,
  highlighted,
  showDescription,
}: {
  placed: Placed;
  theme: Theme;
  highlighted: boolean;
  showDescription: boolean;
}) {
  const { node, width, height } = placed;
  return (
    <View
      style={{
        width,
        minHeight: height,
        borderRadius: 14,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? theme.highlightBorder : theme.border,
        backgroundColor: highlighted ? theme.highlightBg : theme.defaultBg,
        paddingHorizontal: 10,
        paddingBottom: 10,
        paddingTop: 18,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: -10,
          height: 24,
          minWidth: 24,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.hex,
          paddingHorizontal: 7,
          shadowColor: theme.hex,
          shadowOpacity: 0.18,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>
          {placed.index + 1}
        </Text>
      </View>
      {node.icon ? (
        <View style={{ marginBottom: 4 }}>
          <NodeIconDisc icon={node.icon} theme={theme} />
        </View>
      ) : null}
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#0f172a", textAlign: "center" }} numberOfLines={2}>
        {node.label}
      </Text>
      {node.group ? (
        <Text style={{ marginTop: 3, color: "#94a3b8", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }} numberOfLines={1}>
          {node.group}
        </Text>
      ) : null}
      {showDescription && node.description ? (
        <Text style={{ marginTop: 3, color: "#64748b", fontSize: 10, lineHeight: 14, textAlign: "center" }} numberOfLines={2}>
          {node.description}
        </Text>
      ) : null}
    </View>
  );
}

function StorymapNode({
  placed,
  theme,
  highlighted,
  showDescription,
}: {
  placed: Placed;
  theme: Theme;
  highlighted: boolean;
  showDescription: boolean;
}) {
  const { node, width, height } = placed;
  return (
    <View
      style={{
        width,
        minHeight: height,
        borderRadius: 14,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? theme.highlightBorder : theme.border,
        backgroundColor: highlighted ? theme.highlightBg : theme.defaultBg,
        overflow: "hidden",
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ height: 5, backgroundColor: theme.hex }} />
      <View style={{ paddingHorizontal: 10, paddingVertical: 9, alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 }}>
          {node.icon ? <NodeIconDisc icon={node.icon} theme={theme} /> : null}
          <Text style={{ color: theme.hex, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Chapter {placed.index + 1}
          </Text>
        </View>
        <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "800", textAlign: "center" }} numberOfLines={2}>
          {node.label}
        </Text>
        {node.group ? (
          <Text style={{ marginTop: 3, color: "#94a3b8", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }} numberOfLines={1}>
            {node.group}
          </Text>
        ) : null}
        {showDescription && node.description ? (
          <Text style={{ marginTop: 3, color: "#64748b", fontSize: 10, lineHeight: 14, textAlign: "center" }} numberOfLines={2}>
            {node.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function NetworkNode({
  placed,
  theme,
  highlighted,
  showDescription,
}: {
  placed: Placed;
  theme: Theme;
  highlighted: boolean;
  showDescription: boolean;
}) {
  const { node, width, height } = placed;
  return (
    <View
      style={{
        width,
        minHeight: height,
        borderRadius: 14,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? theme.highlightBorder : theme.border,
        backgroundColor: highlighted ? theme.highlightBg : theme.defaultBg,
        overflow: "hidden",
        flexDirection: "row",
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ width: 6, backgroundColor: theme.hex }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 10 }}>
        {node.icon ? (
          <View style={{ marginBottom: 4 }}>
            <NodeIconDisc icon={node.icon} theme={theme} />
          </View>
        ) : null}
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#0f172a", textAlign: "center" }} numberOfLines={2}>
          {node.label}
        </Text>
        {node.group ? (
          <Text style={{ marginTop: 3, color: "#94a3b8", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }} numberOfLines={1}>
            {node.group}
          </Text>
        ) : null}
        {showDescription && node.description ? (
          <Text style={{ marginTop: 3, color: "#64748b", fontSize: 10, lineHeight: 14, textAlign: "center" }} numberOfLines={2}>
            {node.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function SlotNode({
  placed,
  type,
  theme,
  active,
  selectedCardId,
}: {
  placed: Placed;
  type: VisualType;
  theme: Theme;
  active: boolean;
  selectedCardId: string | null;
}) {
  return (
    <View
      style={{
        width: placed.width,
        minHeight: placed.height,
        borderRadius: type === "cycle" ? 999 : 14,
        borderWidth: active ? 2 : 1,
        borderStyle: "dashed",
        borderColor: active ? theme.highlightBorder : "#cbd5e1",
        backgroundColor: active ? theme.softBg : "#f8fafc",
        padding: 10,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {placed.node.icon ? (
        <View
          style={{
            height: 24,
            width: 24,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? `${theme.hex}1f` : "#e2e8f0",
            marginBottom: 5,
          }}
        >
          <Text style={{ fontSize: 13, opacity: active ? 0.7 : 0.38 }}>{placed.node.icon}</Text>
        </View>
      ) : null}
      <Text
        style={{
          fontSize: 10,
          fontWeight: "800",
          color: active ? theme.hex : "#94a3b8",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
        numberOfLines={1}
      >
        {buildRoleLabel(placed, type)}
      </Text>
      {placed.node.group ? (
        <Text
          style={{
            marginTop: 3,
            borderRadius: 999,
            backgroundColor: "#ffffffb8",
            paddingHorizontal: 7,
            paddingVertical: 2,
            fontSize: 9,
            fontWeight: "800",
            color: active ? theme.hex : "#94a3b8",
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {placed.node.group}
        </Text>
      ) : null}
      <Text
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: "700",
          color: active ? "#0f172a" : "#94a3b8",
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {active
          ? selectedCardId
            ? "Tap to place"
            : "Pick a card"
          : "Hidden concept"}
      </Text>
    </View>
  );
}

function DiagramNode({
  placed,
  type,
  theme,
  highlighted,
  dimmed,
  visible,
  buildMode,
  buildPlaced,
  buildActive,
  buildAnchor,
  wrong,
  snap,
  selectedCardId,
  showDescription,
  onPress,
}: {
  placed: Placed;
  type: VisualType;
  theme: Theme;
  highlighted: boolean;
  dimmed: boolean;
  visible: boolean;
  buildMode: boolean;
  buildPlaced: boolean;
  buildActive: boolean;
  buildAnchor: boolean;
  wrong: boolean;
  snap: boolean;
  selectedCardId: string | null;
  showDescription: boolean;
  onPress: () => void;
}) {
  const feedbackStyle: ViewStyle = {
    opacity: visible ? (dimmed ? 0.35 : 1) : 0,
    transform: [
      { translateX: wrong ? -4 : 0 },
      { translateY: visible ? 0 : 8 },
      { scale: snap ? 1.03 : 1 },
    ],
  };

  const body = buildMode && !buildPlaced ? (
    <SlotNode
      placed={placed}
      type={type}
      theme={theme}
      active={buildActive}
      selectedCardId={selectedCardId}
    />
  ) : type === "layers" ? (
    <LayerNode placed={placed} theme={theme} highlighted={highlighted} />
  ) : type === "cycle" ? (
    <CycleNode placed={placed} theme={theme} highlighted={highlighted} />
  ) : type === "timeline" || type === "equation" ? (
    <TimelineNode
      placed={placed}
      theme={theme}
      highlighted={highlighted}
      showDescription={showDescription}
    />
  ) : type === "storymap" ? (
    <StorymapNode
      placed={placed}
      theme={theme}
      highlighted={highlighted}
      showDescription={showDescription}
    />
  ) : type === "network" ? (
    <NetworkNode
      placed={placed}
      theme={theme}
      highlighted={highlighted}
      showDescription={showDescription}
    />
  ) : (
    <DefaultNode
      placed={placed}
      theme={theme}
      highlighted={highlighted}
      showDescription={showDescription}
    />
  );

  return (
    <View style={feedbackStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={buildMode ? buildRoleLabel(placed, type) : placed.node.label}
      >
        <View>
          {body}
          {buildMode && buildAnchor ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: -4,
                top: -7,
                borderRadius: 999,
                backgroundColor: "#16a34a",
                paddingHorizontal: 7,
                paddingVertical: 3,
                shadowColor: "#14532d",
                shadowOpacity: 0.12,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900" }}>
                Anchor
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function EdgeConnector({ path, theme, buildMode }: { path: EdgePath; theme: Theme; buildMode: boolean }) {
  const dx = path.to.x - path.from.x;
  const dy = path.to.y - path.from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const strokeWidth = path.edge.style === "thick" ? 3 : 2;
  const dashed = path.edge.style === "dashed";
  const middleX = (path.from.x + path.to.x) / 2;
  const middleY = (path.from.y + path.to.y) / 2;

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
      <View
        style={{
          position: "absolute",
          left: middleX - length / 2,
          top: middleY - strokeWidth / 2,
          width: length,
          height: strokeWidth,
          borderRadius: 999,
          backgroundColor: theme.hex,
          opacity: buildMode ? 0.22 : 0.46,
          transform: [{ rotateZ: `${angle}rad` }],
        }}
      />
      {dashed ? (
        <View
          style={{
            position: "absolute",
            left: middleX - length / 2 + length * 0.33,
            top: middleY - strokeWidth / 2 - 1,
            width: length * 0.16,
            height: strokeWidth + 2,
            backgroundColor: "#ffffff",
            opacity: 0.85,
            transform: [{ rotateZ: `${angle}rad` }],
          }}
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          left: path.to.x - 5,
          top: path.to.y - 5,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: theme.hex,
          opacity: buildMode ? 0.22 : 0.54,
        }}
      />
    </View>
  );
}

function DotGrid({ width, height, color }: { width: number; height: number; color: string }) {
  const dots: React.ReactNode[] = [];
  let count = 0;
  for (let x = 10; x < width && count < 90; x += 28) {
    for (let y = 10; y < height && count < 90; y += 28) {
      dots.push(
        <View
          key={`${x}-${y}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: 3,
            height: 3,
            borderRadius: 2,
            backgroundColor: color,
            opacity: 0.18,
          }}
        />,
      );
      count += 1;
    }
  }
  return <>{dots}</>;
}

function BackgroundFlourish({
  type,
  theme,
  width,
  height,
}: {
  type: VisualType;
  theme: Theme;
  width: number;
  height: number;
}) {
  if (DOT_GRID_TYPES.has(type)) {
    return <DotGrid width={width} height={height} color="#94a3b8" />;
  }

  if (type === "cycle") {
    const ringSize = Math.max(120, Math.min(width, height) * 0.78);
    const innerSize = ringSize * 0.62;
    return (
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
        <View
          style={{
            position: "absolute",
            left: width / 2 - ringSize / 2,
            top: height / 2 - ringSize / 2,
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: 1,
            borderColor: `${theme.hex}22`,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: width / 2 - innerSize / 2,
            top: height / 2 - innerSize / 2,
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            borderWidth: 1,
            borderColor: `${theme.hex}14`,
          }}
        />
      </View>
    );
  }

  if (type === "layers") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 8 + index * (LAYER_H + LAYER_GAP),
              height: LAYER_H,
              backgroundColor: index % 2 === 0 ? `${theme.hex}0f` : `${theme.hex}08`,
            }}
          />
        ))}
      </View>
    );
  }

  if (type === "timeline" || type === "equation") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
        <View
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            top: height / 2,
            height: 2,
            borderRadius: 999,
            backgroundColor: `${theme.hex}2b`,
          }}
        />
        {Array.from({ length: 6 }).map((_, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              left: 16 + index * Math.max(36, (width - 32) / 5),
              top: height / 2 - 7,
              width: 2,
              height: 16,
              borderRadius: 999,
              backgroundColor: `${theme.hex}30`,
            }}
          />
        ))}
      </View>
    );
  }

  if (type === "comparison") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", left: width / 2, top: 8, bottom: 8 }}>
        <View style={{ width: 2, flex: 1, borderRadius: 999, backgroundColor: `${theme.hex}24` }} />
      </View>
    );
  }

  if (type === "tree") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
        <View
          style={{
            position: "absolute",
            left: width * 0.22,
            top: 24,
            width: width * 0.32,
            height: 2,
            borderRadius: 999,
            backgroundColor: `${theme.hex}16`,
            transform: [{ rotateZ: "22deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            right: width * 0.22,
            top: 24,
            width: width * 0.32,
            height: 2,
            borderRadius: 999,
            backgroundColor: `${theme.hex}16`,
            transform: [{ rotateZ: "-22deg" }],
          }}
        />
      </View>
    );
  }

  return null;
}

function StaticConfetti() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {Array.from({ length: 14 }).map((_, index) => {
        const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
        return (
          <View
            key={index}
            style={{
              position: "absolute",
              left: `${8 + ((index * 13) % 82)}%`,
              top: 6 + ((index * 11) % 44),
              width: 5 + (index % 3),
              height: 9 + (index % 4),
              borderRadius: 2,
              backgroundColor: color,
              opacity: 0.72,
              transform: [{ rotateZ: `${(index % 6) * 18}deg` }],
            }}
          />
        );
      })}
    </View>
  );
}

export function VisualDiagram({
  visual: rawVisual,
  conceptType,
  buildMode: buildModeProp = false,
  style,
}: VisualDiagramProps) {
  const { width: windowWidth } = useWindowDimensions();
  const visual = useMemo(() => normalizeVisualSpec(rawVisual), [rawVisual]);
  const buildMode = buildModeProp && isBuildModeEligible(visual);
  const theme = getTheme(visual.type);
  const clickableNodes = visual.interaction?.clickableNodes !== false;
  const highlightSequence = useMemo(
    () =>
      (visual.interaction?.highlightSequence ?? []).filter((id) =>
        visual.nodes.some((node) => node.id === id),
      ),
    [visual.interaction?.highlightSequence, visual.nodes],
  );

  const layout = useMemo(() => computeLayout(visual), [visual]);
  const edgePaths = useMemo(() => routeEdges(layout, visual.edges), [layout, visual.edges]);
  const nodeById = useMemo(
    () => new Map(visual.nodes.map((node) => [node.id, node])),
    [visual.nodes],
  );
  const anchorIds = useMemo(() => pickAnchorIds(visual), [visual]);
  const anchorSet = useMemo(() => new Set(anchorIds), [anchorIds]);
  const playableIds = useMemo(
    () => visual.nodes.filter((node) => !anchorSet.has(node.id)).map((node) => node.id),
    [anchorSet, visual.nodes],
  );

  const [tooltipNode, setTooltipNode] = useState<VisualNode | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [readingSpotlightAnchorId, setReadingSpotlightAnchorId] = useState<string | null>(null);
  const [entranceVisibleCount, setEntranceVisibleCount] = useState(0);
  const [walkthroughIndex, setWalkthroughIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [placedMap, setPlacedMap] = useState<Record<string, boolean>>({});
  const [buildCards, setBuildCards] = useState<BuildCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [wrongAttemptsByNode, setWrongAttemptsByNode] = useState<Record<string, number>>({});
  const [wrongNodeId, setWrongNodeId] = useState<string | null>(null);
  const [snapNodeId, setSnapNodeId] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [buildDone, setBuildDone] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeBuildNodeId = useMemo(() => {
    if (!buildMode || buildDone) return null;
    return playableIds.find((id) => !placedMap[id]) ?? null;
  }, [buildDone, buildMode, placedMap, playableIds]);

  const activeBuildNode = activeBuildNodeId ? nodeById.get(activeBuildNodeId) ?? null : null;
  const selectedCard = selectedCardId ? buildCards.find((card) => card.id === selectedCardId) ?? null : null;
  const activeRelationHints = useMemo(
    () =>
      activeBuildNodeId
        ? relationHintsFor(activeBuildNodeId, visual.edges, placedMap, nodeById)
        : [],
    [activeBuildNodeId, nodeById, placedMap, visual.edges],
  );
  const placedPlayableCount = playableIds.filter((id) => placedMap[id]).length;
  const availableCards = useMemo<BuildCard[]>(
    () => buildCards.filter((card) => !placedMap[card.id]),
    [buildCards, placedMap],
  );

  const resetBuildMode = useCallback(() => {
    const initialPlaced: Record<string, boolean> = {};
    anchorIds.forEach((id) => {
      initialPlaced[id] = true;
    });
    setBuildCards(shuffledBuildCards(visual.nodes, anchorSet, visual.type));
    setPlacedMap(initialPlaced);
    setSelectedCardId(null);
    setWrongAttemptsByNode({});
    setWrongNodeId(null);
    setSnapNodeId(null);
    setHintText(null);
    setBuildDone(playableIds.length === 0);
    setLiveMessage("Build Mode started");
  }, [anchorIds, anchorSet, playableIds.length, visual.nodes, visual.type]);

  useEffect(() => {
    setTooltipNode(null);
    setActiveHighlight(null);
    setReadingSpotlightAnchorId(null);
    setWalkthroughIndex(-1);
    setIsPlaying(false);
    if (buildMode) resetBuildMode();
  }, [buildMode, resetBuildMode, visual]);

  useEffect(() => {
    const nodeCount = layout.nodes.length;
    if (nodeCount === 0) {
      setEntranceVisibleCount(0);
      return;
    }

    setEntranceVisibleCount(0);
    let step = 0;
    const maxStaggeredSteps = Math.max(
      1,
      Math.min(nodeCount, Math.floor(ENTRANCE_MAX_DELAY_MS / ENTRANCE_STEP_MS)),
    );
    const timer = setInterval(() => {
      step += 1;
      if (step >= maxStaggeredSteps) {
        setEntranceVisibleCount(nodeCount);
        clearInterval(timer);
        return;
      }
      setEntranceVisibleCount(step);
    }, ENTRANCE_STEP_MS);

    return () => clearInterval(timer);
  }, [layout.nodes.length, visual.type]);

  useEffect(() => {
    if (buildMode) {
      setReadingSpotlightAnchorId(null);
      return;
    }

    const anchorId = anchorIds[0];
    if (!anchorId) return;

    setReadingSpotlightAnchorId(anchorId);
    const timer = setTimeout(() => setReadingSpotlightAnchorId(null), READING_SPOTLIGHT_MS);
    return () => clearTimeout(timer);
  }, [anchorIds, buildMode, visual]);

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || highlightSequence.length === 0) return;

    const timer = setInterval(() => {
      setWalkthroughIndex((prev) => {
        const next = prev + 1;
        if (next >= highlightSequence.length) {
          setIsPlaying(false);
          setActiveHighlight(null);
          return -1;
        }
        setActiveHighlight(highlightSequence[next]);
        return next;
      });
    }, WALKTHROUGH_STEP_MS);

    return () => clearInterval(timer);
  }, [highlightSequence, isPlaying]);

  useEffect(() => {
    if (activeHighlight) haptics.tick();
  }, [activeHighlight]);

  useEffect(() => {
    if (!buildMode || !buildDone) return;

    const sequence = (highlightSequence.length > 0
      ? highlightSequence
      : visual.nodes.map((node) => node.id)
    ).filter((id) => nodeById.has(id));
    if (sequence.length === 0) return;

    let index = 0;
    setActiveHighlight(sequence[0]);
    const timer = setInterval(() => {
      index += 1;
      if (index >= sequence.length) {
        setActiveHighlight(null);
        clearInterval(timer);
        return;
      }
      setActiveHighlight(sequence[index]);
    }, CASCADE_STEP_MS);

    return () => clearInterval(timer);
  }, [buildDone, buildMode, highlightSequence, nodeById, visual.nodes]);

  const startWalkthrough = useCallback(() => {
    if (highlightSequence.length === 0) return;
    haptics.tap();
    setTooltipNode(null);
    setWalkthroughIndex(0);
    setActiveHighlight(highlightSequence[0]);
    setIsPlaying(true);
  }, [highlightSequence]);

  const resetWalkthrough = useCallback(() => {
    haptics.tick();
    setIsPlaying(false);
    setWalkthroughIndex(-1);
    setActiveHighlight(null);
  }, []);

  const stepForward = useCallback(() => {
    haptics.tick();
    setIsPlaying(false);
    setWalkthroughIndex((prev) => {
      const next = prev + 1;
      if (next >= highlightSequence.length) {
        setActiveHighlight(null);
        return -1;
      }
      setActiveHighlight(highlightSequence[next]);
      return next;
    });
  }, [highlightSequence]);

  const attemptBuildCard = useCallback(
    (cardId: string, targetNodeId = activeBuildNodeId) => {
      if (!targetNodeId) return;

      const target = nodeById.get(targetNodeId);
      if (!target) return;

      setSelectedCardId(cardId);

      if (cardId !== targetNodeId) {
        haptics.error();
        const nextAttemptCount = (wrongAttemptsByNode[targetNodeId] ?? 0) + 1;
        const relationHints = relationHintsFor(targetNodeId, visual.edges, placedMap, nodeById);
        const nextHint = buildHintForNode(target, nextAttemptCount, relationHints);

        setWrongAttemptsByNode((current) => ({ ...current, [targetNodeId]: nextAttemptCount }));
        setHintText(nextHint);
        setLiveMessage(nextAttemptCount === 1 ? nextHint : `Not quite. ${nextHint}`);
        setWrongNodeId(targetNodeId);
        if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = setTimeout(() => setWrongNodeId(null), 500);
        return;
      }

      haptics.success();
      setSelectedCardId(null);
      setHintText(null);
      setSnapNodeId(targetNodeId);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(() => setSnapNodeId(null), 360);
      setPlacedMap((current) => {
        const next = { ...current, [targetNodeId]: true };
        const complete = playableIds.every((id) => next[id]);
        setBuildDone(complete);
        setLiveMessage(complete ? "Build Mode complete" : `${target.label} placed`);
        return next;
      });
    },
    [activeBuildNodeId, nodeById, placedMap, playableIds, visual.edges, wrongAttemptsByNode],
  );

  const handleNodePress = useCallback(
    (placed: Placed) => {
      const nodeId = placed.node.id;

      if (!buildMode) {
        if (!clickableNodes) return;
        haptics.tick();
        setIsPlaying(false);
        setActiveHighlight((current) => (current === nodeId ? null : nodeId));
        setTooltipNode((current) => (current?.id === nodeId ? null : placed.node));
        return;
      }

      if (placedMap[nodeId]) {
        haptics.tick();
        setTooltipNode((current) => (current?.id === nodeId ? null : placed.node));
        return;
      }

      if (nodeId !== activeBuildNodeId) {
        haptics.warning();
        setLiveMessage("Use the highlighted slot first");
        setWrongNodeId(activeBuildNodeId ?? nodeId);
        if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = setTimeout(() => setWrongNodeId(null), 500);
        return;
      }

      if (!selectedCardId) {
        haptics.warning();
        setLiveMessage(activeBuildNode?.description ?? "Choose a concept card for this slot");
        setHintText(
          activeBuildNode?.description ??
            (placed.node.group ? `Look for a concept in ${placed.node.group}.` : null),
        );
        return;
      }

      attemptBuildCard(selectedCardId, nodeId);
    },
    [
      activeBuildNodeId,
      activeBuildNode?.description,
      attemptBuildCard,
      buildMode,
      clickableNodes,
      placedMap,
      selectedCardId,
    ],
  );

  const handleCardPress = useCallback((card: BuildCard) => {
    if (!buildMode || !activeBuildNodeId) {
      haptics.tap();
      setSelectedCardId((current) => (current === card.id ? null : card.id));
      setLiveMessage(`${card.label} selected`);
      return;
    }

    attemptBuildCard(card.id, activeBuildNodeId);
  }, [activeBuildNodeId, attemptBuildCard, buildMode]);

  const handleHint = useCallback(() => {
    if (!activeBuildNodeId) return;
    const target = nodeById.get(activeBuildNodeId);
    if (!target) return;

    haptics.warning();
    setSelectedCardId(null);
    setHintText(target.description ?? `Revealed ${target.label}.`);
    setSnapNodeId(activeBuildNodeId);
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => setSnapNodeId(null), 360);
    setPlacedMap((current) => {
      const next = { ...current, [activeBuildNodeId]: true };
      const complete = playableIds.every((id) => next[id]);
      setBuildDone(complete);
      setLiveMessage(complete ? "Build Mode complete" : `${target.label} revealed`);
      return next;
    });
  }, [activeBuildNodeId, nodeById, playableIds]);

  const contentWidth = Math.max(1, layout.bounds.width);
  const contentHeight = Math.max(1, layout.bounds.height);
  const fallbackViewportWidth = Math.max(220, Math.min(560, windowWidth - 84));
  const availableCanvasWidth = Math.max(
    180,
    (viewportWidth || fallbackViewportWidth) - CANVAS_PADDING * 2,
  );
  const availableCanvasHeight = MAX_DIAGRAM_HEIGHT - CANVAS_PADDING * 2;
  const fitZoom = clampZoom(
    Math.min(1, availableCanvasWidth / contentWidth, availableCanvasHeight / contentHeight),
  );
  const scaledContentWidth = Math.max(1, Math.ceil(contentWidth * zoom));
  const scaledContentHeight = Math.max(1, Math.ceil(contentHeight * zoom));
  const scrollHeight = Math.min(scaledContentHeight, MAX_DIAGRAM_HEIGHT - CANVAS_PADDING * 2);
  const overflowY = scaledContentHeight > scrollHeight;
  const conceptLabel = conceptType ? CONCEPT_LABELS[conceptType] : null;
  const zoomPercent = Math.round(zoom * 100);
  const canZoomOut = zoom > MIN_ZOOM + 0.01;
  const canZoomIn = zoom < MAX_ZOOM - 0.01;
  const zoomedCanvasOffsetX = -((contentWidth - scaledContentWidth) / 2);
  const zoomedCanvasOffsetY = -((contentHeight - scaledContentHeight) / 2);

  useEffect(() => {
    setZoom(roundZoom(fitZoom));
  }, [contentHeight, contentWidth, fitZoom, visual.type]);

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setViewportWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  const handleZoomOut = useCallback(() => {
    haptics.tick();
    setZoom((current) => roundZoom(clampZoom(current - ZOOM_STEP)));
  }, []);

  const handleZoomIn = useCallback(() => {
    haptics.tick();
    setZoom((current) => roundZoom(clampZoom(current + ZOOM_STEP)));
  }, []);

  const handleFitZoom = useCallback(() => {
    haptics.tick();
    setZoom(roundZoom(fitZoom));
  }, [fitZoom]);

  if (visual.nodes.length === 0) {
    return (
      <View
        style={[
          {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            backgroundColor: theme.canvasBg,
            padding: 16,
            alignItems: "center",
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 12, color: "#64748b" }}>No diagram data</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.canvasBg,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View style={{ paddingHorizontal: 12, paddingBottom: 8, paddingTop: 10, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {conceptLabel ? (
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: `${theme.hex}33`,
                backgroundColor: `${theme.hex}12`,
                paddingHorizontal: 9,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: theme.hex, fontSize: 10, fontWeight: "800" }}>
                {conceptLabel}
              </Text>
            </View>
          ) : null}
          <Text
            style={{ flex: 1, color: "#334155", fontSize: 12, fontWeight: "800" }}
            numberOfLines={1}
          >
            {visual.theme?.title || TYPE_LABELS[visual.type]}
          </Text>
        </View>
        {visual.theme?.summary ? (
          <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }} numberOfLines={3}>
            {visual.theme.summary}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800" }}>
            Zoom {zoomPercent}%
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Pressable
              onPress={handleZoomOut}
              disabled={!canZoomOut}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              style={{
                height: 28,
                width: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#ffffff",
                opacity: canZoomOut ? 1 : 0.45,
              }}
            >
              <Minus size={13} color="#475569" />
            </Pressable>
            <Pressable
              onPress={handleFitZoom}
              accessibilityRole="button"
              accessibilityLabel="Fit diagram"
              style={{
                height: 28,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: `${theme.hex}33`,
                backgroundColor: `${theme.hex}12`,
                paddingHorizontal: 9,
              }}
            >
              <Maximize2 size={12} color={theme.hex} />
              <Text style={{ color: theme.hex, fontSize: 10, fontWeight: "900" }}>Fit</Text>
            </Pressable>
            <Pressable
              onPress={handleZoomIn}
              disabled={!canZoomIn}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              style={{
                height: 28,
                width: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#ffffff",
                opacity: canZoomIn ? 1 : 0.45,
              }}
            >
              <Plus size={13} color="#475569" />
            </Pressable>
          </View>
        </View>
        {!buildMode && highlightSequence.length > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {walkthroughIndex === -1 ? (
              <Pressable
                onPress={startWalkthrough}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  backgroundColor: theme.hex,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                }}
              >
                <Play size={12} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}>
                  Walkthrough
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    haptics.tick();
                    setIsPlaying((current) => !current);
                  }}
                  style={{
                    height: 30,
                    width: 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                >
                  {isPlaying ? <Pause size={13} color="#334155" /> : <Play size={13} color="#334155" />}
                </Pressable>
                <Pressable
                  onPress={stepForward}
                  style={{
                    height: 30,
                    width: 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                >
                  <SkipForward size={13} color="#334155" />
                </Pressable>
                <Pressable
                  onPress={resetWalkthrough}
                  style={{
                    height: 30,
                    width: 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                >
                  <RotateCcw size={13} color="#334155" />
                </Pressable>
                <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700" }}>
                  {walkthroughIndex + 1}/{highlightSequence.length}
                </Text>
              </>
            )}
          </View>
        ) : null}
      </View>

      <View onLayout={handleCanvasLayout}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: CANVAS_PADDING }}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: scrollHeight }}
            contentContainerStyle={{ width: scaledContentWidth, height: scaledContentHeight }}
          >
            <View
              style={{
                position: "absolute",
                left: zoomedCanvasOffsetX,
                top: zoomedCanvasOffsetY,
                width: contentWidth,
                height: contentHeight,
                transform: [{ scale: zoom }],
              }}
            >
              <BackgroundFlourish
                type={visual.type}
                theme={theme}
                width={contentWidth}
                height={contentHeight}
              />

              {edgePaths.map((path, index) => (
                <EdgeConnector
                  key={`edge-${index}`}
                  path={path}
                  theme={theme}
                  buildMode={buildMode}
                />
              ))}

              {edgePaths.map((path, index) =>
                path.edge.label ? (
                  <View
                    key={`edge-label-${index}`}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: (path.from.x + path.to.x) / 2 - 38,
                      top: (path.from.y + path.to.y) / 2 - 10,
                      maxWidth: 76,
                      borderRadius: 999,
                      backgroundColor: "#ffffffcc",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: "#64748b", fontSize: 9, fontWeight: "700" }} numberOfLines={1}>
                      {path.edge.label}
                    </Text>
                  </View>
                ) : null,
              )}

              {layout.nodes.map((placed) => {
                const buildPlaced = !buildMode || !!placedMap[placed.node.id];
                const highlighted =
                  activeHighlight === placed.node.id ||
                  readingSpotlightAnchorId === placed.node.id ||
                  tooltipNode?.id === placed.node.id ||
                  placed.node.state === "highlighted" ||
                  (buildMode && activeBuildNodeId === placed.node.id);
                const dimmed = Boolean(
                  !buildMode &&
                    ((activeHighlight && activeHighlight !== placed.node.id) ||
                      (readingSpotlightAnchorId && readingSpotlightAnchorId !== placed.node.id)),
                );
                const visible = placed.index <= entranceVisibleCount;

                return (
                  <View
                    key={placed.node.id}
                    style={{ position: "absolute", left: placed.x, top: placed.y }}
                  >
                    <DiagramNode
                      placed={placed}
                      type={visual.type}
                      theme={theme}
                      highlighted={highlighted}
                      dimmed={dimmed}
                      visible={visible}
                      buildMode={buildMode}
                      buildPlaced={buildPlaced}
                      buildActive={activeBuildNodeId === placed.node.id}
                      buildAnchor={anchorSet.has(placed.node.id)}
                      wrong={wrongNodeId === placed.node.id}
                      snap={snapNodeId === placed.node.id}
                      selectedCardId={selectedCardId}
                      showDescription={!clickableNodes && !buildMode}
                      onPress={() => handleNodePress(placed)}
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      {overflowY ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 6, paddingTop: 4 }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
            Scroll to see more
          </Text>
        </View>
      ) : null}

      {!buildMode && tooltipNode ? (
        <View style={{ margin: 12, marginTop: 0, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff", padding: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {tooltipNode.icon ? <Text style={{ fontSize: 16 }}>{tooltipNode.icon}</Text> : null}
                <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                  {tooltipNode.label}
                </Text>
              </View>
              {tooltipNode.description ? (
                <Text style={{ marginTop: 4, color: "#475569", fontSize: 12, lineHeight: 18 }}>
                  {tooltipNode.description}
                </Text>
              ) : null}
              {tooltipNode.group ? (
                <Text style={{ marginTop: 5, color: "#94a3b8", fontSize: 10, fontWeight: "800" }}>
                  {tooltipNode.group}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => setTooltipNode(null)} hitSlop={8}>
              <X size={16} color="#94a3b8" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {buildMode ? (
        <View style={{ margin: 12, marginTop: 0, gap: 10 }}>
          {!buildDone ? (
            <>
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: `${theme.hex}30`,
                  backgroundColor: `${theme.hex}10`,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <HelpCircle size={14} color={theme.hex} />
                  <Text style={{ flex: 1, color: theme.hex, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {activeBuildNode
                      ? buildRoleLabel(
                          layout.nodes.find((placed) => placed.node.id === activeBuildNode.id) ?? layout.nodes[0],
                          visual.type,
                        )
                      : "Complete"}
                  </Text>
                  <Text style={{ color: theme.hex, fontSize: 11, fontWeight: "900" }}>
                    {placedPlayableCount}/{playableIds.length}
                  </Text>
                </View>
                {activeBuildNode?.description ? (
                  <Text style={{ marginTop: 5, color: "#334155", fontSize: 12, lineHeight: 18, fontWeight: "600" }}>
                    {activeBuildNode.description}
                  </Text>
                ) : null}
                {activeRelationHints.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    <Text style={{ color: theme.hex, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Anchor clues
                    </Text>
                    {activeRelationHints.slice(0, 3).map((hint) => (
                      <Text key={hint} style={{ color: "#475569", fontSize: 11, lineHeight: 16, fontWeight: "700" }}>
                        - {hint}
                      </Text>
                    ))}
                  </View>
                ) : anchorIds.length > 0 && placedPlayableCount === 0 ? (
                  <Text style={{ marginTop: 7, color: "#475569", fontSize: 11, lineHeight: 16, fontWeight: "700" }}>
                    Green Anchor nodes are already filled in. Use them as starter clues.
                  </Text>
                ) : null}
                {selectedCard ? (
                  <View
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-start",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 999,
                      backgroundColor: "#ffffffcc",
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                    }}
                  >
                    {selectedCard.icon ? <Text style={{ fontSize: 12 }}>{selectedCard.icon}</Text> : <HelpCircle size={12} color={theme.hex} />}
                    <Text style={{ color: "#334155", fontSize: 11, fontWeight: "800" }} numberOfLines={1}>
                      Testing {selectedCard.label}
                    </Text>
                  </View>
                ) : null}
                {hintText ? (
                  <Text style={{ marginTop: 5, color: "#b45309", fontSize: 12, lineHeight: 18, fontWeight: "700" }}>
                    {hintText}
                  </Text>
                ) : null}
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {availableCards.map((card) => {
                  const selected = selectedCardId === card.id;
                  const dimmed =
                    !!activeBuildNode?.group && !!card.group && activeBuildNode.group !== card.group;
                  return (
                    <Pressable
                      key={card.id}
                      onPress={() => handleCardPress(card)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 13,
                        borderWidth: 1.5,
                        borderColor: selected ? theme.hex : "#e2e8f0",
                        backgroundColor: selected ? theme.hex : "#ffffff",
                        paddingHorizontal: 11,
                        paddingVertical: 9,
                        opacity: dimmed && !selected ? 0.45 : 1,
                      }}
                    >
                      {card.icon ? <Text style={{ fontSize: 13 }}>{card.icon}</Text> : <HelpCircle size={13} color={selected ? "#ffffff" : theme.hex} />}
                      <View style={{ maxWidth: 180 }}>
                        <Text
                          style={{
                            color: selected ? "#ffffff" : "#334155",
                            fontSize: 12,
                            fontWeight: "800",
                          }}
                          numberOfLines={1}
                        >
                          {card.label}
                        </Text>
                        {card.group ? (
                          <Text
                            style={{
                              color: selected ? "#ffffffcc" : "#94a3b8",
                              fontSize: 9,
                              fontWeight: "800",
                              textTransform: "uppercase",
                              letterSpacing: 0.4,
                            }}
                            numberOfLines={1}
                          >
                            {card.group}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={handleHint}
                  disabled={!activeBuildNodeId}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#fed7aa",
                    backgroundColor: "#fff7ed",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: activeBuildNodeId ? 1 : 0.45,
                  }}
                >
                  <HelpCircle size={13} color="#c2410c" />
                  <Text style={{ color: "#c2410c", fontSize: 12, fontWeight: "800" }}>
                    Hint
                  </Text>
                </Pressable>
                <Text style={{ flex: 1, color: "#64748b", fontSize: 11, lineHeight: 16 }}>
                  {selectedCardId ? "Tap another card or the highlighted slot to retry." : "Tap the concept card that fits the highlighted slot."}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", padding: 14, overflow: "hidden" }}>
              <StaticConfetti />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#166534", fontSize: 14, fontWeight: "900" }}>
                    Build complete
                  </Text>
                  <Text style={{ color: "#15803d", fontSize: 12, marginTop: 2 }}>
                    All concepts are in the right places.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    resetBuildMode();
                  }}
                  style={{ borderRadius: 999, borderWidth: 1, borderColor: "#86efac", paddingHorizontal: 11, paddingVertical: 7 }}
                >
                  <Text style={{ color: "#15803d", fontSize: 12, fontWeight: "800" }}>
                    Try again
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          <Text accessibilityLiveRegion="polite" style={{ height: 0, width: 0, opacity: 0 }}>
            {liveMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default VisualDiagram;
