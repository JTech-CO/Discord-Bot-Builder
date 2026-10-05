import { indexGraph } from '../flow/graph';
import { nodeNumber, type BotEdge, type BotNode } from '../flow/model';
import { isSingleRef, parseRefs, replaceRefs } from '../flow/refs';
import { toText } from '../nodes/sim';
import { getDef, portsOf } from '../nodes/registry';
import type { Props, SimContext, SimEffect, SimEntity, SimInputs, SimValue } from '../nodes/types';
import { t } from '../i18n/t';

export interface SimStep {
  nodeId: string;
  type: string;
  log: string;
  /** Exit taken; null when the flow ended at this step. */
  port: string | null;
  outputs: Record<string, SimValue>;
  effect?: SimEffect;
  error?: string;
}

export interface SimRun {
  triggerId: string;
  status: 'done' | 'no-match' | 'error' | 'limit';
  steps: SimStep[];
  /** Edges the run travelled, for highlighting. */
  edges: string[];
}

export interface SimOptions {
  random?: () => number;
  now?: () => number;
}

const STEP_LIMIT = 500;

const isEntity = (v: SimValue | undefined): v is SimEntity =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && 'kind' in v && 'name' in v;

/** Default values for a trigger's fake-event inputs, overlaid with what the user typed. */
export function triggerInputs(node: BotNode, nodes: BotNode[], edges: BotEdge[], typed: SimInputs = {}): SimInputs {
  const def = getDef(node.data.type);
  const defs = def?.simInputs?.(node.data.props, indexGraph(nodes, edges).view) ?? [];
  return Object.fromEntries(defs.map((d) => [d.key, typed[d.key] ?? d.default]));
}

/**
 * Runs one flow from `triggerId` with a fake event. Nothing leaves the browser: Discord
 * actions become effects to display, and external calls return mock values.
 * `store` persists between runs (stored data, cooldowns) and is mutated in place.
 */
export function runSimulation(
  nodes: BotNode[], edges: BotEdge[], triggerId: string, input: SimInputs, store: Map<string, SimValue>, opts: SimOptions = {},
): SimRun {
  const idx = indexGraph(nodes, edges);
  const random = opts.random ?? Math.random;
  const now = opts.now ?? Date.now;
  const steps: SimStep[] = [];
  const travelled: string[] = [];
  const outputs = new Map<string, Record<string, SimValue>>();

  const trigger = idx.byId.get(triggerId);
  const tdef = trigger && getDef(trigger.data.type);
  if (!trigger || !tdef?.simulateTrigger) {
    return { triggerId, status: 'error', steps: [{ nodeId: triggerId, type: '', log: '', port: null, outputs: {}, error: t('시작할 트리거를 찾지 못했습니다.') }], edges: [] };
  }

  const started = tdef.simulateTrigger(trigger.data.props, input, idx.view);
  outputs.set(trigger.id, started.outputs);
  steps.push({ nodeId: trigger.id, type: tdef.type, log: started.log, port: started.matched ? 'next' : null, outputs: started.outputs });
  if (!started.matched) return { triggerId, status: 'no-match', steps, edges: [] };

  const who = started.outputs.user ?? started.outputs.author;
  const user = isEntity(who) ? who : null;

  const render = (text: string) =>
    replaceRefs(text, (ref) => {
      if (ref.kind === 'env') return t('(환경변수 {0})', [ref.name]);
      if (ref.kind === 'invalid') return ref.raw;
      const v = outputs.get(ref.nodeId)?.[ref.key];
      return v === undefined ? t('(값 없음: #{0}.{1})', [nodeNumber(ref.nodeId), ref.key]) : toText(v);
    });

  const makeContext = (node: BotNode): SimContext => {
    const props: Props = node.data.props;
    const raw = (key: string) => (typeof props[key] === 'string' ? (props[key] as string) : props[key] == null ? '' : String(props[key]));
    return {
      self: node.id,
      props,
      input,
      store,
      user,
      random,
      now,
      text: (key) => render(raw(key)),
      value: (key) => {
        const s = raw(key).trim();
        const ref = isSingleRef(s) ? parseRefs(s)[0] : undefined;
        if (ref?.kind === 'node') return outputs.get(ref.nodeId)?.[ref.key] ?? null;
        return render(s);
      },
      number: (key) => {
        if (typeof props[key] === 'number') return props[key] as number;
        const n = Number(render(raw(key)).trim());
        return Number.isFinite(n) ? n : 0;
      },
    };
  };

  type Cursor = { id: string; port: string };
  let from: Cursor | null = { id: trigger.id, port: 'next' };
  while (from !== null) {
    const cur: Cursor = from;
    const edge: BotEdge | undefined = (idx.out.get(cur.id) ?? []).find((e) => (e.sourceHandle ?? 'next') === cur.port);
    const node: BotNode | undefined = edge && idx.byId.get(edge.target);
    if (!edge || !node) break;
    if (steps.length >= STEP_LIMIT) return { triggerId, status: 'limit', steps, edges: travelled };
    travelled.push(edge.id);

    const def = getDef(node.data.type);
    if (!def?.simulate) {
      steps.push({ nodeId: node.id, type: node.data.type, log: '', port: null, outputs: {}, error: t('시뮬레이터가 이 노드를 지원하지 않습니다.') });
      return { triggerId, status: 'error', steps, edges: travelled };
    }
    let result;
    try {
      result = def.simulate(makeContext(node));
    } catch (err) {
      steps.push({ nodeId: node.id, type: def.type, log: '', port: null, outputs: {}, error: err instanceof Error ? err.message : String(err) });
      return { triggerId, status: 'error', steps, edges: travelled };
    }
    const ports = portsOf(def, node.data.props);
    const port = ports.length ? result.port ?? ports[0].id : null;
    outputs.set(node.id, result.outputs ?? {});
    steps.push({ nodeId: node.id, type: def.type, log: result.log, port, outputs: result.outputs ?? {}, effect: result.effect });
    from = port ? { id: node.id, port } : null;
  }
  return { triggerId, status: 'done', steps, edges: travelled };
}
