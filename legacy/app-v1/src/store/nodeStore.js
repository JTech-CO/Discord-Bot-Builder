import { create } from 'zustand';
import {
    applyNodeChanges,
    applyEdgeChanges,
    addEdge as rfAddEdge,
} from 'reactflow';

/**
 * Node Store - 캔버스 노드/엣지 상태 관리 (Zustand)
 * 
 * React Flow의 상태를 중앙 집중 관리하여
 * Workspace 외부 컴포넌트(Inspector, SideBar 등)에서도 접근 가능하게 합니다.
 */
const useNodeStore = create((set, get) => ({
    // ── Nodes & Edges ────────────────────────
    nodes: [],
    edges: [],

    // ── Bot Groups (AI가 생성한 봇 단위 그룹) ──
    botGroups: [],
    // { id, label, nodeIds: string[] }

    addBotGroup: (group) => set((s) => ({
        botGroups: [...s.botGroups, group],
    })),

    removeBotGroup: (groupId) => set((s) => ({
        botGroups: s.botGroups.filter((g) => g.id !== groupId),
    })),

    clearBotGroups: () => set({ botGroups: [] }),

    // 노드 삭제 시 그룹에서도 제거
    cleanupGroups: () => set((s) => {
        const nodeIdSet = new Set(s.nodes.map((n) => n.id));
        return {
            botGroups: s.botGroups
                .map((g) => ({
                    ...g,
                    nodeIds: g.nodeIds.filter((id) => nodeIdSet.has(id)),
                }))
                .filter((g) => g.nodeIds.length > 0),
        };
    }),

    // React Flow 변경 핸들러
    onNodesChange: (changes) => set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
    })),
    onEdgesChange: (changes) => set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
    })),
    onConnect: (connection) => set((state) => ({
        edges: rfAddEdge({
            ...connection,
            type: 'step',
            style: { stroke: '#4F5660', strokeWidth: 1.5 },
        }, state.edges),
    })),

    // ── Node CRUD ────────────────────────────
    addNode: (node) => set((state) => ({
        nodes: [...state.nodes, node],
    })),

    removeNode: (id) => set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    })),

    updateNodeData: (id, newData) => set((state) => ({
        nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...newData } } : n,
        ),
    })),

    // ── Bulk Operations ──────────────────────
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    loadProject: (projectData) => set({
        nodes: projectData.nodes || [],
        edges: projectData.edges || [],
    }),

    clearCanvas: () => set({ nodes: [], edges: [], botGroups: [] }),

    // ── Bounding Box Helper ─────────────────
    getExistingBounds: () => {
        const { nodes } = get();
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
        return { minX, minY, maxX, maxY };
    },

    // ── Serialization ────────────────────────
    getSerializableState: () => {
        const { nodes, edges, botGroups } = get();
        return {
            nodes: nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: {
                    nodeType: n.data.nodeType,
                    props: n.data.props || {},
                },
            })),
            edges: edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
            })),
            botGroups,
        };
    },
}));

export default useNodeStore;
