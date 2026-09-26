import { GoogleGenerativeAI } from '@google/generative-ai';
import useAIStore from '../store/aiStore';
import useNodeStore from '../store/nodeStore';
import NODE_SCHEMA, { getNodeSchema, getCategoryLabel } from '../data/nodeSchema';

/**
 * Gemini Service - AI 통합 레이어
 * 
 * 사용자가 입력한 API 키를 사용하여 Gemini API를 호출합니다.
 * 두 가지 모드:
 * 1. generateFlow - 자연어 → 노드 플로우 자동 생성
 * 2. chatAssist   - 자연어 대화 (질의응답)
 */

let genAI = null;
let model = null;

// ── 초기화 ─────────────────────────────────
function initializeClient(apiKey, modelName) {
    if (!apiKey) throw new Error('API Key가 설정되지 않았습니다.');
    const selectedModel = modelName || useAIStore.getState().selectedModel || 'gemini-2.5-flash';
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: selectedModel });
}

// ── API 키 검증 ────────────────────────────
export async function validateApiKey(apiKey) {
    const store = useAIStore.getState();
    store.setKeyChecking(true);

    try {
        const selectedModel = store.selectedModel || 'gemini-2.5-flash';
        const testAI = new GoogleGenerativeAI(apiKey);
        const testModel = testAI.getGenerativeModel({ model: selectedModel });
        const result = await testModel.generateContent('Say "OK" in one word.');
        const text = result.response?.text?.();

        if (text) {
            store.setApiKey(apiKey);
            store.setKeyValid(true);
            store.setKeyChecking(false);
            initializeClient(apiKey);
            return { success: true };
        }
        throw new Error('응답이 비어있습니다.');
    } catch (error) {
        store.setKeyValid(false);
        store.setKeyChecking(false);
        return {
            success: false,
            error: error.message || 'API 키를 확인해주세요.',
        };
    }
}

// ── 자동 초기화 (저장된 키가 있을 경우) ────
export function tryAutoInit() {
    const key = useAIStore.getState().apiKey;
    if (key) {
        try {
            initializeClient(key);
            useAIStore.getState().setKeyValid(true);
        } catch {
            // 실패 시 무시 (사용자가 수동으로 재입력)
        }
    }
}

