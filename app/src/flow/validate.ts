import { list, rows, str } from '../nodes/helpers';
import { fieldVisible, getDef, isTrigger, portsOf } from '../nodes/registry';
import type { FieldDef, ValueType } from '../nodes/types';
import {
  alwaysRunsBefore, ancestors, indexGraph, nodesInCycles, outputsOf, reachableFrom, triggerIds, triggersReaching,
  type GraphIndex,
} from './graph';
import { nodeNumber, type BotEdge, type BotNode } from './model';
import { isSingleRef, parseRefs } from './refs';
import { findSecret } from './secrets';
import { t } from '../i18n/t';

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
    push('warning', t('트리거가 없습니다. 모든 흐름은 트리거에서 시작합니다.'));
  }

  for (const id of nodesInCycles(idx)) {
    push('error', t('순환 연결에 포함되어 있습니다. 반복이 필요하면 선을 끊고 다른 방법을 쓰세요.'), id);
  }

  const live = reachableFrom(idx, triggers);

  for (const node of nodes) {
    const def = getDef(node.data.type);
    if (!def) {
      push('error', t('알 수 없는 노드 종류입니다: {0}', [node.data.type]), node.id);
      continue;
    }
    const props = node.data.props;

    if (!isTrigger(def) && !live.has(node.id)) {
      push('warning', t('트리거와 이어져 있지 않아 실행되지 않습니다.'), node.id);
    }

    const portIds = new Set(portsOf(def, props).map((p) => p.id));
    if ((idx.out.get(node.id) ?? []).some((e) => !portIds.has(e.sourceHandle ?? 'next'))) {
      push('error', t('없어진 갈래에 연결된 선이 있습니다. 그 선을 지워 주세요.'), node.id);
    }

    const startedBy = isTrigger(def) ? [] : triggersReaching(idx, node.id).map((tr) => getDef(tr.data.type)!);
    if (def.needs && startedBy.some((tr) => tr.provides && !def.needs!.includes(tr.provides))) {
      push('error', t('명령어나 버튼으로 시작한 흐름에서만 쓸 수 있습니다.'), node.id);
    }
    if (def.type === 'action.showModal' && startedBy.some((tr) => tr.type === 'trigger.modalSubmit')) {
      push('error', t('모달 제출에 대한 응답으로 또 모달을 띄울 수 없습니다.'), node.id);
    }
    if (def.type === 'action.sendMessage' && (str(props, 'target') || 'reply') === 'reply' && startedBy.some((tr) => tr.provides === 'event')) {
      push('error', t('이벤트로 시작한 흐름에는 답장할 대상이 없습니다. "특정 채널"이나 "사용자 DM"을 고르세요.'), node.id, 'target');
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
  const missing = () => err(t('"{0}" 항목이 비어 있습니다.', [f.label]));
  const secret = (s: string) => {
    const kind = findSecret(s);
    if (kind) err(t('"{0}"에 비밀값({1})으로 보이는 값이 있습니다. 비밀값은 {{env.이름}}으로 넣고, 생성된 봇의 .env 파일에 적으세요.', [f.label, kind]));
    return !!kind;
  };

  switch (f.kind) {
    case 'text':
    case 'textarea': {
      const s = typeof value === 'string' ? value : '';
      if (!s.trim()) {
        if (f.required) missing();
        return;
      }
      if (secret(s)) return;
      if (f.maxLength && s.length > f.maxLength) err(t('"{0}"은(는) {1}자까지 쓸 수 있습니다.', [f.label, f.maxLength]));
      if (f.pattern && !f.pattern.regex.test(s.trim())) err(`"${f.label}": ${f.pattern.message}`);
      const refs = parseRefs(s);
      if (refs.length && !f.refs) {
        err(t('"{0}"에는 변수를 넣을 수 없습니다.', [f.label]));
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
      if (typeof value !== 'number' || !Number.isFinite(value)) return err(t('"{0}"에는 숫자를 넣어 주세요.', [f.label]));
      if (f.min !== undefined && value < f.min) err(t('"{0}"은(는) {1} 이상이어야 합니다.', [f.label, f.min]));
      if (f.max !== undefined && value > f.max) err(t('"{0}"은(는) {1} 이하여야 합니다.', [f.label, f.max]));
      return;
    }
    case 'select': {
      const s = typeof value === 'string' ? value : f.default;
      if (!f.options.some((o) => o.value === s)) err(t('"{0}"의 선택값이 올바르지 않습니다.', [f.label]));
      return;
    }
    case 'color': {
      if (value !== undefined && !(typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value))) {
        err(t('"{0}"은(는) #RRGGBB 형식이어야 합니다.', [f.label]));
      }
      return;
    }
    case 'list': {
      const items = list({ v: value }, 'v');
      if (f.required && !items.some((s) => s.trim())) return missing();
      if (items.length > f.maxItems) err(t('"{0}"은(는) {1}개까지 넣을 수 있습니다.', [f.label, f.maxItems]));
      if (items.some((s) => !s.trim())) warn(t('"{0}"에 빈 항목이 있습니다.', [f.label]));
      items.some(secret);
      if (f.maxLength && items.some((s) => s.length > f.maxLength!)) err(t('"{0}"의 각 항목은 {1}자까지 쓸 수 있습니다.', [f.label, f.maxLength]));
      return;
    }
    case 'table': {
      const rs = rows({ v: value }, 'v');
      if (f.required && rs.length === 0) return missing();
      if (rs.length > f.maxRows) err(t('"{0}"은(는) {1}개까지 넣을 수 있습니다.', [f.label, f.maxRows]));
      rs.forEach((row, i) => {
        for (const c of f.columns) {
          const cell = t('"{0}" {1}번째의 "{2}"', [f.label, i + 1, c.label]);
          const v = row[c.key];
          if (c.kind === 'select') {
            if (v !== undefined && !c.options?.some((o) => o.value === v)) err(t('{0} 선택값이 올바르지 않습니다.', [cell]));
            continue;
          }
          if (c.kind !== 'text') continue;
          const s = typeof v === 'string' ? v : '';
          if (!s.trim()) {
            if (c.required) err(t('{0} 칸이 비어 있습니다.', [cell]));
            continue;
          }
          if (secret(s)) continue;
          if (c.maxLength && s.length > c.maxLength) err(t('{0} 칸은 {1}자까지 쓸 수 있습니다.', [cell, c.maxLength]));
          if (c.pattern && !c.pattern.regex.test(s.trim())) err(`${cell}: ${c.pattern.message}`);
          checkRefs(s, f.label, node, idx, err, warn);
        }
      });
      for (const c of f.columns.filter((c) => c.unique)) {
        const values = rs.map((r) => r[c.key]).filter((v): v is string => typeof v === 'string' && !!v);
        const dup = values.find((v, i) => values.indexOf(v) !== i);
        if (dup) err(t('"{0}"의 "{1}" 값 "{2}"이(가) 중복됩니다.', [f.label, c.label, dup]));
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
      err(t('{0}: 알 수 없는 변수입니다. {{n3.result}} 나 {{env.이름}} 형식으로 써 주세요.', [ref.raw]));
      continue;
    }
    if (ref.kind === 'env') continue;
    const src = idx.byId.get(ref.nodeId);
    const tag = `#${nodeNumber(ref.nodeId)}`;
    if (!src) {
      err(t('{0}: {1} 노드가 없습니다.', [ref.raw, tag]));
      continue;
    }
    if (!upstream.has(ref.nodeId)) {
      err(t('{0}: {1} 노드는 이 노드보다 먼저 실행되지 않습니다.', [ref.raw, tag]));
      continue;
    }
    const output = outputsOf(idx, src).find((o) => o.key === ref.key);
    if (!output) {
      err(t('{0}: {1} 노드에는 "{2}" 출력값이 없습니다.', [ref.raw, tag, ref.key]));
      continue;
    }
    if (!alwaysRunsBefore(idx, ref.nodeId, node.id)) {
      warn(t('{0}: {1} 노드를 거치지 않는 경로가 있어 값이 비어 있을 수 있습니다.', [ref.raw, tag]));
    }
    if (wanted && isSingleRef(s) && !accepts(wanted, output.type)) {
      err(t('"{0}"에는 {1} 값이 필요한데, {2}의 "{3}"은(는) {4}입니다.', [label, wanted.map((w) => t(TYPE_LABEL[w])).join('/'), tag, output.label, t(TYPE_LABEL[output.type])]));
    }
  }
}
