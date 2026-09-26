/**
 * Python Generator - IR → discord.py 2.0+ 코드 변환
 */

const SKELETON_PYTHON = `import discord
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
        await self.tree.sync()
        print(f"Synced slash commands for {self.user}")

bot = MyBot()

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')

##GENERATED_CODE##

if __name__ == "__main__":
    bot.run(TOKEN)
`;

export function generatePython(ir) {
    const blocks = [];

    for (const flow of ir.flows) {
        const code = generateFlowPython(flow, 0);
        blocks.push(code);
    }

    const generated = blocks.join('\n\n');
    return SKELETON_PYTHON.replace('##GENERATED_CODE##', generated);
}

function generateFlowPython(node, indent) {
    const pad = '    '.repeat(indent);
    let code = '';

    switch (node.nodeType) {
        // ── Triggers ─────────────────────────
        case 'TRIGGER_SLASH_COMMAND': {
            const name = node.props.commandName || 'mycommand';
            const desc = node.props.description || 'A bot command';
            code += `@bot.tree.command(name="${name}", description="${desc}")\n`;
            code += `async def cmd_${sanitize(name)}(interaction: discord.Interaction):\n`;
            code += `    user = interaction.user\n`;
            code += `    channel = interaction.channel\n`;
            code += generateChildrenPython(node.children, 1);
            break;
        }
        case 'TRIGGER_MESSAGE_KEYWORD': {
            const keywords = node.props.keywords || [];
            const kw = Array.isArray(keywords) ? keywords : [keywords];
            const exact = node.props.isExactMatch ? 'True' : 'False';
            code += `@bot.event\n`;
            code += `async def on_message(message):\n`;
            code += `    if message.author.bot:\n`;
            code += `        return\n`;
            code += `    content = message.content\n`;
            code += `    keywords = ${JSON.stringify(kw)}\n`;
            code += `    matched = any(k == content for k in keywords) if ${exact} else any(k in content for k in keywords)\n`;
            code += `    if matched:\n`;
            code += generateChildrenPython(node.children, 2);
            break;
        }
        case 'TRIGGER_COMPONENT': {
            const customId = node.props.customId || 'btn_id';
            code += `@bot.event\n`;
            code += `async def on_interaction(interaction: discord.Interaction):\n`;
            code += `    if interaction.type == discord.InteractionType.component:\n`;
            code += `        if interaction.data.get('custom_id') == "${customId}":\n`;
            code += generateChildrenPython(node.children, 3);
            break;
        }
        case 'TRIGGER_MEMBER_EVENT': {
            const eventType = node.props.eventType || 'JOIN';
            const eventMap = { JOIN: 'on_member_join', LEAVE: 'on_member_remove', BAN: 'on_member_ban', UNBAN: 'on_member_unban' };
            const eventName = eventMap[eventType] || 'on_member_join';
            code += `@bot.event\n`;
            code += `async def ${eventName}(member):\n`;
            code += generateChildrenPython(node.children, 1);
            break;
        }
        case 'TRIGGER_VOICE_STATE': {
            code += `@bot.event\n`;
            code += `async def on_voice_state_update(member, before, after):\n`;
            if (node.props.targetChannel) {
                code += `    if str(after.channel.id) != "${node.props.targetChannel}":\n`;
                code += `        return\n`;
            }
            code += generateChildrenPython(node.children, 1);
            break;
        }

        // ── Actions ──────────────────────────
        case 'ACTION_SEND_EMBED': {
            const title = varInjectPy(node.props.title || 'Title');
            const desc = varInjectPy(node.props.description || '');
            const color = node.props.color || '#5865F2';
            code += `${pad}embed = discord.Embed(\n`;
            code += `${pad}    title=f"${title}",\n`;
            code += `${pad}    description=f"${desc}",\n`;
            code += `${pad}    color=discord.Color.from_str("${color}")\n`;
            code += `${pad})\n`;
            if (node.props.footer) code += `${pad}embed.set_footer(text=f"${varInjectPy(node.props.footer)}")\n`;
            if (node.props.imageUrl) code += `${pad}embed.set_image(url="${node.props.imageUrl}")\n`;
            code += `${pad}if not interaction.response.is_done():\n`;
            code += `${pad}    await interaction.response.send_message(embed=embed)\n`;
            code += `${pad}else:\n`;
            code += `${pad}    await interaction.followup.send(embed=embed)\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'ACTION_MANAGE_USER': {
            const action = node.props.actionType || 'ADD_ROLE';
            const value = node.props.value || '';
            const reason = node.props.reason || '';
            if (action === 'ADD_ROLE') {
                code += `${pad}role = interaction.guild.get_role(${value})\n`;
                code += `${pad}if role:\n`;
                code += `${pad}    await user.add_roles(role, reason="${reason}")\n`;
            } else if (action === 'REMOVE_ROLE') {
                code += `${pad}role = interaction.guild.get_role(${value})\n`;
                code += `${pad}if role:\n`;
                code += `${pad}    await user.remove_roles(role, reason="${reason}")\n`;
            } else if (action === 'KICK') {
                code += `${pad}await user.kick(reason="${reason}")\n`;
            } else if (action === 'BAN') {
                code += `${pad}await user.ban(reason="${reason}")\n`;
            } else if (action === 'TIMEOUT') {
                code += `${pad}import datetime\n`;
                code += `${pad}await user.timeout(datetime.timedelta(seconds=${value || 60}), reason="${reason}")\n`;
            }
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'ACTION_MANAGE_CHANNEL': {
            const action = node.props.actionType || 'CREATE';
            if (action === 'CREATE') {
                code += `${pad}new_channel = await interaction.guild.create_text_channel("${node.props.name || 'new-channel'}")\n`;
            } else if (action === 'DELETE') {
                code += `${pad}await interaction.channel.delete(reason="Bot command")\n`;
            }
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'ACTION_ATTACH_COMPONENT': {
            const cType = node.props.componentType || 'BUTTON';
            const label = node.props.label || 'Click';
            const customId = node.props.customId || 'btn_id';
            const style = node.props.style || 'PRIMARY';
            const styleMap = { PRIMARY: 'discord.ButtonStyle.primary', DANGER: 'discord.ButtonStyle.danger', LINK: 'discord.ButtonStyle.link' };
            code += `${pad}view = discord.ui.View()\n`;
            if (cType === 'BUTTON') {
                code += `${pad}view.add_item(discord.ui.Button(label="${label}", custom_id="${customId}", style=${styleMap[style] || styleMap.PRIMARY}))\n`;
            }
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'ACTION_SHOW_MODAL': {
            code += `${pad}# Modal implementation requires discord.ui.Modal subclass\n`;
            code += `${pad}pass  # TODO: Implement modal "${node.props.title || 'Modal'}"\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }

        // ── Logic ────────────────────────────
        case 'LOGIC_VARIABLE': {
            const key = sanitize(node.props.key || 'myvar');
            const op = node.props.operation || 'SET';
            const val = node.props.value || '0';
            if (op === 'SET') code += `${pad}var_${key} = ${val}\n`;
            else if (op === 'GET') code += `${pad}# var_${key} is used\n`;
            else if (op === 'ADD') code += `${pad}var_${key} += ${val}\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'LOGIC_MATH': {
            const a = node.props.valueA || '0';
            const op = node.props.operator || '+';
            const b = node.props.valueB || '0';
            code += `${pad}calc_result = ${a} ${op} ${b}\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'LOGIC_RANDOM': {
            const min = node.props.min ?? 1;
            const max = node.props.max ?? 100;
            code += `${pad}rand_result = random.randint(${min}, ${max})\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'LOGIC_IF_ELSE': {
            const a = node.props.valueA || 'True';
            const comp = node.props.comparator || '==';
            const b = node.props.valueB || 'True';
            const pyComp = comp === 'CONTAINS' ? `"${b}" in str(${a})` : `${a} ${comp} ${b}`;
            code += `${pad}if ${pyComp}:\n`;
            if (node.branches?.true?.length) {
                node.branches.true.forEach((child) => {
                    code += generateFlowPython(child, indent + 1);
                });
            } else {
                code += `${pad}    pass\n`;
            }
            code += `${pad}else:\n`;
            if (node.branches?.false?.length) {
                node.branches.false.forEach((child) => {
                    code += generateFlowPython(child, indent + 1);
                });
            } else {
                code += `${pad}    pass\n`;
            }
            break;
        }
        case 'LOGIC_LOOP': {
            const loopType = node.props.loopType || 'COUNT';
            const count = node.props.count || 10;
            if (loopType === 'COUNT') {
                code += `${pad}for i in range(${count}):\n`;
            } else {
                code += `${pad}for item in ${node.props.listVariable || '[]'}:\n`;
            }
            code += generateChildrenPython(node.children, indent + 1);
            if (!node.children.length) code += `${pad}    pass\n`;
            break;
        }
        case 'LOGIC_WAIT': {
            const dur = node.props.duration || 5;
            const unit = node.props.unit || 'SECONDS';
            const seconds = unit === 'MINUTES' ? dur * 60 : unit === 'HOURS' ? dur * 3600 : dur;
            code += `${pad}import asyncio\n`;
            code += `${pad}await asyncio.sleep(${seconds})\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'LOGIC_STRING_MANIPULATION': {
            const action = node.props.action || 'UPPERCASE';
            const input = node.props.inputText || '""';
            if (action === 'UPPERCASE') code += `${pad}string_result = str(${input}).upper()\n`;
            else if (action === 'SPLIT') code += `${pad}string_result = str(${input}).split("${node.props.param || ','}")\n`;
            else if (action === 'REPLACE') code += `${pad}string_result = str(${input}).replace("${node.props.param || ''}", "")\n`;
            else if (action === 'JOIN') code += `${pad}string_result = "${node.props.param || ','}".join(${input})\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'LOGIC_SWITCH':
        case 'LOGIC_LIST_MANIPULATION':
        case 'LOGIC_DATE_TIME': {
            code += `${pad}# ${node.nodeType}: ${JSON.stringify(node.props)}\n`;
            code += `${pad}pass  # TODO: implement\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }

        // ── Integration ──────────────────────
        case 'INTEG_HTTP_REQUEST': {
            const method = node.props.method || 'GET';
            const url = node.props.url || 'https://example.com';
            code += `${pad}import aiohttp\n`;
            code += `${pad}async with aiohttp.ClientSession() as session:\n`;
            code += `${pad}    async with session.${method.toLowerCase()}("${url}") as resp:\n`;
            code += `${pad}        response_data = await resp.json()\n`;
            code += `${pad}        response_status = resp.status\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'INTEG_WEBHOOK': {
            const url = node.props.webhookUrl || '';
            code += `${pad}webhook = discord.Webhook.from_url("${url}", session=bot.http._HTTPClient__session)\n`;
            code += `${pad}await webhook.send(content="${varInjectPy(node.props.content || '')}")\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
        case 'INTEG_LLM_CHAT': {
            code += `${pad}import google.generativeai as genai\n`;
            code += `${pad}genai.configure(api_key=os.getenv('GEMINI_API_KEY'))\n`;
            code += `${pad}ai_model = genai.GenerativeModel('gemini-2.0-flash')\n`;
            code += `${pad}ai_response = ai_model.generate_content(f"${varInjectPy(node.props.userPrompt || '')}").text\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }

        // ── Fallback ─────────────────────────
        default: {
            code += `${pad}# ${node.nodeType}: ${JSON.stringify(node.props)}\n`;
            code += `${pad}pass  # TODO: implement ${node.nodeType}\n`;
            code += generateChildrenPython(node.children, indent);
            break;
        }
    }

    return code;
}

function generateChildrenPython(children, indent) {
    if (!children || children.length === 0) return '';
    return children.map((child) => generateFlowPython(child, indent)).join('');
}

function varInjectPy(text) {
    if (!text) return '';
    return text
        .replace(/\{user\.name\}/g, '{user.name}')
        .replace(/\{user\.id\}/g, '{user.id}')
        .replace(/\{channel\.name\}/g, '{channel.name}')
        .replace(/\{var\.(\w+)\}/g, '{var_$1}');
}

function sanitize(str) {
    return (str || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}
