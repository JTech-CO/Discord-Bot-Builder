import { actionDefs } from './defs/actions';
import { customDefs } from './defs/custom';
import { dataDefs } from './defs/data';
import { integrationDefs } from './defs/integrations';
import { logicDefs } from './defs/logic';
import { triggerDefs } from './defs/triggers';
import { NEXT_PORT, type Category, type FieldDef, type NodeDef, type PortDef, type Props } from './types';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'trigger', label: '트리거' },
  { id: 'action', label: '디스코드 동작' },
  { id: 'logic', label: '흐름' },
  { id: 'data', label: '데이터' },
  { id: 'integration', label: '외부 연동' },
  { id: 'custom', label: '자연어' },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c;
export const categoryColor = (c: Category) => `var(--cat-${c})`;

const ALL: NodeDef[] = [...triggerDefs, ...actionDefs, ...logicDefs, ...dataDefs, ...integrationDefs, ...customDefs];

export const NODE_DEFS: ReadonlyMap<string, NodeDef> = new Map(ALL.map((d) => [d.type, d]));

export const defsByCategory = (c: Category) => ALL.filter((d) => d.category === c);

export const getDef = (type: string): NodeDef | undefined => NODE_DEFS.get(type);

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
