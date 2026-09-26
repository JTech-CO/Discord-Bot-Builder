import useNodeStore from '../../store/nodeStore';

/**
 * IR Generator - 노드 그래프 → 중간 표현(IR) 변환
 * 
 * React Flow 노드/엣지를 코드 생성에 적합한
 * 트리 구조(Intermediate Representation)로 변환합니다.
 * 
 * IR 구조:
 * {
 *   flows: [
 *     {
 *       trigger: { nodeType, props, id },
 *       children: [
 *         { nodeType, props, id, children: [...] }
 *       ]
 *     }
 *   ]
 * }
 */

/**
 * 캔버스 상태에서 IR을 생성합니다.
 * @param {string[]|null} filterNodeIds - 특정 노드 ID만 포함 (null이면 전체)
 */
export function generateIR(filterNodeIds = null) {
    const state = useNodeStore.getState();
    let { nodes, edges } = state;

    // 특정 봇 그룹만 필터링
    if (filterNodeIds) {
        const idSet = new Set(filterNodeIds);
        nodes = nodes.filter((n) => idSet.has(n.id));
        edges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    }

    if (nodes.length === 0) {
        return { flows: [], warnings: ['캔버스에 노드가 없습니다.'] };
    }

    const warnings = [];

    // 엣지를 인접 리스트로 변환
    const adjacency = buildAdjacencyList(edges);

    // TRIGGER 노드를 찾아서 각각 하나의 flow로 변환
    const triggerNodes = nodes.filter((n) =>
        n.data?.nodeType?.startsWith('TRIGGER_')
    );

    if (triggerNodes.length === 0) {
        warnings.push('Trigger 노드가 없습니다. 봇은 최소 하나의 Trigger가 필요합니다.');
    }

    // 연결되지 않은 노드 감지
    const connectedIds = new Set();
    edges.forEach((e) => {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
    });
    triggerNodes.forEach((n) => connectedIds.add(n.id));

    const orphanNodes = nodes.filter((n) =>
        !connectedIds.has(n.id) && !n.data?.nodeType?.startsWith('TRIGGER_')
    );
    if (orphanNodes.length > 0) {
        warnings.push(`${orphanNodes.length}개 노드가 어떤 플로우에도 연결되지 않았습니다.`);
    }

    const flows = triggerNodes.map((triggerNode) => {
        const visited = new Set();
        const tree = buildTree(triggerNode, nodes, adjacency, visited, edges);
        return tree;
    });

    return { flows, warnings };
}

/**
 * 엣지 배열을 인접 리스트로 변환
 */
function buildAdjacencyList(edges) {
    const adj = {};
    edges.forEach((edge) => {
        if (!adj[edge.source]) adj[edge.source] = [];
        adj[edge.source].push({
            target: edge.target,
            sourceHandle: edge.sourceHandle || null,
        });
    });
    return adj;
}

/**
 * 재귀적으로 노드 트리를 구축
 */
function buildTree(node, allNodes, adjacency, visited, edges) {
    if (visited.has(node.id)) return null; // 순환 방지
    visited.add(node.id);

    const irNode = {
        id: node.id,
        nodeType: node.data?.nodeType || node.type,
        props: node.data?.props || {},
        children: [],
        branches: null, // If/Else 등 다중 분기용
    };

    const outgoing = adjacency[node.id] || [];

    // If/Else: 분기별로 그룹화
    if (irNode.nodeType === 'LOGIC_IF_ELSE') {
        const trueBranch = [];
        const falseBranch = [];

        outgoing.forEach((edge) => {
            const childNode = allNodes.find((n) => n.id === edge.target);
            if (!childNode) return;
            const childTree = buildTree(childNode, allNodes, adjacency, visited, edges);
            if (!childTree) return;

            if (edge.sourceHandle === 'output-0') {
                trueBranch.push(childTree);
            } else if (edge.sourceHandle === 'output-1') {
                falseBranch.push(childTree);
            } else {
                trueBranch.push(childTree); // 기본적으로 true
            }
        });

        irNode.branches = { true: trueBranch, false: falseBranch };
    }
    // Switch: case별 그룹화
    else if (irNode.nodeType === 'LOGIC_SWITCH') {
        const cases = {};
        outgoing.forEach((edge, i) => {
            const childNode = allNodes.find((n) => n.id === edge.target);
            if (!childNode) return;
            const childTree = buildTree(childNode, allNodes, adjacency, visited, edges);
            if (!childTree) return;
            const caseKey = edge.sourceHandle || `case-${i}`;
            if (!cases[caseKey]) cases[caseKey] = [];
            cases[caseKey].push(childTree);
        });
        irNode.branches = cases;
    }
    // 일반 노드: 순차 연결
    else {
        outgoing.forEach((edge) => {
            const childNode = allNodes.find((n) => n.id === edge.target);
            if (!childNode) return;
            const childTree = buildTree(childNode, allNodes, adjacency, visited, edges);
            if (childTree) irNode.children.push(childTree);
        });
    }

    return irNode;
}

export default generateIR;
