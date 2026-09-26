import { create } from 'zustand';
import type { BotEdge, BotNode } from '../flow/model';
import { validate, type Issue } from '../flow/validate';
import { useProject } from './project';

interface IssueState {
  all: Issue[];
  byNode: Map<string, Issue[]>;
  errors: number;
  warnings: number;
}

const NONE: Issue[] = [];

const sameIssues = (a: Issue[] | undefined, b: Issue[]) =>
  !!a && a.length === b.length && a.every((x, i) => x.level === b[i].level && x.message === b[i].message && x.field === b[i].field);

function compute(nodes: BotNode[], edges: BotEdge[], prev?: IssueState): IssueState {
  const all = validate(nodes, edges);
  const grouped = new Map<string, Issue[]>();
  for (const issue of all) {
    if (!issue.nodeId) continue;
    (grouped.get(issue.nodeId) ?? grouped.set(issue.nodeId, []).get(issue.nodeId)!).push(issue);
  }
  // Reuse unchanged per-node arrays so node cards only re-render when their own issues change.
  const byNode = new Map<string, Issue[]>();
  for (const [id, list] of grouped) {
    const old = prev?.byNode.get(id);
    byNode.set(id, sameIssues(old, list) ? old! : list);
  }
  return {
    all,
    byNode,
    errors: all.filter((i) => i.level === 'error').length,
    warnings: all.filter((i) => i.level === 'warning').length,
  };
}

export const useIssues = create<IssueState>(() => compute(useProject.getState().nodes, useProject.getState().edges));

export const useNodeIssues = (id: string) => useIssues((s) => s.byNode.get(id) ?? NONE);

// Re-validate only when structure or props change, not when nodes are dragged or selected.
let lastNodes = useProject.getState().nodes;
let lastEdges = useProject.getState().edges;

const structureChanged = (nodes: BotNode[], edges: BotEdge[]) =>
  edges !== lastEdges ||
  nodes.length !== lastNodes.length ||
  nodes.some((n, i) => n.id !== lastNodes[i].id || n.data !== lastNodes[i].data);

useProject.subscribe((s) => {
  if (!structureChanged(s.nodes, s.edges)) return;
  lastNodes = s.nodes;
  lastEdges = s.edges;
  useIssues.setState((prev) => compute(s.nodes, s.edges, prev));
});
