import { list, rows, str } from '../nodes/helpers';
import { fieldVisible, getDef, isTrigger, portsOf } from '../nodes/registry';
import type { FieldDef, ValueType } from '../nodes/types';
import {
  alwaysRunsBefore, ancestors, indexGraph, nodesInCycles, outputsOf, reachableFrom, triggerIds, triggersReaching,
  type GraphIndex,
} from './graph';
import { nodeNumber, type BotEdge, type BotNode } from './model';
import { isSingleRef, parseRefs } from './refs';

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  key: string;
  level: IssueLevel;
  message: string;
  nodeId?: string;
  field?: string;
}

export const TYPE_LABEL: Record<ValueType, string> = {
  text: '텍스트', number: '숫자', boolean: '참/거짓', user: '사용자', member: '멤버', channel: '채널',
  role: '역할', message: '메시지', list: '목록', object: '객체', any: '값',
};

const accepts = (wanted: ValueType[], got: ValueType) =>
  got === 'any' || wanted.includes(got) || (got === 'member' && wanted.includes('user'));

export function validate(nodes: BotNode[], edges: BotEdge[]): Issue[] {
  const idx = indexGraph(nodes, edges);
  const issues: Issue[] = [];
  const push = (level: IssueLevel, message: string, nodeId?: string, field?: string) =>
    issues.push({ key: `${nodeId ?? '-'}|${field ?? '-'}|${issues.length}`, level, message, nodeId, field });

  const triggers = triggerIds(idx);
  if (nodes.length > 0 && triggers.length === 0) {
    push('warning', '트리거가 없습니다. 모든 흐름은 트리거에서 시작합니다.');
  }

  for (const id of nodesInCycles(idx)) {
    push('error', '순환 연결에 포함되어 있습니다. 반복이 필요하면 선을 끊고 다른 방법을 쓰세요.', id);
  }

  const live = reachableFrom(idx, triggers);

  for (const node of nodes) {
    const def = getDef(node.data.type);
    if (!def) {
      push('error', `알 수 없는 노드 종류입니다: ${node.data.type}`, node.id);
      continue;
    }
    const props = node.data.props;

    if (!isTrigger(def) && !live.has(node.id)) {
      push('warning', '트리거와 이어져 있지 않아 실행되지 않습니다.', node.id);
    }

    const portIds = new Set(portsOf(def, props).map((p) => p.id));
    if ((idx.out.get(node.id) ?? []).some((e) => !portIds.has(e.sourceHandle ?? 'next'))) {
      push('error', '없어진 갈래에 연결된 선이 있습니다. 그 선을 지워 주세요.', node.id);
    }

    const startedBy = isTrigger(def) ? [] : triggersReaching(idx, node.id).map((t) => getDef(t.data.type)!);
    if (def.needs && startedBy.some((t) => t.provides && !def.needs!.includes(t.provides))) {
      push('error', '명령어나 버튼으로 시작한 흐름에서만 쓸 수 있습니다.', node.id);
    }
    if (def.type === 'action.showModal' && startedBy.some((t) => t.type === 'trigger.modalSubmit')) {
      push('error', '모달 제출에 대한 응답으로 또 모달을 띄울 수 없습니다.', node.id);
    }
    if (def.type === 'action.sendMessage' && (str(props, 'target') || 'reply') === 'reply' && startedBy.some((t) => t.provides === 'event')) {
      push('error', '이벤트로 시작한 흐름에는 답장할 대상이 없습니다. "특정 채널"이나 "사용자 DM"을 고르세요.', node.id, 'target');
    }

    for (const field of def.fields) {
      if (fieldVisible(field, props)) checkField(field, props[field.key], node, idx, push);
    }

    for (const r of def.check?.(props, node.id, idx.view) ?? []) push(r.level, r.message, node.id, r.field);
  }

  const rank = (i: Issue) => (i.level === 'error' ? 0 : 1);
  const num = (i: Issue) => (i.nodeId ? Number(nodeNumber(i.nodeId)) : -1);
  return issues.sort((a, b) => rank(a) - rank(b) || num(a) - num(b));
}

type Push = (level: IssueLevel, message: string, nodeId?: string, field?: string) => void;

