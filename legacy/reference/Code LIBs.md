# Hybrid AI Bot Builder
## Code LIBs

- **버전**: 1.3 (URL Explicit)
- **작성일**: 2026년 02월 10일
- **목적**: Node JSON 데이터를 6가지 주요 프로그래밍 언어 코드로 변환하기 위한 스니펫(Snippet) 정의.

### 지원 라이브러리 (Official Repositories)

| 언어 | 라이브러리 | GitHub URL |
|------|-----------|------------|
| Python | discord.py (2.0+) | https://github.com/Rapptz/discord.py |
| Python | Pycord | https://github.com/Pycord-Development/pycord |
| Node.js | discord.js (v14+) | https://github.com/discordjs/discord.js |
| Java | JDA (5.0+) | https://github.com/discord-jda/JDA |
| C# | Discord.NET (3.10+) | https://github.com/discord-net/Discord.NET |
| Go | discordgo (v0.27+) | https://github.com/bwmarrin/discordgo |
| C++ | DPP (10.0+) | https://github.com/brainboxdotcc/DPP |

---

## 1. 프로젝트 스켈레톤 (Project Skeleton)

봇의 진입점(Entry Point)이 되는 메인 파일의 기본 구조입니다.

### 1.1. Python (main.py) - discord.py

```python
import discord
from discord import app_commands
from discord.ext import commands
import random
import os
import json
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('DISCORD_BOT_TOKEN')

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

class MyBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        await self.tree.sync()
        print(f"Synced slash commands for {self.user}")

bot = MyBot()

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')

# --- [GENERATED COMMANDS START] ---
# (트랜스파일러가 생성한 코드가 이곳에 삽입됩니다)
# --- [GENERATED COMMANDS END] ---

if __name__ == "__main__":
    bot.run(TOKEN)
```

### 1.2. Node.js (index.js) - discord.js

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

const commandMap = new Map();
const commands = []; // For REST registration

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
    // (트랜스파일러가 생성한 코드가 이곳에 삽입됩니다)
    // --- [GENERATED COMMANDS END] ---

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        console.log('Refreshing application (/) commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
    } catch (error) { console.error(error); }
    await client.login(process.env.DISCORD_BOT_TOKEN);
}
main();
```

### 1.3. Java (Bot.java) - JDA

```java
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.events.interaction.command.SlashCommandInteractionEvent;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import net.dv8tion.jda.api.interactions.commands.build.Commands;
import net.dv8tion.jda.api.requests.GatewayIntent;
import net.dv8tion.jda.api.EmbedBuilder;
import java.awt.Color;
import java.util.Random;

public class Bot extends ListenerAdapter {
    public static void main(String[] args) throws Exception {
        String token = System.getenv("DISCORD_BOT_TOKEN");
        JDA jda = JDABuilder.createDefault(token)
                .enableIntents(GatewayIntent.MESSAGE_CONTENT, GatewayIntent.GUILD_MEMBERS)
                .addEventListeners(new Bot())
                .build().awaitReady();
        
        // --- [GENERATED COMMANDS REGISTER START] ---
        // jda.updateCommands().addCommands(...).queue();
        // --- [GENERATED COMMANDS REGISTER END] ---
    }

    @Override
    public void onSlashCommandInteraction(SlashCommandInteractionEvent event) {
        // --- [GENERATED COMMANDS HANDLER START] ---
        // (트랜스파일러가 생성한 코드가 이곳에 삽입됩니다)
        // --- [GENERATED COMMANDS HANDLER END] ---
    }
}
```

### 1.4. C# (Program.cs) - Discord.NET

```csharp
using Discord;
using Discord.WebSocket;
using Discord.Net;
using System.Text.Json;

public class Program
{
    private DiscordSocketClient _client;

    public static Task Main(string[] args) => new Program().MainAsync();

    public async Task MainAsync()
    {
        _client = new DiscordSocketClient();
        _client.Log += Log;
        _client.Ready += Client_Ready;
        _client.SlashCommandExecuted += SlashCommandHandler;

        var token = Environment.GetEnvironmentVariable("DISCORD_BOT_TOKEN");
        await _client.LoginAsync(TokenType.Bot, token);
        await _client.StartAsync();
        await Task.Delay(-1);
    }

    private Task Log(LogMessage msg)
    {
        Console.WriteLine(msg.ToString());
        return Task.CompletedTask;
    }