// ── 기존 노드 바운딩 박스 계산 ─────────────
function calcExistingBounds(nodes) {
    if (nodes.length === 0) return null;
    const NODE_W = 240;
    const NODE_H = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + NODE_W);
        maxY = Math.max(maxY, n.position.y + NODE_H);
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// ── 노드 플로우 생성 (핵심 기능) ───────────
export async function generateFlow(userPrompt) {
    const store = useAIStore.getState();
    if (!store.apiKey) {
        store.openKeyModal();
        throw new Error('API 키를 먼저 설정해주세요.');
    }

    if (!model) initializeClient(store.apiKey);
    store.setProcessing(true);
    store.addChatMessage('user', userPrompt);

    // 사용 가능한 노드 타입 목록 생성
    const availableNodes = Object.entries(NODE_SCHEMA).map(([type, schema]) => (
        `- ${type}: ${schema.label} (${getCategoryLabel(type)}) - ${schema.description}`
    )).join('\n');

    const systemPrompt = `You are an AI assistant for the Hybrid AI Bot Builder.
Your task is to convert natural language descriptions into a node-based flow for Discord bots.

Available node types:
${availableNodes}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no explanation.
2. The JSON must have this structure:
{
  "botLabel": "봇 이름 (예: 욕설 감지 봇, 룰렛 게임 봇 등 - Korean, concise)",
  "nodes": [
    {
      "id": "unique_id",
      "type": "NODE_TYPE_FROM_LIST",
      "position": { "x": number, "y": number },
      "props": { "key": "value" }
    }
  ],
  "edges": [
    {
      "source": "source_node_id",
      "target": "target_node_id",
      "sourceHandle": "output-0",
      "targetHandle": null
    }
  ]
}
3. Position nodes starting from x:0, y:0, in a logical top-to-bottom, left-to-right flow.
4. Start with TRIGGER nodes, connect through LOGIC nodes, end with ACTION nodes.
5. Space nodes approximately 250px apart vertically and 300px apart horizontally.
6. Fill in reasonable prop values based on the user's description.
7. For If/Else nodes, use sourceHandle "output-0" for True and "output-1" for False.
8. The "botLabel" field must be a short Korean name describing the bot's function.`;

    try {
        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `User request: ${userPrompt}` },
        ]);

        const responseText = result.response?.text?.() || '';
        store.addChatMessage('assistant', responseText);

        // JSON 추출 (```json ... ``` 감싸기 대응)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];

        const flowData = JSON.parse(jsonStr.trim());

        // 기존 노드가 있으면 오프셋 계산
        const nodeStore = useNodeStore.getState();
        const existingNodes = nodeStore.nodes;
        let offsetX = 0;
        let offsetY = 0;

        if (existingNodes.length > 0) {
            const bounds = calcExistingBounds(existingNodes);
            if (bounds) {
                // 기존 노드 그룹의 오른쪽에 100px 간격을 두고 배치
                offsetX = bounds.maxX + 100;
                offsetY = bounds.minY; // 같은 Y 높이에서 시작
            }
        }

        const groupId = `group_${Date.now()}`;
        const botLabel = flowData.botLabel || userPrompt.slice(0, 20) + '...';

        // 노드 → React Flow 형식 변환 (오프셋 적용)
        const rfNodes = (flowData.nodes || []).map((n) => ({
            id: n.id,
            type: 'baseNode',
            position: {
                x: (n.position?.x || 0) + offsetX,
                y: (n.position?.y || 0) + offsetY,
            },
            data: {
                nodeType: n.type,
                props: n.props || {},
                groupId,
            },
        }));

        const rfEdges = (flowData.edges || []).map((e, i) => ({
            id: `ai_edge_${i}_${Date.now()}`,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
            type: 'step',
            style: { stroke: '#4F5660', strokeWidth: 1.5 },
        }));

        // 캔버스에 추가
        const existingEdges = nodeStore.edges;
        nodeStore.setNodes([...existingNodes, ...rfNodes]);
        nodeStore.setEdges([...existingEdges, ...rfEdges]);

        // 봇 그룹 등록
        nodeStore.addBotGroup({
            id: groupId,
            label: botLabel,
            nodeIds: rfNodes.map((n) => n.id),
        });

        store.setLastResult({ success: true, nodesAdded: rfNodes.length });
        store.setProcessing(false);

        return {
            success: true,
            nodesAdded: rfNodes.length,
            edgesAdded: rfEdges.length,
        };

    } catch (error) {
        store.addChatMessage('error', error.message);
        store.setProcessing(false);
        store.setLastResult({ success: false, error: error.message });
        throw error;
    }
}

// ── 일반 채팅 (질의응답) ───────────────────
export async function chatAssist(userPrompt) {
    const store = useAIStore.getState();
    if (!store.apiKey) {
        store.openKeyModal();
        throw new Error('API 키를 먼저 설정해주세요.');
    }

    if (!model) initializeClient(store.apiKey);
    store.setProcessing(true);
    store.addChatMessage('user', userPrompt);

    const systemPrompt = `You are a helpful Discord bot development assistant.
You help users build Discord bots using the Hybrid AI Bot Builder.
Answer questions about Discord.js/py concepts, bot architecture, and node configurations.
Keep responses concise and practical. Use Korean when appropriate.`;

    try {
        const result = await model.generateContent([
            { text: systemPrompt },
            { text: userPrompt },
        ]);

        const responseText = result.response?.text?.() || '';
        store.addChatMessage('assistant', responseText);
        store.setProcessing(false);

        return { success: true, response: responseText };

    } catch (error) {
        store.addChatMessage('error', error.message);
        store.setProcessing(false);
        throw error;
    }
}
