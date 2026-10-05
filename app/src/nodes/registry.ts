import { actionDefs } from './defs/actions';
import { customDefs } from './defs/custom';
import { dataDefs } from './defs/data';
import { integrationDefs } from './defs/integrations';
import { logicDefs } from './defs/logic';
import { triggerDefs } from './defs/triggers';
import { t, useLang } from '../i18n/t';
import { NEXT_PORT, type Category, type FieldDef, type NodeDef, type PortDef, type Props } from './types';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'trigger', label: '트리거' },
  { id: 'action', label: '디스코드 동작' },
  { id: 'logic', label: '흐름' },
  { id: 'data', label: '데이터' },
  { id: 'integration', label: '외부 연동' },
  { id: 'custom', label: '자연어' },
];

export const categoryLabel = (c: Category) => t(CATEGORIES.find((x) => x.id === c)?.label ?? c);
export const categoryColor = (c: Category) => `var(--cat-${c})`;

const ALL: NodeDef[] = [...triggerDefs, ...actionDefs, ...logicDefs, ...dataDefs, ...integrationDefs, ...customDefs];

/** Definitions as written (Korean labels). Prompt-building code uses these so prompts don't depend on the UI language. */
export const NODE_DEFS: ReadonlyMap<string, NodeDef> = new Map(ALL.map((d) => [d.type, d]));

export const defsByCategory = (c: Category) => ALL.filter((d) => d.category === c);

// ── UI language ───────────────────────────────────────
// Labels, help, options and placeholders are module constants, so they are translated here, per definition.
// Text built inside summary/simulate/check already goes through t() when it runs.

const label = <T extends { label: string }>(x: T): T => ({ ...x, label: t(x.label) });
const message = <T extends { message: string }>(p: T | undefined) => p && { ...p, message: t(p.message) };

function translateField(f: FieldDef): FieldDef {
  const base = { label: t(f.label), help: f.help && t(f.help) };
  switch (f.kind) {
    case 'text':
    case 'textarea':
      return { ...f, ...base, placeholder: f.placeholder && t(f.placeholder), default: f.default && t(f.default), pattern: message(f.pattern) };
    case 'list':
      return { ...f, ...base, placeholder: f.placeholder && t(f.placeholder) };
    case 'select':
      return { ...f, ...base, options: f.options.map(label) };
    case 'table':
      return {
        ...f,
        ...base,
        addLabel: t(f.addLabel),
        columns: f.columns.map((c) => ({
          ...label(c),
          placeholder: c.placeholder && t(c.placeholder),
          default: typeof c.default === 'string' ? t(c.default) : c.default,
          options: c.options?.map(label),
          pattern: message(c.pattern),
        })),
      };
    default:
      return { ...f, ...base };
  }
}

function translateDef(def: NodeDef): NodeDef {
  const { outputs, ports, simInputs } = def;
  return {
    ...def,
    label: t(def.label),
    description: t(def.description),
    fields: def.fields.map(translateField),
    outputs: outputs && ((p, g) => outputs(p, g).map(label)),
    ports: ports && ((p) => ports(p).map(label)),
    simInputs: simInputs && ((p, g) => simInputs(p, g).map((i) => ({ ...label(i), default: typeof i.default === 'string' ? t(i.default) : i.default }))),
  };
}

const translated = new Map<NodeDef, NodeDef>();
useLang.subscribe(() => translated.clear());

/** A definition with its labels, help and options in the UI language. */
export function localize(def: NodeDef): NodeDef {
  if (useLang.getState().lang === 'ko') return def;
  let hit = translated.get(def);
  if (!hit) translated.set(def, (hit = translateDef(def)));
  return hit;
}

export const getDef = (type: string): NodeDef | undefined => {
  const def = NODE_DEFS.get(type);
  return def && localize(def);
};

export const isTrigger = (def: NodeDef | undefined) => def?.category === 'trigger';

export const portsOf = (def: NodeDef, props: Props): PortDef[] => (def.ports ? def.ports(props) : [NEXT_PORT]);

export const fieldVisible = (field: FieldDef, props: Props) => !field.when || field.when(props);

export function defaultProps(def: NodeDef): Props {
  const props: Props = {};
  for (const f of def.fields) {
    if ('default' in f && f.default !== undefined) props[f.key] = f.default;
  }
  return props;
}