    public async Task Client_Ready()
    {
        // --- [GENERATED COMMANDS BUILDER START] ---
        // (커맨드 등록 로직)
        // --- [GENERATED COMMANDS BUILDER END] ---
    }

    private async Task SlashCommandHandler(SocketSlashCommand command)
    {
        // --- [GENERATED COMMANDS HANDLER START] ---
        // (핸들러 로직)
        // --- [GENERATED COMMANDS HANDLER END] ---
    }
}
```

### 1.5. Go (main.go) - discordgo

```go
package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
    "math/rand"
    "time"

	"github.com/bwmarrin/discordgo"
)

func main() {
    token := os.Getenv("DISCORD_BOT_TOKEN")
	dg, err := discordgo.New("Bot " + token)
	if err != nil { return }

    // --- [GENERATED COMMANDS HANDLER START] ---
    // dg.AddHandler(...)
    // --- [GENERATED COMMANDS HANDLER END] ---

	dg.Open()
    
    // --- [GENERATED COMMANDS REGISTER START] ---
    // dg.ApplicationCommandCreate(...)
    // --- [GENERATED COMMANDS REGISTER END] ---

	fmt.Println("Bot is now running.")
	sc := make(chan os.Signal, 1)
	signal.Notify(sc, syscall.SIGINT, syscall.SIGTERM, os.Interrupt)
	<-sc
	dg.Close()
}
```

### 1.6. C++ (main.cpp) - DPP

```cpp
#include <dpp/dpp.h>
#include <cstdlib>
#include <iostream>

int main() {
    const char* token = std::getenv("DISCORD_BOT_TOKEN");
    dpp::cluster bot(token);

    bot.on_log(dpp::utility::cout_logger());

    bot.on_slashcommand([&bot](const dpp::slashcommand_t& event) {
        // --- [GENERATED COMMANDS HANDLER START] ---
        // (핸들러 로직)
        // --- [GENERATED COMMANDS HANDLER END] ---
    });

    bot.on_ready([&bot](const dpp::ready_t& event) {
        if (dpp::run_once<struct register_bot_commands>()) {
            // --- [GENERATED COMMANDS REGISTER START] ---
            // bot.global_command_create(...)
            // --- [GENERATED COMMANDS REGISTER END] ---
        }
    });

    bot.start(dpp::st_wait);
    return 0;
}
```

---

## 2. 노드별 코드 매핑 (Node Logic Mapping)

### 2.1. Trigger Nodes (TRIGGER_SLASH_COMMAND)

명령어를 등록하고 실행 흐름을 시작합니다.

- **변수**: `{{commandName}}`, `{{description}}`

#### Python (discord.py)

```python
@bot.tree.command(name="{{commandName}}", description="{{description}}")
async def cmd_{{commandName}}(interaction: discord.Interaction):
    user = interaction.user
    channel = interaction.channel
    # [NEXT_NODES_CODE]
