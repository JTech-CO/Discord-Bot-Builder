/**
 * JavaScript Generator - IR → discord.js v14+ 코드 변환
 */

const SKELETON_JS = `const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const commands = [];
const commandMap = new Map();

client.once(Events.ClientReady, c => {
    console.log(\`Ready! Logged in as \${c.user.tag}\`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const handler = commandMap.get(interaction.commandName);
        if (handler) await handler(interaction);
    }
});

##EVENT_HANDLERS##

async function main() {
##GENERATED_CODE##

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
`;

export function generateJavaScript(ir) {
    const commandBlocks = [];
    const eventBlocks = [];

    for (const flow of ir.flows) {
        if (flow.nodeType?.startsWith('TRIGGER_SLASH_COMMAND')) {
            commandBlocks.push(generateFlowJS(flow, 1));
        } else {
            eventBlocks.push(generateEventJS(flow));
        }
    }

    return SKELETON_JS
        .replace('##GENERATED_CODE##', commandBlocks.join('\n\n'))
        .replace('##EVENT_HANDLERS##', eventBlocks.join('\n\n'));
}

function generateFlowJS(node, indent) {
    const pad = '    '.repeat(indent);
    let code = '';

    switch (node.nodeType) {
        case 'TRIGGER_SLASH_COMMAND': {
            const name = node.props.commandName || 'mycommand';
            const desc = node.props.description || 'A bot command';
            code += `${pad}// Command: /${name}\n`;
            code += `${pad}const cmd_${sanitize(name)} = new SlashCommandBuilder()\n`;
            code += `${pad}    .setName('${name}')\n`;
            code += `${pad}    .setDescription('${desc}');\n`;
            code += `${pad}commands.push(cmd_${sanitize(name)}.toJSON());\n\n`;
            code += `${pad}commandMap.set('${name}', async (interaction) => {\n`;
            code += `${pad}    const user = interaction.user;\n`;
            code += `${pad}    const channel = interaction.channel;\n`;
            code += generateChildrenJS(node.children, indent + 1);
            code += `${pad}});\n`;
            break;
        }

        case 'ACTION_SEND_EMBED': {
            const nid = sanitize(node.id);
            const title = varInjectJS(node.props.title || 'Title');
            const desc = varInjectJS(node.props.description || '');
            const color = node.props.color || '#5865F2';
            code += `${pad}const embed_${nid} = new EmbedBuilder()\n`;
            code += `${pad}    .setTitle(\`${title}\`)\n`;
            code += `${pad}    .setDescription(\`${desc}\`)\n`;
            code += `${pad}    .setColor('${color}');\n`;
            if (node.props.footer) code += `${pad}embed_${nid}.setFooter({ text: \`${varInjectJS(node.props.footer)}\` });\n`;
            if (node.props.imageUrl) code += `${pad}embed_${nid}.setImage('${node.props.imageUrl}');\n`;
            code += `${pad}if (!interaction.replied && !interaction.deferred) {\n`;
            code += `${pad}    await interaction.reply({ embeds: [embed_${nid}] });\n`;
            code += `${pad}} else {\n`;
            code += `${pad}    await interaction.followup.send({ embeds: [embed_${nid}] });\n`;
            code += `${pad}}\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'ACTION_MANAGE_USER': {
            const action = node.props.actionType || 'ADD_ROLE';
            const value = node.props.value || '';
            const reason = node.props.reason || '';
            if (action === 'ADD_ROLE') {
                code += `${pad}const role = interaction.guild.roles.cache.get('${value}');\n`;
                code += `${pad}if (role) await interaction.member.roles.add(role, '${reason}');\n`;
            } else if (action === 'REMOVE_ROLE') {
                code += `${pad}const role = interaction.guild.roles.cache.get('${value}');\n`;
                code += `${pad}if (role) await interaction.member.roles.remove(role, '${reason}');\n`;
            } else if (action === 'KICK') {
                code += `${pad}await interaction.member.kick('${reason}');\n`;
            } else if (action === 'BAN') {
                code += `${pad}await interaction.member.ban({ reason: '${reason}' });\n`;
            } else if (action === 'TIMEOUT') {
                code += `${pad}await interaction.member.timeout(${(value || 60) * 1000}, '${reason}');\n`;
            }
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'ACTION_MANAGE_CHANNEL': {
            const action = node.props.actionType || 'CREATE';
            if (action === 'CREATE') {
                code += `${pad}const newChannel = await interaction.guild.channels.create({ name: '${node.props.name || 'new-channel'}' });\n`;
            } else if (action === 'DELETE') {
                code += `${pad}await interaction.channel.delete();\n`;
            }
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'ACTION_ATTACH_COMPONENT': {
            const label = node.props.label || 'Click';
            const customId = node.props.customId || 'btn_id';
            code += `${pad}const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');\n`;
            code += `${pad}const row = new ActionRowBuilder().addComponents(\n`;
            code += `${pad}    new ButtonBuilder().setCustomId('${customId}').setLabel('${label}').setStyle(ButtonStyle.Primary)\n`;
            code += `${pad});\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'ACTION_SHOW_MODAL': {
            code += `${pad}// TODO: Implement modal "${node.props.title || 'Modal'}"\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }

        // ── Logic ─────────────────────────
        case 'LOGIC_VARIABLE': {
            const key = sanitize(node.props.key || 'myvar');
            const op = node.props.operation || 'SET';
            const val = node.props.value || '0';
            if (op === 'SET') code += `${pad}let var_${key} = ${val};\n`;
            else if (op === 'ADD') code += `${pad}var_${key} += ${val};\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'LOGIC_MATH': {
            const a = node.props.valueA || '0';
            const op = node.props.operator || '+';
            const b = node.props.valueB || '0';
            code += `${pad}const calcResult = ${a} ${op} ${b};\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'LOGIC_RANDOM': {
            const min = node.props.min ?? 1;
            const max = node.props.max ?? 100;
            code += `${pad}const randResult = Math.floor(Math.random() * (${max} - ${min} + 1)) + ${min};\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'LOGIC_IF_ELSE': {
            const a = node.props.valueA || 'true';
            const comp = node.props.comparator || '==';
            const b = node.props.valueB || 'true';
            let condition;
            if (comp === 'CONTAINS') condition = `String(${a}).includes('${b}')`;
            else if (comp === '==') condition = `${a} === ${b}`;
            else if (comp === '!=') condition = `${a} !== ${b}`;
            else condition = `${a} ${comp} ${b}`;

            code += `${pad}if (${condition}) {\n`;
            if (node.branches?.true?.length) {
                node.branches.true.forEach((child) => {
                    code += generateFlowJS(child, indent + 1);
                });
            }
            code += `${pad}} else {\n`;
            if (node.branches?.false?.length) {
                node.branches.false.forEach((child) => {
                    code += generateFlowJS(child, indent + 1);
                });
            }
            code += `${pad}}\n`;
            break;
        }
        case 'LOGIC_LOOP': {
            const loopType = node.props.loopType || 'COUNT';
            const count = node.props.count || 10;
            if (loopType === 'COUNT') {
                code += `${pad}for (let i = 0; i < ${count}; i++) {\n`;
            } else {
                code += `${pad}for (const item of ${node.props.listVariable || '[]'}) {\n`;
            }
            code += generateChildrenJS(node.children, indent + 1);
            code += `${pad}}\n`;
            break;
        }
        case 'LOGIC_WAIT': {
            const dur = node.props.duration || 5;
            const unit = node.props.unit || 'SECONDS';
            const ms = unit === 'MINUTES' ? dur * 60000 : unit === 'HOURS' ? dur * 3600000 : dur * 1000;
            code += `${pad}await new Promise(r => setTimeout(r, ${ms}));\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'LOGIC_STRING_MANIPULATION': {
            const action = node.props.action || 'UPPERCASE';
            const input = node.props.inputText || '""';
            if (action === 'UPPERCASE') code += `${pad}const stringResult = String(${input}).toUpperCase();\n`;
            else if (action === 'SPLIT') code += `${pad}const stringResult = String(${input}).split('${node.props.param || ','}');\n`;
            else if (action === 'REPLACE') code += `${pad}const stringResult = String(${input}).replace('${node.props.param || ''}', '');\n`;
            else if (action === 'JOIN') code += `${pad}const stringResult = ${input}.join('${node.props.param || ','}');\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }

        // ── Integration ──────────────────
        case 'INTEG_HTTP_REQUEST': {
            const method = node.props.method || 'GET';
            const url = node.props.url || 'https://example.com';
            code += `${pad}const response = await fetch('${url}', { method: '${method}' });\n`;
            code += `${pad}const responseData = await response.json();\n`;
            code += `${pad}const responseStatus = response.status;\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'INTEG_WEBHOOK': {
            const url = node.props.webhookUrl || '';
            code += `${pad}const { WebhookClient } = require('discord.js');\n`;
            code += `${pad}const webhook = new WebhookClient({ url: '${url}' });\n`;
            code += `${pad}await webhook.send({ content: \`${varInjectJS(node.props.content || '')}\` });\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
        case 'INTEG_LLM_CHAT': {
            code += `${pad}const { GoogleGenerativeAI } = require('@google/generative-ai');\n`;
            code += `${pad}const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);\n`;
            code += `${pad}const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });\n`;
            code += `${pad}const aiResult = await aiModel.generateContent(\`${varInjectJS(node.props.userPrompt || '')}\`);\n`;
            code += `${pad}const aiResponse = aiResult.response.text();\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }

        default: {
            code += `${pad}// TODO: ${node.nodeType}: ${JSON.stringify(node.props)}\n`;
            code += generateChildrenJS(node.children, indent);
            break;
        }
    }

    return code;
}

function generateEventJS(flow) {
    let code = '';

    switch (flow.nodeType) {
        case 'TRIGGER_MESSAGE_KEYWORD': {
            const keywords = flow.props.keywords || [];
            const kw = Array.isArray(keywords) ? keywords : [keywords];
            const exact = flow.props.isExactMatch;
            code += `client.on(Events.MessageCreate, async message => {\n`;
            code += `    if (message.author.bot) return;\n`;
            code += `    const content = message.content;\n`;
            code += `    const keywords = ${JSON.stringify(kw)};\n`;
            code += `    const matched = ${exact ? 'keywords.includes(content)' : 'keywords.some(k => content.includes(k))'};\n`;
            code += `    if (matched) {\n`;
            code += generateChildrenJS(flow.children, 2);
            code += `    }\n`;
            code += `});\n`;
            break;
        }
        case 'TRIGGER_MEMBER_EVENT': {
            const eventMap = { JOIN: 'GuildMemberAdd', LEAVE: 'GuildMemberRemove', BAN: 'GuildBanAdd', UNBAN: 'GuildBanRemove' };
            const event = eventMap[flow.props.eventType] || 'GuildMemberAdd';
            code += `client.on(Events.${event}, async member => {\n`;
            code += generateChildrenJS(flow.children, 1);
            code += `});\n`;
            break;
        }
        case 'TRIGGER_VOICE_STATE': {
            code += `client.on(Events.VoiceStateUpdate, async (oldState, newState) => {\n`;
            code += `    const member = newState.member;\n`;
            if (flow.props.targetChannel) {
                code += `    if (newState.channelId !== '${flow.props.targetChannel}') return;\n`;
            }
            code += generateChildrenJS(flow.children, 1);
            code += `});\n`;
            break;
        }
        case 'TRIGGER_COMPONENT': {
            code += `client.on(Events.InteractionCreate, async interaction => {\n`;
            code += `    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;\n`;
            code += `    if (interaction.customId !== '${flow.props.customId || ''}') return;\n`;
            code += generateChildrenJS(flow.children, 1);
            code += `});\n`;
            break;
        }
        default: {
            code += `// TODO: Event handler for ${flow.nodeType}\n`;
            break;
        }
    }

    return code;
}

function generateChildrenJS(children, indent) {
    if (!children || children.length === 0) return '';
    return children.map((child) => generateFlowJS(child, indent)).join('');
}

function varInjectJS(text) {
    if (!text) return '';
    return text
        .replace(/\{user\.name\}/g, '${user.username}')
        .replace(/\{user\.id\}/g, '${user.id}')
        .replace(/\{channel\.name\}/g, '${channel.name}')
        .replace(/\{var\.(\w+)\}/g, '${var_$1}');
}

function sanitize(str) {
    return (str || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}
