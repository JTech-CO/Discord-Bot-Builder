import type { Edge, Node } from '@xyflow/react';
import type { Props } from '../nodes/types';

export type BotNodeData = { type: string; props: Props };
export type BotNode = Node<BotNodeData, 'bot'>;
export type BotEdge = Edge;

export interface ProjectMeta {
  name: string;
  description: string;
  /** guild = register commands to one test server (instant), global = all servers (slow to propagate). */
  commandScope: 'guild' | 'global';
  /** Language the generated bot uses for its own messages and code comments. */
  locale: 'ko' | 'en';
}

export const DEFAULT_META: ProjectMeta = {
  name: '새 봇',
  description: '',
  commandScope: 'guild',
  locale: 'ko',
};

/** Node ids are short sequential handles (n1, n2, …) so references read well: {{n3.result}}. */
export const NODE_ID_RE = /^n[1-9]\d{0,5}$/;
export const nodeNumber = (id: string) => id.slice(1);
