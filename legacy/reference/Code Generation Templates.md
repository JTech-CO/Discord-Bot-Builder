# Hybrid AI Bot Builder
## Code Generation Templates (v1.0)

- **버전**: 1.0
- **작성일**: 2026년 02월 09일
- **목적**: Node JSON 데이터를 실제 프로그래밍 언어로 변환하기 위한 스니펫(Snippet) 정의.
- **지원 언어**: Python (discord.py 2.0+), Node.js (discord.js v14+)

---

## 1. 프로젝트 스켈레톤 (Project Skeleton)

봇의 진입점(Entry Point)이 되는 메인 파일의 기본 구조입니다.

### 1.1. Python (main.py)

```python
import discord
from discord import app_commands
from discord.ext import commands
import random
import os
import json
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()
TOKEN = os.getenv('DISCORD_BOT_TOKEN')

# 봇 설정
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

class MyBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        # 슬래시 커맨드 동기화
        await self.tree.sync()
        print(f"Synced slash commands for {self.user}")

bot = MyBot()

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')

# --- [GENERATED COMMANDS START] ---
# (여기에 변환된 노드 코드가 삽입됩니다)
# --- [GENERATED COMMANDS END] ---

if __name__ == "__main__":
    bot.run(TOKEN)
```

### 1.2. Node.js (index.js)

```javascript
const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 명령어 컬렉션 (실제 구현에서는 별도 파일 분리 권장)
const commands = [];
const commandMap = new Map();

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const handler = commandMap.get(interaction.commandName);
    if (handler) await handler(interaction);
});

async function main() {
    // --- [GENERATED COMMANDS START] ---
    // (여기에 변환된 노드 코드가 삽입됩니다)
    // --- [GENERATED COMMANDS END] ---

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
    await client.login(process.env.DISCORD_BOT_TOKEN);
}

main();
```

---

## 2. 노드별 코드 매핑 (Node Logic Mapping)

각 노드 타입(type)이 트랜스파일러를 거쳐 변환되는 코드 조각입니다.

### 2.1. Trigger Nodes (시작점)

#### TRIGGER_SLASH_COMMAND

- **설명**: 슬래시 명령어를 등록하고 핸들러 함수를 정의합니다.
- **변수**: `{{commandName}}`, `{{description}}`

**Python:**

```python
@bot.tree.command(name="{{commandName}}", description="{{description}}")
async def cmd_{{commandName}}(interaction: discord.Interaction):
    # Context Variable Initialization
    user = interaction.user
    channel = interaction.channel
    # [NEXT_NODES_CODE]
```

**JavaScript:**

```javascript
// Register Command Builder
const cmd_{{commandName}} = new SlashCommandBuilder()
    .setName('{{commandName}}')
    .setDescription('{{description}}');
commands.push(cmd_{{commandName}}.toJSON());

// Handler Logic
commandMap.set('{{commandName}}', async (interaction) => {
    const user = interaction.user;
    const channel = interaction.channel;
    // [NEXT_NODES_CODE]
});
```

---

### 2.2. Action Nodes (출력)

#### ACTION_SEND_EMBED

- **설명**: 임베드 메시지를 전송합니다.
- **변수**: `{{title}}`, `{{desc}}`, `{{color}}`

**Python:**

```python
    embed = discord.Embed(
        title="{{title}}",
        description=f"{{desc}}", # f-string for variable injection
        color=discord.Color.from_str("{{color}}")
    )
    if not interaction.response.is_done():
        await interaction.response.send_message(embed=embed)
    else:
        await interaction.followup.send(embed=embed)
```

**JavaScript:**

```javascript
    const embed_{{nodeId}} = new EmbedBuilder()
        .setTitle('{{title}}')
        .setDescription(`{{desc}}`) // Template literal
        .setColor('{{color}}');
    
    if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed_{{nodeId}}] });
    } else {
        await interaction.followup({ embeds: [embed_{{nodeId}}] });
    }
```

#### ACTION_MANAGE_USER (Add Role)

- **설명**: 유저에게 역할을 부여합니다.
- **변수**: `{{roleId}}`

**Python:**

```python
    role = interaction.guild.get_role({{roleId}})
    if role:
        await interaction.user.add_roles(role)
```

**JavaScript:**

```javascript
    const role_{{nodeId}} = interaction.guild.roles.cache.get('{{roleId}}');
    if (role_{{nodeId}}) {
        await interaction.member.roles.add(role_{{nodeId}});
    }
```

---

### 2.3. Logic Nodes (제어 흐름)

#### LOGIC_RANDOM

- **설명**: 난수를 생성하여 변수에 저장합니다.
- **변수**: `{{min}}`, `{{max}}`, `{{varName}}`

**Python:**

```python
    {{varName}} = random.randint({{min}}, {{max}})
```

**JavaScript:**

```javascript
    let {{varName}} = Math.floor(Math.random() * ({{max}} - {{min}} + 1)) + {{min}};
```

#### LOGIC_IF_ELSE

- **설명**: 조건문을 생성합니다. 트랜스파일러는 재귀적으로 내부 블록을 채워야 합니다.
- **변수**: `{{valueA}}`, `{{operator}}`, `{{valueB}}`

**Python:**

```python
    if {{valueA}} {{operator}} {{valueB}}:
        # [TRUE_PATH_CODE]
        pass
    else:
        # [FALSE_PATH_CODE]
        pass
```

**JavaScript:**

```javascript
    if ({{valueA}} {{operator}} {{valueB}}) {
        // [TRUE_PATH_CODE]
    } else {
        // [FALSE_PATH_CODE]
    }
```

#### LOGIC_VARIABLE (Set)

- **설명**: 로컬/글로벌 변수 값을 설정합니다.
- **변수**: `{{key}}`, `{{value}}`

**Python:**

```python
    # Simple Local Variable
    var_{{key}} = {{value}}
    # (Global DB logic would require a separate DB helper function)
```

**JavaScript:**

```javascript
    let var_{{key}} = {{value}};
```

---

## 3. 변수 주입 문법 (Variable Injection Syntax)

사용자가 노드 입력창에 `{user.name}`과 같은 변수를 썼을 때, 이를 각 언어에 맞는 문법으로 치환하는 규칙입니다.

| 사용자 입력 포맷 | Python 변환 (f-string) | JavaScript 변환 (Template Literal) |
|-----------------|------------------------|-----------------------------------|
| `{user.name}` | `{user.name}` | `${user.username}` |
| `{user.id}` | `{user.id}` | `${user.id}` |
| `{channel.name}` | `{channel.name}` | `${channel.name}` |
| `{var.gold}` | `{var_gold}` | `${var_gold}` |

---

## 4. 트랜스파일러 구현 가이드

이 템플릿을 사용하여 `src/lib/transpiler/irGenerator.js`와 `generators.js`를 구현할 때의 핵심 로직입니다.

- **변수 스코프 관리**: 생성된 코드는 하나의 함수(핸들러) 안에 들어가므로, 노드에서 정의한 변수(`var_gold`)는 함수 상단에서 초기화되거나 사용 전 선언되어야 합니다.

- **비동기 처리(Async/Await)**: Discord API 호출(`send`, `add_roles` 등)은 모두 비동기입니다. Python 템플릿에는 `await` 키워드가 필수로 포함되어야 합니다.

- **들여쓰기(Indentation) - Python**: Python 생성기는 `LOGIC_IF` 같은 블록에 들어갈 때 들여쓰기 레벨(Indent Level)을 관리해야 합니다. (예: 기본 4칸 공백)