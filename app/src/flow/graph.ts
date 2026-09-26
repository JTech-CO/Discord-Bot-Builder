import { getDef, isTrigger } from '../nodes/registry';
import type { GraphView, NodeDef, OutputDef } from '../nodes/types';
import { nodeNumber, type BotEdge, type BotNode } from './model';

export interface GraphIndex {
  nodes: BotNode[];
  byId: Map<string, BotNode>;
  out: Map<string, BotEdge[]>;
  in: Map<string, BotEdge[]>;
  view: GraphView;
}

export function indexGraph(nodes: BotNode[], edges: BotEdge[]): GraphIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, BotEdge[]>();
  const inc = new Map<string, BotEdge[]>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    (out.get(e.source) ?? out.set(e.source, []).get(e.source)!).push(e);
    (inc.get(e.target) ?? inc.set(e.target, []).get(e.target)!).push(e);
  }
  const view: GraphView = {
    nodesOfType: (type) => nodes.filter((n) => n.data.type === type).map((n) => ({ id: n.id, props: n.data.props })),
  };
  return { nodes, byId, out, in: inc, view };
}

/** Nodes reachable from `start` following edges forward, never passing through `blocked`. */
export function reachableFrom(idx: GraphIndex, start: string[], blocked?: string): Set<string> {
  const seen = new Set<string>();
  const stack = start.filter((id) => id !== blocked);
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of idx.out.get(id) ?? []) if (e.target !== blocked) stack.push(e.target);
  }
  return seen;
}

/** Every node that can run before `id` on some path. */
export function ancestors(idx: GraphIndex, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = (idx.in.get(id) ?? []).map((e) => e.source);
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const e of idx.in.get(cur) ?? []) stack.push(e.source);
  }
  return seen;
}

export const triggerIds = (idx: GraphIndex) => idx.nodes.filter((n) => isTrigger(getDef(n.data.type))).map((n) => n.id);

/** Triggers that can start a flow reaching `id` (a trigger reaches itself). */
export function triggersReaching(idx: GraphIndex, id: string): BotNode[] {
  const up = ancestors(idx, id);
  up.add(id);
  return [...up].map((x) => idx.byId.get(x)!).filter((n) => isTrigger(getDef(n.data.type)));
}

/** True when `before` runs on every path from a trigger to `id`, so its outputs are always set. */
export function alwaysRunsBefore(idx: GraphIndex, before: string, id: string): boolean {
  const starts = triggersReaching(idx, id).map((n) => n.id);
  return !reachableFrom(idx, starts, before).has(id);
}

/** Connecting source → target would close a loop if target already reaches source. */
export function wouldCreateCycle(edges: BotEdge[], source: string, target: string): boolean {
  if (source === target) return true;
  const out = new Map<string, string[]>();
  for (const e of edges) (out.get(e.source) ?? out.set(e.source, []).get(e.source)!).push(e.target);
  const stack = [target];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === source) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(out.get(cur) ?? []));
  }
  return false;
}

/** Ids of nodes that sit on a cycle (possible only through imported files). */
export function nodesInCycles(idx: GraphIndex): Set<string> {
  // Kahn's algorithm: whatever cannot be peeled off is on or behind a cycle.
  const indegree = new Map(idx.nodes.map((n) => [n.id, idx.in.get(n.id)?.length ?? 0]));
  const queue = idx.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  while (queue.length) {
    for (const e of idx.out.get(queue.pop()!) ?? []) {
      const d = indegree.get(e.target)! - 1;
      indegree.set(e.target, d);
      if (d === 0) queue.push(e.target);
    }
  }
  const result = new Set<string>();
  for (const [id, d] of indegree) {
    if (d === 0) continue;
    const next = (idx.out.get(id) ?? []).map((e) => e.target);
    if (reachableFrom(idx, next).has(id)) result.add(id);
  }
  return result;
}

export function outputsOf(idx: GraphIndex, node: BotNode, def = getDef(node.data.type)): OutputDef[] {
  return def?.outputs ? def.outputs(node.data.props, idx.view) : [];
}

export interface RefSource {
  node: BotNode;
  def: NodeDef;
  outputs: OutputDef[];
}

/** Upstream nodes whose outputs `id` may reference, ordered by node number. */
export function refSources(idx: GraphIndex, id: string): RefSource[] {
  return [...ancestors(idx, id)]
    .map((x) => idx.byId.get(x)!)
    .map((node) => {
      const def = getDef(node.data.type);
      return def ? { node, def, outputs: outputsOf(idx, node, def) } : null;
    })
    .filter((s): s is RefSource => !!s && s.outputs.length > 0)
    .sort((a, b) => Number(nodeNumber(a.node.id)) - Number(nodeNumber(b.node.id)));
}
