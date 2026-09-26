import {
  Background, BackgroundVariant, MiniMap, Panel, ReactFlow, useReactFlow, type Node,
} from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, type DragEvent } from 'react';
import { diceExample } from '../flow/examples';
import { fromFile } from '../flow/file';
import { nodeNumber, type BotNode } from '../flow/model';
import { getDef } from '../nodes/registry';
import { useProject } from '../store/project';
import { useUI } from '../store/ui';
import { Button, IconButton } from '../ui/controls';
import BotNodeCard, { prettyRefs } from './BotNodeCard';

export const NODE_DRAG_MIME = 'application/x-dbb-node';
export const NODE_WIDTH = 240;
const GRID = 16;

const nodeTypes = { bot: BotNodeCard };
const defaultEdgeOptions = { type: 'smoothstep', pathOptions: { borderRadius: 8 } };
const minimapClass = (n: Node) => `mm-${getDef((n as BotNode).data.type)?.category ?? 'logic'}`;

// Screen readers announce nodes by this label. Cached per node object so dragging one
// node doesn't hand React Flow a fresh copy of every other node.
const labeled = new WeakMap<BotNode, BotNode>();
function withAriaLabel(n: BotNode): BotNode {
  let out = labeled.get(n);
  if (!out) {
    const def = getDef(n.data.type);
    const summary = def?.summary?.(n.data.props);
    out = { ...n, ariaLabel: `#${nodeNumber(n.id)} ${def?.label ?? n.data.type}${summary ? `: ${prettyRefs(summary)}` : ''}` };
    labeled.set(n, out);
  }
  return out;
}

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

// Copy/paste/select-all belong to the browser while text is selected or focus is in a
// text region (e.g. the prompt preview), so the canvas must not swallow them.
const wantsNativeText = (e: KeyboardEvent) =>
  (e.target instanceof HTMLElement && !!e.target.closest('[data-native-keys]')) ||
  !(window.getSelection()?.isCollapsed ?? true);

function useEditorShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const s = useProject.getState();
      const key = e.key.toLowerCase();
      if (['a', 'c', 'v', 'x'].includes(key) && wantsNativeText(e)) return;
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      if (key === 'z' && !e.shiftKey) run(s.undo);
      else if ((key === 'z' && e.shiftKey) || key === 'y') run(s.redo);
      else if (key === 'c') run(s.copySelected);
      else if (key === 'v') run(s.paste);
      else if (key === 'd') run(s.duplicateSelected);
      else if (key === 'a') run(s.selectAll);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function useFocusRequests() {
  const rf = useReactFlow();
  const request = useUI((s) => s.focusRequest);
  useEffect(() => {
    if (!request) return;
    const node = rf.getNode(request.nodeId);
    if (!node) return;
    useProject.getState().selectOnly([node.id]);
    const h = node.measured?.height ?? 80;
    rf.setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + h / 2, { zoom: Math.max(rf.getZoom(), 1), duration: 200 });
  }, [request, rf]);
}

function ZoomControls() {
  const rf = useReactFlow();
  return (
    <Panel position="bottom-left" className="flex items-center rounded-lg border border-line bg-panel p-0.5">
      <IconButton icon={Minus} label="축소" onClick={() => rf.zoomOut({ duration: 120 })} />
      <IconButton icon={Plus} label="확대" onClick={() => rf.zoomIn({ duration: 120 })} />
      <IconButton icon={Maximize} label="전체 보기" onClick={() => rf.fitView({ duration: 200, padding: 0.2 })} />
    </Panel>
  );
}

function EmptyState() {
  const rf = useReactFlow();
  const loadExample = () => {
    const result = fromFile(diceExample);
    if (!result.ok) return;
    useProject.getState().load(result.project);
    requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 200 }));
  };
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="pointer-events-auto max-w-sm rounded-xl border border-line bg-panel p-6 text-center">
        <h2 className="text-base font-semibold text-fg">빈 캔버스</h2>
        <p className="mt-2 text-sm text-fg-muted">
          왼쪽 목록에서 <strong className="font-semibold text-fg">트리거</strong>를 끌어다 놓아 흐름을 시작하세요.
          노드를 클릭해도 화면 가운데에 추가됩니다.
        </p>
        <Button variant="secondary" className="mt-4" onClick={loadExample}>
          예제 불러오기: 주사위 봇
        </Button>
      </div>
    </div>
  );
}

export function Canvas() {
  const rf = useReactFlow();
  const nodes = useProject((s) => s.nodes);
  const rfNodes = useMemo(() => nodes.map(withAriaLabel), [nodes]);
  const edges = useProject((s) => s.edges);
  const onNodesChange = useProject((s) => s.onNodesChange);
  const onEdgesChange = useProject((s) => s.onEdgesChange);
  const connect = useProject((s) => s.connect);
  const canConnect = useProject((s) => s.canConnect);
  const checkpoint = useProject((s) => s.checkpoint);

  useEditorShortcuts();
  useFocusRequests();

  const onDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes(NODE_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      const type = e.dataTransfer.getData(NODE_DRAG_MIME);
      if (!type) return;
      e.preventDefault();
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const snap = (v: number) => Math.round(v / GRID) * GRID;
      useProject.getState().addNode(type, { x: snap(p.x - NODE_WIDTH / 2), y: snap(p.y - 24) });
    },
    [rf],
  );

  return (
    <div className="relative h-full min-h-0" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<BotNode>
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connect}
        isValidConnection={canConnect}
        onNodeDragStart={() => checkpoint()}
        onSelectionDragStart={() => checkpoint()}
        deleteKeyCode={['Delete', 'Backspace']}
        selectionOnDrag
        panOnDrag={[1, 2]}
        panActivationKeyCode="Space"
        snapToGrid
        snapGrid={[GRID, GRID]}
        minZoom={0.2}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={GRID} size={1.2} />
        <MiniMap nodeClassName={minimapClass} pannable zoomable ariaLabel="미니맵" style={{ width: 168, height: 112 }} />
        <ZoomControls />
      </ReactFlow>
      {nodes.length === 0 && <EmptyState />}
    </div>
  );
}
