import type { BotEdge, BotNode } from '../flow/model';
import type { Props } from '../nodes/types';

export const N = (id: string, type: string, props: Props = {}): BotNode => ({
  id, type: 'bot', position: { x: 0, y: 0 }, data: { type, props },
});

export const E = (source: string, port: string, target: string): BotEdge => ({
  id: `${source}-${port}-${target}`, source, sourceHandle: port, target,
});

export const DISCORD_TOKEN_LIKE = `MTIzNDU2Nzg5MDEyMzQ1Njc4.GAbCdE.${'x'.repeat(38)}`;
