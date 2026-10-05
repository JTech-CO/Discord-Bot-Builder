import type { Lang } from '../i18n/t';
import type { ProjectFile } from './file';

export const diceExample: ProjectFile = {
  format: 'discord-bot-builder',
  version: 2,
  meta: {
    name: '주사위 봇',
    description: '/주사위 를 입력하면 1~6 사이 숫자를 굴려 결과를 알려 줍니다. 5초 쿨다운이 있습니다.',
    commandScope: 'guild',
    locale: 'ko',
  },
  nodes: [
    { id: 'n1', type: 'trigger.slashCommand', position: { x: 0, y: 0 }, props: { name: '주사위', description: '주사위를 굴립니다', options: [] } },
    { id: 'n2', type: 'logic.cooldown', position: { x: 0, y: 176 }, props: { seconds: 5, scope: 'user' } },
    { id: 'n3', type: 'logic.random', position: { x: -160, y: 352 }, props: { min: 1, max: 6 } },
    {
      id: 'n6', type: 'action.sendMessage', position: { x: 192, y: 352 },
      props: { target: 'reply', content: '{{n2.remaining}}초 뒤에 다시 굴릴 수 있어요.', ephemeral: true, embed: false, buttons: [] },
    },
    { id: 'n4', type: 'logic.if', position: { x: -160, y: 528 }, props: { left: '{{n3.result}}', operator: '>=', right: '4' } },
    {
      id: 'n5', type: 'action.sendMessage', position: { x: -336, y: 704 },
      props: {
        target: 'reply', content: '', ephemeral: false, embed: true,
        embedTitle: '🎲 {{n3.result}}', embedDescription: '{{n1.user}}님, 높은 숫자가 나왔어요!', embedColor: '#3FB27F', buttons: [],
      },
    },
    {
      id: 'n7', type: 'action.sendMessage', position: { x: 16, y: 704 },
      props: { target: 'reply', content: '🎲 {{n3.result}}… 다음엔 더 높게 나올 거예요.', ephemeral: false, embed: false, buttons: [] },
    },
  ],
  edges: [
    { source: 'n1', sourcePort: 'next', target: 'n2' },
    { source: 'n2', sourcePort: 'pass', target: 'n3' },
    { source: 'n2', sourcePort: 'blocked', target: 'n6' },
    { source: 'n3', sourcePort: 'next', target: 'n4' },
    { source: 'n4', sourcePort: 'true', target: 'n5' },
    { source: 'n4', sourcePort: 'false', target: 'n7' },
  ],
};

// The same flow for the English UI: its text is the bot's own, so it is written in English rather than translated.
const ENGLISH_PROPS: Record<string, ProjectFile['nodes'][number]['props']> = {
  n1: { name: 'dice', description: 'Rolls a die' },
  n6: { content: 'You can roll again in {{n2.remaining}} seconds.' },
  n5: { embedDescription: '{{n1.user}}, that is a high roll!' },
  n7: { content: '🎲 {{n3.result}}… Better luck next time.' },
};

export const diceExampleEn: ProjectFile = {
  ...diceExample,
  meta: {
    ...diceExample.meta,
    name: 'Dice bot',
    description: 'Type /dice to roll a number from 1 to 6. There is a 5-second cooldown.',
    locale: 'en',
  },
  nodes: diceExample.nodes.map((n) => ({ ...n, props: { ...n.props, ...ENGLISH_PROPS[n.id] } })),
};

/** The example project in the UI language. */
export const diceExampleFor = (lang: Lang): ProjectFile => (lang === 'en' ? diceExampleEn : diceExample);
