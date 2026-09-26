import React from 'react';
import { Settings, MousePointer, Trash2, Copy, RotateCcw } from 'lucide-react';
import useUIStore from '../../store/uiStore';
import useNodeStore from '../../store/nodeStore';
import { getNodeSchema, getCategoryColor, getCategoryLabel } from '../../data/nodeSchema';

/**
 * Inspector - 우측 속성 편집 패널 (320px)
 * 
 * nodeSchema 기반으로 동적 속성 편집 폼을 렌더링합니다.
 */

function Inspector() {
    const { selectedNode, setSelectedNode } = useUIStore();
    const { updateNodeData, removeNode, addNode, nodes } = useNodeStore();

    const nodeType = selectedNode?.data?.nodeType;
    const schema = getNodeSchema(nodeType);
    const color = getCategoryColor(nodeType);
    const categoryLabel = getCategoryLabel(nodeType);
    const nodeProps = selectedNode?.data?.props || {};

    // 속성 값 변경 핸들러
    const handlePropChange = (key, value) => {
        if (!selectedNode) return;
        updateNodeData(selectedNode.id, {
            props: { ...nodeProps, [key]: value },
        });
    };

    // 노드 삭제
    const handleDelete = () => {
        if (!selectedNode) return;
        const id = selectedNode.id;
        setSelectedNode(null);
        removeNode(id);
    };

    // 노드 복제
    const handleDuplicate = () => {
        if (!selectedNode) return;
        const newNode = {
            id: `${selectedNode.data.nodeType}_${Date.now()}`,
            type: selectedNode.type,
            position: {
                x: selectedNode.position.x + 40,
                y: selectedNode.position.y + 40,
            },
            data: {
                ...selectedNode.data,
                props: { ...selectedNode.data.props },
            },
        };
        addNode(newNode);
    };

    // 속성 초기화
    const handleResetProps = () => {
        if (!selectedNode || !schema) return;
        const defaultProps = {};
        schema.props.forEach((p) => {
            defaultProps[p.key] = p.default ?? '';
        });
        updateNodeData(selectedNode.id, { props: defaultProps });
    };

    return (
        <aside className="w-inspector flex-shrink-0 bg-discord-bg-secondary border-l border-[#202225] flex flex-col overflow-hidden no-select">
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-[#202225]">
                <span className="text-[11px] font-bold text-discord-text-muted uppercase tracking-[0.08em]">
                    Properties
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {selectedNode && schema ? (
                    <div className="animate-fade-in">
                        {/* Node Header */}
                        <div className="px-4 py-3 border-b border-[#202225]">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color }}>
                                    {categoryLabel}
                                </span>
                            </div>
                            <h3 className="text-sm font-semibold text-discord-header-primary pl-3">
                                {schema.label}
                            </h3>
                            <p className="text-[11px] text-discord-text-muted pl-3 mt-0.5">
                                {schema.description}
                            </p>
                        </div>

                        {/* ── Node Action Buttons ── */}
                        <div className="px-4 py-2.5 border-b border-[#202225] flex items-center gap-1.5">
                            <button
                                onClick={handleDuplicate}
                                title="노드 복제"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[11px] text-discord-text-normal hover:border-discord-blurple hover:text-discord-blurple transition-colors"
                            >
                                <Copy size={12} strokeWidth={2} />
                                복제
                            </button>
                            <button
                                onClick={handleResetProps}
                                title="속성 초기화"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[11px] text-discord-text-normal hover:border-[#FAA61A] hover:text-[#FAA61A] transition-colors"
                            >
                                <RotateCcw size={12} strokeWidth={2} />
                                초기화
                            </button>
                            <button
                                onClick={handleDelete}
                                title="노드 삭제"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[11px] text-discord-text-normal hover:border-discord-red hover:text-discord-red transition-colors ml-auto"
                            >
                                <Trash2 size={12} strokeWidth={2} />
                                삭제
                            </button>
                        </div>

                        {/* Dynamic Property Fields */}
                        <div className="px-4 py-3 space-y-3">
                            {schema.props.map((propDef) => (
                                <PropertyField
                                    key={propDef.key}
                                    definition={propDef}
                                    value={nodeProps[propDef.key]}
                                    onChange={(val) => handlePropChange(propDef.key, val)}
                                />
                            ))}
                        </div>

                        {/* Outputs */}
                        {schema.outputs.length > 0 && (
                            <div className="px-4 py-3 border-t border-[#202225]">
                                <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-2">
                                    Output Variables
                                </label>
                                <div className="space-y-1">
                                    {schema.outputs.map((out) => (
                                        <div key={out} className="px-2.5 py-1 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[11px] font-mono text-discord-header-secondary">
                                            {`{${out}}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Node Meta */}
                        <div className="px-4 py-3 border-t border-[#202225]">
                            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">
                                Node ID
                            </label>
                            <div className="px-2.5 py-1 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[10px] font-mono text-discord-text-muted truncate">
                                {selectedNode.id}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-8">
                        <div className="w-14 h-14 rounded-md-discord bg-discord-bg-tertiary flex items-center justify-center">
                            <MousePointer size={22} strokeWidth={1.5} className="text-discord-text-muted" />
                        </div>
                        <p className="text-[13px] text-discord-header-secondary font-medium">
                            Select a node to edit properties
                        </p>
                    </div>
                )}
            </div>
        </aside>
    );
}

/**
 * PropertyField - 속성 타입별 동적 폼 필드
 */
function PropertyField({ definition, value, onChange }) {
    const { key, label, type, placeholder, values, multiline } = definition;
    const displayValue = value ?? '';

    const inputClass = `
    w-full px-2.5 py-1.5
    bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord
    text-[12px] text-discord-text-normal placeholder-discord-text-muted
    focus:outline-none focus:border-discord-blurple transition-colors
  `;

    return (
        <div>
            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">
                {label}
            </label>

            {/* Enum → Select */}
            {type === 'enum' && (
                <select
                    value={displayValue}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass + ' cursor-pointer'}
                >
                    <option value="">Select...</option>
                    {values?.map((v) => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
            )}

            {/* Boolean → Toggle */}
            {type === 'boolean' && (
                <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={!!displayValue}
                            onChange={(e) => onChange(e.target.checked)}
                            className="sr-only"
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${displayValue ? 'bg-discord-blurple' : 'bg-discord-bg-tertiary border border-[#202225]'}`} />
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform shadow-sm ${displayValue ? 'translate-x-[17px] bg-white' : 'translate-x-0.5 bg-discord-text-muted'}`} />
                    </div>
                    <span className="text-[11px] text-discord-text-normal">{displayValue ? 'Yes' : 'No'}</span>
                </label>
            )}

            {/* Number */}
            {type === 'number' && (
                <input
                    type="number"
                    value={displayValue}
                    onChange={(e) => onChange(Number(e.target.value))}
                    placeholder={placeholder}
                    className={inputClass + ' font-mono'}
                />
            )}

            {/* String / Variable / JSON (multiline) */}
            {(type === 'string' || type === 'variable' || type === 'json') && multiline && (
                <textarea
                    value={displayValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className={inputClass + ' resize-y min-h-[60px]'}
                />
            )}

            {/* String (single line) */}
            {(type === 'string' || type === 'variable') && !multiline && (
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={inputClass}
                />
            )}

            {/* JSON (single line) */}
            {type === 'json' && !multiline && (
                <input
                    type="text"
                    value={typeof displayValue === 'object' ? JSON.stringify(displayValue) : displayValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || '{}'}
                    className={inputClass + ' font-mono'}
                />
            )}

            {/* Color Picker */}
            {type === 'color' && (
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={displayValue || '#5865F2'}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-8 h-8 rounded-sm-discord border border-[#202225] cursor-pointer bg-transparent"
                    />
                    <input
                        type="text"
                        value={displayValue || '#5865F2'}
                        onChange={(e) => onChange(e.target.value)}
                        className={inputClass + ' font-mono flex-1'}
                    />
                </div>
            )}
        </div>
    );
}

export default Inspector;