```

#### Node.js (discord.js)

```javascript
const cmd_{{commandName}} = new SlashCommandBuilder().setName('{{commandName}}').setDescription('{{description}}');
commands.push(cmd_{{commandName}}.toJSON());
commandMap.set('{{commandName}}', async (interaction) => {
    const user = interaction.user;
    const channel = interaction.channel;
    // [NEXT_NODES_CODE]
});
```

#### Java (JDA)

**Register:**
```java
jda.upsertCommand("{{commandName}}", "{{description}}").queue();
```

**Handler:**
```java
if (event.getName().equals("{{commandName}}")) {
    var user = event.getUser();
    var channel = event.getChannel();
    // [NEXT_NODES_CODE]
}
```

#### C# (Discord.NET)

**Register:**
```csharp
var cmd = new SlashCommandBuilder().WithName("{{commandName}}").WithDescription("{{description}}");
await _client.CreateGlobalApplicationCommandAsync(cmd.Build());
```

**Handler:**
```csharp
if (command.CommandName == "{{commandName}}") {
    var user = command.User;
    var channel = command.Channel;
    // [NEXT_NODES_CODE]
}
```

#### Go (discordgo)

**Register:**
```go
_, _ = dg.ApplicationCommandCreate(dg.State.User.ID, "", &discordgo.ApplicationCommand{
    Name: "{{commandName}}", Description: "{{description}}",
})
```

**Handler:**
```go
if i.ApplicationCommandData().Name == "{{commandName}}" {
    // [NEXT_NODES_CODE]
}
```

#### C++ (DPP)

**Register:**
```cpp
bot.global_command_create(dpp::slashcommand("{{commandName}}", "{{description}}", bot.me.id));
```

**Handler:**
```cpp
if (event.command.get_command_name() == "{{commandName}}") {
    auto user = event.command.usr;
    // [NEXT_NODES_CODE]
}
```

---

### 2.2. Action Nodes (ACTION_SEND_EMBED)

임베드 메시지를 전송합니다.

- **변수**: `{{title}}`, `{{desc}}`, `{{color}}`

#### Python

```python
embed = discord.Embed(title="{{title}}", description=f"{{desc}}", color=discord.Color.from_str("{{color}}"))
if not interaction.response.is_done(): await interaction.response.send_message(embed=embed)
else: await interaction.followup.send(embed=embed)
```

#### Node.js

```javascript
const embed = new EmbedBuilder().setTitle('{{title}}').setDescription(`{{desc}}`).setColor('{{color}}');
if (!interaction.replied) await interaction.reply({ embeds: [embed] });
else await interaction.followup({ embeds: [embed] });
```

#### Java

```java
EmbedBuilder eb = new EmbedBuilder();
eb.setTitle("{{title}}");
eb.setDescription(String.format("{{desc}}"));
eb.setColor(Color.decode("{{color}}"));
if (!event.isAcknowledged()) event.replyEmbeds(eb.build()).queue();
else event.getHook().sendMessageEmbeds(eb.build()).queue();
```

#### C#

```csharp
var embed = new EmbedBuilder().WithTitle("{{title}}").WithDescription($"{{desc}}").WithColor(new Color(Convert.ToUInt32("{{color}}".Substring(1), 16))).Build();
if (!command.HasResponded) await command.RespondAsync(embed: embed);
else await command.FollowupAsync(embed: embed);
```

#### Go

```go
embed := &discordgo.MessageEmbed{ Title: "{{title}}", Description: "{{desc}}", Color: 0x5865F2 } // Hex parsing logic needed
s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
    Type: discordgo.InteractionResponseChannelMessageWithSource,
    Data: &discordgo.InteractionResponseData{ Embeds: []*discordgo.MessageEmbed{embed} },
})
```

#### C++

```cpp
dpp::embed embed = dpp::embed().set_title("{{title}}").set_description("{{desc}}").set_color(dpp::colors::blurple);
event.reply(dpp::message().add_embed(embed));
```

---

### 2.3. Logic Nodes (LOGIC_RANDOM)

난수 생성.

- **변수**: `{{min}}`, `{{max}}`, `{{varName}}`

| 언어 | 코드 |
|------|------|
| Python | `{{varName}} = random.randint({{min}}, {{max}})` |
| Node.js | `let {{varName}} = Math.floor(Math.random() * ({{max}} - {{min}} + 1)) + {{min}};` |
| Java | `int {{varName}} = new Random().nextInt({{max}} - {{min}} + 1) + {{min}};` |
| C# | `int {{varName}} = new Random().Next({{min}}, {{max}} + 1);` |
| Go | `{{varName}} := rand.Intn({{max}} - {{min}} + 1) + {{min}}` |
| C++ | `int {{varName}} = {{min}} + (std::rand() % ({{max}} - {{min}} + 1));` |

---

## 3. 변수 주입 문법 (Variable Injection Syntax)

트랜스파일러는 사용자 입력 `{user.name}`을 각 언어의 문자열 보간 문법으로 변환해야 합니다.

| Format | Python | JS | Java | C# | Go | C++ |
|--------|--------|----|----- |----|----|----|
| Name | `{user.name}` | `${user.username}` | `%s (args)` | `{user.Username}` | `%s (args)` | `+ user.username +` |
| ID | `{user.id}` | `${user.id}` | `%s (args)` | `{user.Id}` | `%s (args)` | `+ std::to_string(user.id) +` |

---

## 4. 트랜스파일러 구현 노트

- **동적 등록**: Python/JS는 코드가 실행될 때 커맨드를 등록하지만, C++/Go/Java는 빌더 패턴이나 별도의 등록 함수를 호출하는 구조가 필요하므로 코드 생성 시 **'등록부(Register)'**와 **'실행부(Handler)'**를 분리하여 생성해야 합니다.

- **색상 처리**: 웹에서는 Hex Code (`#FFFFFF`)를 쓰지만, Go나 C++ 라이브러리는 정수형(Integer) 색상값이나 별도 Enum을 요구하는 경우가 많아 Hex to Int 변환 로직이 생성기에 포함되어야 합니다.