import type { Intent, Permission } from '../nodes/types';

// https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
export const PERMISSION_BITS: Record<Permission, bigint> = {
  KickMembers: 1n << 1n,
  BanMembers: 1n << 2n,
  ManageChannels: 1n << 4n,
  AddReactions: 1n << 6n,
  ViewChannel: 1n << 10n,
  SendMessages: 1n << 11n,
  ManageMessages: 1n << 13n,
  EmbedLinks: 1n << 14n,
  ReadMessageHistory: 1n << 16n,
  ManageRoles: 1n << 28n,
  CreatePublicThreads: 1n << 35n,
  CreatePrivateThreads: 1n << 36n,
  SendMessagesInThreads: 1n << 38n,
  ModerateMembers: 1n << 40n,
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  KickMembers: '멤버 추방하기',
  BanMembers: '멤버 차단하기',
  ManageChannels: '채널 관리하기',
  AddReactions: '반응 추가하기',
  ViewChannel: '채널 보기',
  SendMessages: '메시지 보내기',
  ManageMessages: '메시지 관리하기',
  EmbedLinks: '링크 첨부',
  ReadMessageHistory: '메시지 기록 보기',
  ManageRoles: '역할 관리하기',
  CreatePublicThreads: '공개 스레드 만들기',
  CreatePrivateThreads: '비공개 스레드 만들기',
  SendMessagesInThreads: '스레드에서 메시지 보내기',
  ModerateMembers: '멤버 타임아웃',
};

export const INTENT_ORDER: Intent[] = [
  'Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent', 'GuildMessageReactions', 'GuildVoiceStates',
];

/** Must be switched on in the Developer Portal (Bot → Privileged Gateway Intents). */
export const PRIVILEGED_INTENTS: ReadonlySet<Intent> = new Set<Intent>(['GuildMembers', 'MessageContent']);

export const permissionBits = (perms: Iterable<Permission>) =>
  [...perms].reduce((acc, p) => acc | PERMISSION_BITS[p], 0n).toString();