function checkField(f: FieldDef, value: unknown, node: BotNode, idx: GraphIndex, push: Push) {
  const err = (message: string) => push('error', message, node.id, f.key);
  const warn = (message: string) => push('warning', message, node.id, f.key);
  const missing = () => err(`"${f.label}" 항목이 비어 있습니다.`);

  switch (f.kind) {
    case 'text':
    case 'textarea': {
      const s = typeof value === 'string' ? value : '';
      if (!s.trim()) {
        if (f.required) missing();
        return;
      }
      if (f.maxLength && s.length > f.maxLength) err(`"${f.label}"은(는) ${f.maxLength}자까지 쓸 수 있습니다.`);
      if (f.pattern && !f.pattern.regex.test(s.trim())) err(`"${f.label}": ${f.pattern.message}`);
      const refs = parseRefs(s);
      if (refs.length && !f.refs) {
        err(`"${f.label}"에는 변수를 넣을 수 없습니다.`);
        return;
      }
      checkRefs(s, f.label, node, idx, err, warn, Array.isArray(f.refs) ? f.refs : undefined);
      return;
    }
    case 'number': {
      if (value === undefined || value === null || value === '') {
        if (f.required) missing();
        return;
      }
      if (typeof value !== 'number' || !Number.isFinite(value)) return err(`"${f.label}"에는 숫자를 넣어 주세요.`);
      if (f.min !== undefined && value < f.min) err(`"${f.label}"은(는) ${f.min} 이상이어야 합니다.`);
      if (f.max !== undefined && value > f.max) err(`"${f.label}"은(는) ${f.max} 이하여야 합니다.`);
      return;
    }
    case 'select': {
      const s = typeof value === 'string' ? value : f.default;
      if (!f.options.some((o) => o.value === s)) err(`"${f.label}"의 선택값이 올바르지 않습니다.`);
      return;
    }
    case 'color': {
      if (value !== undefined && !(typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value))) {
        err(`"${f.label}"은(는) #RRGGBB 형식이어야 합니다.`);
      }
      return;
    }
    case 'list': {
      const items = list({ v: value }, 'v');
      if (f.required && !items.some((s) => s.trim())) return missing();
      if (items.length > f.maxItems) err(`"${f.label}"은(는) ${f.maxItems}개까지 넣을 수 있습니다.`);
      if (items.some((s) => !s.trim())) warn(`"${f.label}"에 빈 항목이 있습니다.`);
      if (f.maxLength && items.some((s) => s.length > f.maxLength!)) err(`"${f.label}"의 각 항목은 ${f.maxLength}자까지 쓸 수 있습니다.`);
      return;
    }
    case 'table': {
      const rs = rows({ v: value }, 'v');
      if (f.required && rs.length === 0) return missing();
      if (rs.length > f.maxRows) err(`"${f.label}"은(는) ${f.maxRows}개까지 넣을 수 있습니다.`);
      rs.forEach((row, i) => {
        for (const c of f.columns) {
          const cell = `"${f.label}" ${i + 1}번째의 "${c.label}"`;
          const v = row[c.key];
          if (c.kind === 'select') {
            if (v !== undefined && !c.options?.some((o) => o.value === v)) err(`${cell} 선택값이 올바르지 않습니다.`);
            continue;
          }
          if (c.kind !== 'text') continue;
          const s = typeof v === 'string' ? v : '';
          if (!s.trim()) {
            if (c.required) err(`${cell} 칸이 비어 있습니다.`);
            continue;
          }
          if (c.maxLength && s.length > c.maxLength) err(`${cell} 칸은 ${c.maxLength}자까지 쓸 수 있습니다.`);
          if (c.pattern && !c.pattern.regex.test(s.trim())) err(`${cell}: ${c.pattern.message}`);
          checkRefs(s, f.label, node, idx, err, warn);
        }
      });
      for (const c of f.columns.filter((c) => c.unique)) {
        const values = rs.map((r) => r[c.key]).filter((v): v is string => typeof v === 'string' && !!v);
        const dup = values.find((v, i) => values.indexOf(v) !== i);
        if (dup) err(`"${f.label}"의 "${c.label}" 값 "${dup}"이(가) 중복됩니다.`);
      }
      return;
    }
    case 'boolean':
      return;
  }
}

function checkRefs(
  s: string, label: string, node: BotNode, idx: GraphIndex,
  err: (m: string) => void, warn: (m: string) => void, wanted?: ValueType[],
) {
  const refs = parseRefs(s);
  if (!refs.length) return;
  const upstream = ancestors(idx, node.id);
  for (const ref of refs) {
    if (ref.kind === 'invalid') {
      err(`${ref.raw}: 알 수 없는 변수입니다. {{n3.result}} 나 {{env.이름}} 형식으로 써 주세요.`);
      continue;
    }
    if (ref.kind === 'env') continue;
    const src = idx.byId.get(ref.nodeId);
    const tag = `#${nodeNumber(ref.nodeId)}`;
    if (!src) {
      err(`${ref.raw}: ${tag} 노드가 없습니다.`);
      continue;
    }
    if (!upstream.has(ref.nodeId)) {
      err(`${ref.raw}: ${tag} 노드는 이 노드보다 먼저 실행되지 않습니다.`);
      continue;
    }
    const output = outputsOf(idx, src).find((o) => o.key === ref.key);
    if (!output) {
      err(`${ref.raw}: ${tag} 노드에는 "${ref.key}" 출력값이 없습니다.`);
      continue;
    }
    if (!alwaysRunsBefore(idx, ref.nodeId, node.id)) {
      warn(`${ref.raw}: ${tag} 노드를 거치지 않는 경로가 있어 값이 비어 있을 수 있습니다.`);
    }
    if (wanted && isSingleRef(s) && !accepts(wanted, output.type)) {
      err(`"${label}"에는 ${wanted.map((t) => TYPE_LABEL[t]).join('/')} 값이 필요한데, ${tag}의 "${output.label}"은(는) ${TYPE_LABEL[output.type]}입니다.`);
    }
  }
}
