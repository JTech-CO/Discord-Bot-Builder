import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    MiniMap,
    ReactFlowProvider,
    useViewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useUIStore from '../../store/uiStore';
import useNodeStore from '../../store/nodeStore';
import useUndoRedo from '../../hooks/useUndoRedo';
import BaseNode from '../nodes/BaseNode';
import { getNodeSchema, getCategoryColor, getCategoryLabel } from '../../data/nodeSchema';
import { Keyboard, X } from 'lucide-react';

/**
 * Workspace - 중앙 캔버스 (React Flow + Zustand nodeStore)
 * 
 * Figma식 조작:
 *  - 마우스 드래그로 영역 선택 (박스 셀렉션)
 *  - Ctrl+C/V/X, Del, Ctrl+Z/Shift+Z
 */

const nodeTypes = { baseNode: BaseNode };

const defaultEdgeOptions = {
    type: 'step',
    style: { stroke: '#4F5660', strokeWidth: 1.5 },
};

function WorkspaceInner() {
    const reactFlowWrapper = useRef(null);
    const reactFlowInstance = useRef(null);
    const { setSelectedNode, setZoomLevel } = useUIStore();
    const {
        nodes, edges,
        onNodesChange, onEdgesChange, onConnect,
        addNode, removeNode, setNodes, setEdges,
    } = useNodeStore();
    const { takeSnapshot, undo, redo } = useUndoRedo();

    // 클립보드
    const clipboardRef = useRef([]);
    // 선택된 노드 ID 집합
    const [selectedIds, setSelectedIds] = useState(new Set());
    // 단축키 안내 표시
    const [showShortcuts, setShowShortcuts] = useState(true);

    // 키보드 단축키
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 입력 필드에서는 무시
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            // Ctrl+Z / Ctrl+Shift+Z
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                redo();
                return;
            }

            // Del: 선택된 노드 삭제
            if (e.key === 'Delete' && selectedIds.size > 0) {
                e.preventDefault();
                takeSnapshot();
                const currentNodes = useNodeStore.getState().nodes;
                const currentEdges = useNodeStore.getState().edges;
                setNodes(currentNodes.filter((n) => !selectedIds.has(n.id)));
                setEdges(currentEdges.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
                setSelectedIds(new Set());
                setSelectedNode(null);
                return;
            }

            // Ctrl+C: 복사
            if (e.ctrlKey && e.key === 'c' && selectedIds.size > 0) {
                e.preventDefault();
                const currentNodes = useNodeStore.getState().nodes;
                clipboardRef.current = currentNodes
                    .filter((n) => selectedIds.has(n.id))
                    .map((n) => ({ ...n, data: { ...n.data, props: { ...n.data.props } } }));
                return;
            }

            // Ctrl+X: 잘라내기
            if (e.ctrlKey && e.key === 'x' && selectedIds.size > 0) {
                e.preventDefault();
                takeSnapshot();
                const currentNodes = useNodeStore.getState().nodes;
                const currentEdges = useNodeStore.getState().edges;
                clipboardRef.current = currentNodes
                    .filter((n) => selectedIds.has(n.id))
                    .map((n) => ({ ...n, data: { ...n.data, props: { ...n.data.props } } }));
                setNodes(currentNodes.filter((n) => !selectedIds.has(n.id)));
                setEdges(currentEdges.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
                setSelectedIds(new Set());
                setSelectedNode(null);
                return;
            }

            // Ctrl+V: 붙여넣기
            if (e.ctrlKey && e.key === 'v' && clipboardRef.current.length > 0) {
                e.preventDefault();
                takeSnapshot();
                const now = Date.now();
                const newNodes = clipboardRef.current.map((n, i) => ({
                    ...n,
                    id: `${n.data.nodeType}_${now}_${i}_${Math.random().toString(36).substr(2, 4)}`,
                    position: {
                        x: n.position.x + 40,
                        y: n.position.y + 40,
                    },
                    selected: false,
                    data: { ...n.data, props: { ...n.data.props } },
                }));
                const currentNodes = useNodeStore.getState().nodes;
                setNodes([...currentNodes, ...newNodes]);

                // 새로 붙여넣은 노드 선택
                const newIds = new Set(newNodes.map((n) => n.id));
                setSelectedIds(newIds);
                return;
            }

            // Ctrl+A: 전체 선택
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                const allIds = new Set(useNodeStore.getState().nodes.map((n) => n.id));
                setSelectedIds(allIds);

                // React Flow 노드도 selected 상태로 업데이트
                const currentNodes = useNodeStore.getState().nodes;
                setNodes(currentNodes.map((n) => ({ ...n, selected: true })));
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, selectedIds, takeSnapshot, setNodes, setEdges, setSelectedNode]);

    const onNodeClick = useCallback((_event, node) => {
        setSelectedNode(node);
        setSelectedIds(new Set([node.id]));
    }, [setSelectedNode]);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setSelectedIds(new Set());
    }, [setSelectedNode]);

    const onMoveEnd = useCallback((_event, viewport) => {
        if (viewport) setZoomLevel(Math.round(viewport.zoom * 100));
    }, [setZoomLevel]);

    // 선택 변경 이벤트 (영역 선택 포함)
    const onSelectionChange = useCallback(({ nodes: selectedNodes }) => {
        if (selectedNodes && selectedNodes.length > 0) {
            setSelectedIds(new Set(selectedNodes.map((n) => n.id)));
            if (selectedNodes.length === 1) {
                setSelectedNode(selectedNodes[0]);
            }
        }
    }, [setSelectedNode]);

    // 드래그 앤 드롭으로 노드 추가
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            const nodeType = event.dataTransfer.getData('application/reactflow');
            if (!nodeType) return;

            takeSnapshot();

            const bounds = reactFlowWrapper.current?.getBoundingClientRect();
            const position = reactFlowInstance.current?.project({
                x: event.clientX - (bounds?.left || 0),
                y: event.clientY - (bounds?.top || 0),
            }) || {
                x: event.clientX - (bounds?.left || 0),
                y: event.clientY - (bounds?.top || 0),
            };

            const schema = getNodeSchema(nodeType);

            const newNode = {
                id: `${nodeType}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                type: 'baseNode',
                position,
                data: {
                    nodeType,
                    props: buildDefaultProps(schema),
                },
            };

            addNode(newNode);
        },
        [addNode, takeSnapshot],
    );

    const handleConnect = useCallback((connection) => {
        takeSnapshot();
        onConnect(connection);
    }, [takeSnapshot, onConnect]);

    const handleNodesChange = useCallback((changes) => {
        const hasMeaningful = changes.some((c) =>
            c.type === 'remove' || c.type === 'add'
        );
        if (hasMeaningful) takeSnapshot();
        onNodesChange(changes);
    }, [takeSnapshot, onNodesChange]);

    return (
        <div ref={reactFlowWrapper} className="flex-1 h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onMoveEnd={onMoveEnd}
                onInit={(instance) => { reactFlowInstance.current = instance; }}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                selectionMode="partial"
                selectionOnDrag
                panOnDrag={[1, 2]}
                selectNodesOnDrag={true}
                fitView
                snapToGrid
                snapGrid={[20, 20]}
                style={{ background: '#36393F' }}
                deleteKeyCode={null}
            >
                <Background
                    variant="dots"
                    gap={20}
                    size={1}
                    color="#43464D"
                />
                <MiniMap
                    nodeColor={() => '#2F3136'}
                    nodeStrokeColor={() => '#5865F2'}
                    nodeStrokeWidth={1}
                    maskColor="rgba(32, 34, 37, 0.85)"
                    position="bottom-right"
                    style={{
                        background: '#2F3136',
                        border: '1px solid #202225',
                        borderRadius: '2px',
                    }}
                />
            </ReactFlow>

            {/* 봇 그룹 라벨 오버레이 */}
            <BotGroupOverlay />

            {/* 선택된 노드 수 표시 */}
            {selectedIds.size > 1 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-discord-blurple rounded-md-discord text-[11px] font-semibold text-white shadow-lg z-10 animate-fade-in">
                    {selectedIds.size}개 노드 선택됨 — Del 삭제 · Ctrl+C 복사 · Ctrl+X 잘라내기
                </div>
            )}

            {/* 단축키 안내 (토글) */}
            <ShortcutOverlay show={showShortcuts} onClose={() => setShowShortcuts(false)} />
            {!showShortcuts && (
                <button
                    onClick={() => setShowShortcuts(true)}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-sm-discord bg-discord-bg-secondary/80 border border-[#202225] text-discord-text-muted hover:text-discord-text-normal transition-colors"
                    title="단축키 보기"
                >
                    <Keyboard size={14} />
                </button>
            )}
        </div>
    );
}

/**
 * BotGroupOverlay - 봇 그룹 바운딩 박스 라벨 렌더링
 * 
 * 2개 이상의 봇 그룹이 있을 때만 표시
 */
const GROUP_COLORS = [
    { border: '#5865F2', bg: 'rgba(88, 101, 242, 0.06)', text: '#8B9BF7' },
    { border: '#3BA55C', bg: 'rgba(59, 165, 92, 0.06)', text: '#6FCF8A' },
    { border: '#FAA61A', bg: 'rgba(250, 166, 26, 0.06)', text: '#FCC353' },
    { border: '#ED4245', bg: 'rgba(237, 66, 69, 0.06)', text: '#F17275' },
    { border: '#9B59B6', bg: 'rgba(155, 89, 182, 0.06)', text: '#B57FD0' },
    { border: '#1ABC9C', bg: 'rgba(26, 188, 156, 0.06)', text: '#4FD4B8' },
];

function BotGroupOverlay() {
    const { x: vx, y: vy, zoom } = useViewport();
    const nodes = useNodeStore((s) => s.nodes);
    const botGroups = useNodeStore((s) => s.botGroups);

    if (botGroups.length < 2) return null;

    const NODE_W = 240;
    const NODE_H = 80;
    const PAD = 30;

    return (
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{ overflow: 'hidden' }}>
            {botGroups.map((group, gi) => {
                const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
                if (groupNodes.length === 0) return null;

                // 바운딩 박스 계산 (flow 좌표)
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const n of groupNodes) {
                    minX = Math.min(minX, n.position.x);
                    minY = Math.min(minY, n.position.y);
                    maxX = Math.max(maxX, n.position.x + NODE_W);
                    maxY = Math.max(maxY, n.position.y + NODE_H);
                }

                // 패딩 적용
                minX -= PAD;
                minY -= PAD;
                maxX += PAD;
                maxY += PAD;

                // flow 좌표 → 스크린 좌표
                const left = minX * zoom + vx;
                const top = minY * zoom + vy;
                const width = (maxX - minX) * zoom;
                const height = (maxY - minY) * zoom;

                const color = GROUP_COLORS[gi % GROUP_COLORS.length];

                return (
                    <div key={group.id}>
                        {/* 바운딩 박스 */}
                        <div
                            style={{
                                position: 'absolute',
                                left,
                                top,
                                width,
                                height,
                                border: `1.5px dashed ${color.border}`,
                                backgroundColor: color.bg,
                                borderRadius: '8px',
                                transition: 'all 0.15s ease-out',
                            }}
                        />
                        {/* 라벨 */}
                        <div
                            style={{
                                position: 'absolute',
                                left: left,
                                top: top - 24,
                                transition: 'all 0.15s ease-out',
                            }}
                            className="flex items-center gap-1.5"
                        >
                            <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color.border }}
                            />
                            <span
                                className="text-[11px] font-semibold whitespace-nowrap"
                                style={{ color: color.text }}
                            >
                                {group.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * ShortcutOverlay - 단축키/조작법 안내 오버레이
 */
function ShortcutOverlay({ show, onClose }) {
    if (!show) return null;

    const shortcuts = [
        { keys: 'Drag', desc: '영역 선택' },
        { keys: 'Click', desc: '노드 선택' },
        { keys: 'Scroll', desc: '줌 인/아웃' },
        { keys: 'Middle/Right Drag', desc: '캔버스 이동' },
        { keys: 'Del', desc: '선택 노드 삭제' },
        { keys: 'Ctrl+C', desc: '복사' },
        { keys: 'Ctrl+V', desc: '붙여넣기' },
        { keys: 'Ctrl+X', desc: '잘라내기' },
        { keys: 'Ctrl+A', desc: '전체 선택' },
        { keys: 'Ctrl+Z', desc: '실행 취소' },
        { keys: 'Ctrl+Shift+Z', desc: '다시 실행' },
    ];

    return (
        <div className="absolute top-3 right-3 z-10 bg-discord-bg-secondary/95 border border-[#202225] rounded-md-discord shadow-lg px-3 py-2 animate-fade-in backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-discord-text-muted uppercase tracking-wider">조작법</span>
                <button
                    onClick={onClose}
                    className="p-0.5 rounded-sm text-discord-text-muted hover:text-discord-text-normal transition-colors"
                >
                    <X size={10} />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {shortcuts.map((s) => (
                    <div key={s.keys} className="flex items-center gap-2 py-0.5">
                        <kbd className="text-[9px] bg-discord-bg-tertiary border border-[#202225] rounded px-1 py-0.5 font-mono text-discord-text-normal whitespace-nowrap min-w-[60px] text-center">
                            {s.keys}
                        </kbd>
                        <span className="text-[10px] text-discord-text-muted">{s.desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function buildDefaultProps(schema) {
    if (!schema?.props) return {};
    const defaults = {};
    for (const prop of schema.props) {
        if (prop.default !== undefined) defaults[prop.key] = prop.default;
    }
    return defaults;
}

function Workspace() {
    return (
        <ReactFlowProvider>
            <WorkspaceInner />
        </ReactFlowProvider>
    );
}

export default Workspace;
