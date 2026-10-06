// What the stand-in API in smoke.ts "generates": a small dice bot shaped like real output, so the
// generation check and the README screenshots look like the real thing. Never sent anywhere.

const indexTs = `import 'dotenv/config';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { diceCommand, runDice } from './flows/dice.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  console.error('❌ .env에 DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID를 넣어 주세요.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Register /주사위 on the test server, then log the ready line.
client.once(Events.ClientReady, async (ready) => {
  const rest = new REST().setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: [diceCommand.toJSON()] });
  console.log(\`✅ \${ready.user.tag} 준비 완료 · 명령어: /\${diceCommand.name}\`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== diceCommand.name) return;
  try {
    await runDice(interaction);
  } catch (error) {
    console.error('[흐름 1] 실행 중 오류:', error);
  }
});

void client.login(DISCORD_TOKEN);
`;

const diceTs = `import { EmbedBuilder, MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

const COOLDOWN_SECONDS = 5;
const lastUsed = new Map<string, number>();

export const diceCommand = new SlashCommandBuilder().setName('주사위').setDescription('주사위를 굴립니다');

// Flow 1: #1 /주사위 → #2 cooldown → #3 random 1~6 → #4 result >= 4 → #5 or #7 (#6 while blocked).
export async function runDice(interaction: ChatInputCommandInteraction): Promise<void> {
  const now = Date.now();
  const remaining = Math.ceil(((lastUsed.get(interaction.user.id) ?? 0) + COOLDOWN_SECONDS * 1000 - now) / 1000);
  if (remaining > 0) {
    await interaction.reply({ content: \`\${remaining}초 뒤에 다시 굴릴 수 있어요.\`, flags: MessageFlags.Ephemeral });
    return;
  }
  lastUsed.set(interaction.user.id, now);

  const result = Math.floor(Math.random() * 6) + 1;
  if (result >= 4) {
    const embed = new EmbedBuilder()
      .setTitle(\`🎲 \${result}\`)
      .setDescription(\`\${interaction.user}님, 높은 숫자가 나왔어요!\`)
      .setColor(0x3fb27f);
    await interaction.reply({ embeds: [embed], allowedMentions: { parse: ['users'] } });
    return;
  }
  await interaction.reply({ content: \`🎲 \${result}… 다음엔 더 높게 나올 거예요.\`, allowedMentions: { parse: ['users'] } });
}
`;

export const SAMPLE_PROJECT = {
  files: [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: 'dice-bot',
          version: '1.0.0',
          private: true,
          type: 'module',
          scripts: { build: 'tsc -p tsconfig.json', start: 'node dist/index.js' },
          dependencies: { 'discord.js': '^14.22.1', dotenv: '^17.2.0' },
          devDependencies: { '@types/node': '^22.10.0', typescript: '^5.9.0' },
        },
        null,
        2,
      ),
    },
    { path: 'tsconfig.json', content: '{\n  "compilerOptions": { "target": "ES2022", "module": "NodeNext", "outDir": "dist", "strict": true }\n}' },
    { path: '.env.example', content: '# Bot token from the Developer Portal\nDISCORD_TOKEN=\nDISCORD_CLIENT_ID=\nDISCORD_GUILD_ID=\n' },
    { path: 'README.md', content: '# 주사위 봇\n\n`npm install` → `npm run build` → `npm start`\n' },
    { path: 'src/index.ts', content: indexTs },
    { path: 'src/flows/dice.ts', content: diceTs },
  ],
  notes:
    '1. Node.js 22 이상을 설치합니다.\n2. 프로젝트 폴더에서 `npm install`을 실행합니다.\n3. `.env.example`을 `.env`로 복사하고 값을 채웁니다.\n4. https://discord.com/developers/applications 에서 봇을 초대합니다.\n\n```bash\nnpm run build\nnpm start\n```',
};
