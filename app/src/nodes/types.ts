import type { LucideIcon } from 'lucide-react';

export type Category = 'trigger' | 'action' | 'logic' | 'data' | 'integration' | 'custom';

/** Type of a value a node produces, used to filter what can be inserted where. */
export type ValueType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'user'
  | 'member'
  | 'channel'
  | 'role'
  | 'message'
  | 'list'
  | 'object'
  | 'any';

/** What kind of Discord event started the flow. Some actions only work in some contexts. */
export type TriggerContext = 'interaction' | 'message' | 'event';

export type Props = Record<string, unknown>;

interface FieldBase {
  key: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Field is shown (and validated) only when this returns true. */
  when?: (props: Props) => boolean;
}

export interface TextField extends FieldBase {
  kind: 'text' | 'textarea';
  placeholder?: string;
  maxLength?: number;
  pattern?: { regex: RegExp; message: string };
  /** Allows {{n1.key}} references. An array narrows the insert menu to those value types. */
  refs?: boolean | ValueType[];
  default?: string;
}

export interface NumberField extends FieldBase {
  kind: 'number';
  min?: number;
  max?: number;
  step?: number;
  default?: number;
}

export interface BooleanField extends FieldBase {
  kind: 'boolean';
  default?: boolean;
}

export interface SelectField extends FieldBase {
  kind: 'select';
  options: { value: string; label: string }[];
  default: string;
}

export interface ColorField extends FieldBase {
  kind: 'color';
  default?: string;
}

export interface ListField extends FieldBase {
  kind: 'list';
  placeholder?: string;
  maxItems: number;
  maxLength?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  kind: 'text' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  pattern?: { regex: RegExp; message: string };
  default?: string | boolean;
  /** Values in this column must differ between rows. */
  unique?: boolean;
}

export interface TableField extends FieldBase {
  kind: 'table';
  columns: TableColumn[];
  maxRows: number;
  addLabel: string;
}

export type FieldDef =
  | TextField
  | NumberField
  | BooleanField
  | SelectField
  | ColorField
  | ListField
  | TableField;

export interface OutputDef {
  key: string;
  label: string;
  type: ValueType;
}

export interface PortDef {
  id: string;
  label: string;
}

/** Read-only view of the graph for defs whose outputs or checks depend on other nodes. */
export interface GraphView {
  nodesOfType(type: string): { id: string; props: Props }[];
}

export interface CheckResult {
  level: 'error' | 'warning';
  message: string;
  field?: string;
}

export interface NodeDef {
  type: string;
  category: Category;
  label: string;
  description: string;
  icon: LucideIcon;
  fields: FieldDef[];
  /** Data this node makes available to downstream nodes. */
  outputs?: (props: Props, graph: GraphView) => OutputDef[];
  /** Outgoing flow ports. Defaults to a single unlabeled "next" port. Empty array = terminal. */
  ports?: (props: Props) => PortDef[];
  /** One-line summary shown on the canvas card. */
  summary?: (props: Props) => string;
  /** Set on triggers: the context they start. */
  provides?: TriggerContext;
  /** Set on nodes that only work in some contexts. */
  needs?: TriggerContext[];
  /** Rules that span fields or nodes. Field-level rules come from `fields`. */
  check?: (props: Props, self: string, graph: GraphView) => CheckResult[];
}

export const NEXT_PORT: PortDef = { id: 'next', label: '' };

/** Row type stored by table fields. */
export type TableRow = Record<string, string | boolean>;
