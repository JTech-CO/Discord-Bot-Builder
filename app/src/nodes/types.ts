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

export type Intent =
  | 'Guilds'
  | 'GuildMessages'
  | 'MessageContent'
  | 'GuildMembers'
  | 'GuildVoiceStates'
  | 'GuildMessageReactions';

export type Permission =
  | 'ViewChannel'
  | 'SendMessages'
  | 'EmbedLinks'
  | 'ReadMessageHistory'
  | 'AddReactions'
  | 'ManageMessages'
  | 'ManageRoles'
  | 'ManageChannels'
  | 'KickMembers'
  | 'BanMembers'
  | 'ModerateMembers'
  | 'CreatePublicThreads'
  | 'CreatePrivateThreads'
  | 'SendMessagesInThreads';

/** What the generated bot needs for a node to work. Collected into the prompt. */
export interface Requirements {
  intents?: Intent[];
  partials?: ('Message' | 'Channel' | 'Reaction')[];
  permissions?: Permission[];
  env?: { name: string; purpose: string }[];
  packages?: string[];
  /** Needs data that survives restarts. */
  storage?: boolean;
  /** May take seconds, so interaction flows containing it must defer their reply. */
  slow?: boolean;
}

// ── Simulation ────────────────────────────────────────

/** A Discord object as the simulator fakes it. */
export interface SimEntity {
  kind: 'user' | 'member' | 'channel' | 'role' | 'message';
  id: string;
  name: string;
}

export type SimValue = string | number | boolean | null | SimEntity | SimValue[] | { [key: string]: SimValue };

/** Something the user would see in Discord. */
export type SimEffect =
  | {
      kind: 'message';
      to: string;
      content: string;
      ephemeral: boolean;
      embed: { title: string; description: string; color: string; image: string; footer: string } | null;
      buttons: string[];
    }
  | { kind: 'modal'; title: string; fields: string[] }
  | { kind: 'action'; text: string };

export interface SimInputDef {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'boolean';
  default: string | number | boolean;
}

export type SimInputs = Record<string, string | number | boolean>;

/** What a step can read while the simulator runs it. */
export interface SimContext {
  self: string;
  props: Props;
  /** A text prop with {{refs}} replaced by values from earlier steps. */
  text(key: string): string;
  /** A prop holding one reference, as that value; otherwise the rendered text. */
  value(key: string): SimValue;
  /** A numeric prop (references resolved); anything unparsable is 0. */
  number(key: string): number;
  /** The fake event the user typed in. */
  input: SimInputs;
  /** Values kept between runs: stored data, cooldowns. */
  store: Map<string, SimValue>;
  /** The user who started the flow, if there is one. */
  user: SimEntity | null;
  random(): number;
  now(): number;
}

export interface SimResult {
  /** Exit to take. Defaults to the node's first port. */
  port?: string;
  outputs?: Record<string, SimValue>;
  /** One line, in Korean, describing what happened. */
  log: string;
  effect?: SimEffect;
}

export interface TriggerSimResult {
  matched: boolean;
  outputs: Record<string, SimValue>;
  log: string;
}

/** Renders prop values safely into the prompt. Implemented by the compiler. */
export interface SpecFormat {
  /** A literal as a JSON string, with references normalized to {{#N.key}} and secrets redacted. */
  text(v: unknown): string;
  /** A single reference ({{#1.member}}) or a Discord ID; anything else falls back to text(). */
  target(v: unknown): string;
  /** A string list as a JSON array. */
  list(v: unknown): string;
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
  /** One English instruction describing exactly what this step does, for the code-generating AI. */
  spec: (props: Props, f: SpecFormat) => string;
  requires?: (props: Props) => Requirements;
  /** Triggers: the fake event fields the simulator asks for. */
  simInputs?: (props: Props, graph: GraphView) => SimInputDef[];
  /** Triggers: whether the fake event starts the flow, and its outputs. */
  simulateTrigger?: (props: Props, input: SimInputs, graph: GraphView) => TriggerSimResult;
  /** Other nodes: what the step does in the simulator. */
  simulate?: (ctx: SimContext) => SimResult;
}

export const NEXT_PORT: PortDef = { id: 'next', label: '' };

/** Row type stored by table fields. */
export type TableRow = Record<string, string | boolean>;
