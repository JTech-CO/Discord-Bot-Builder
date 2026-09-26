import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getNodeSchema, getCategoryColor, getCategoryLabel, CATEGORY_COLORS } from '../../data/nodeSchema';

/**
 * BaseNode - 모든 커스텀 노드의 공통 컴포넌트
 * 
 * 컨셉 이미지 기반 디자인:
 * ┌────────────────────────────┐
 * │▌ ⚡ TRIGGER                │  ← 컬러 스트립 + 카테고리 레이블
 * │▌ Slash Command             │  ← 노드 이름 (볼드)
 * │▌ /gambling                 │  ← 파라미터 요약 (회색)
 * │                            │
 * ●                          ● │  ← 핸들 (입력/출력)
 * └────────────────────────────┘
 */
const BaseNode = memo(function BaseNode({ id, data, selected }) {
    const { nodeType, props: nodeProps = {} } = data;
    const schema = getNodeSchema(nodeType);
    const color = getCategoryColor(nodeType);
    const categoryLabel = getCategoryLabel(nodeType);
    const label = schema?.label || nodeType || 'Node';
    const handleConfig = schema?.handleConfig || { inputs: 1, outputs: 1 };

    // 파라미터 요약 텍스트 생성
    const summaryText = getSummaryText(nodeType, nodeProps, schema);

    return (
        <div
            className={`
        relative flex rounded-sm-discord overflow-hidden
        transition-shadow duration-150
        ${selected ? 'shadow-[0_0_0_2px_rgba(88,101,242,0.6)]' : 'shadow-md'}
      `}
            style={{
                background: '#2F3136',
                border: selected ? '1px solid #5865F2' : '1px solid #202225',
                minWidth: 180,
                maxWidth: 240,
            }}
        >
            {/* ── 좌측 컬러 스트립 ─── */}
            <div
                className="flex-shrink-0"
                style={{
                    width: '4px',
                    backgroundColor: color,
                }}
            />

            {/* ── 노드 콘텐츠 ─── */}
            <div className="flex-1 px-3 py-2.5 min-w-0">
                {/* 카테고리 레이블 */}
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                        className="text-[9px] font-bold uppercase tracking-[0.08em]"
                        style={{ color }}
                    >
                        {categoryLabel}
                    </span>
                </div>

                {/* 노드 이름 */}
                <div className="text-[13px] font-semibold text-[#DCDDDE] leading-tight">
                    {label}
                </div>

                {/* 파라미터 요약 */}
                {summaryText && (
                    <div className="text-[11px] text-[#72767D] mt-0.5 truncate">
                        {summaryText}
                    </div>
                )}

                {/* 출력 레이블 (If/Else 등 다중 출력) */}
                {handleConfig.outputLabels && handleConfig.outputs > 1 && (
                    <div className="flex flex-col gap-0.5 mt-2">
                        {handleConfig.outputLabels.map((label, i) => (
                            <div
                                key={i}
                                className="text-[10px] text-right pr-1"
                                style={{ color: i === 0 ? '#3BA55C' : '#ED4245' }}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── 입력 핸들 (좌측) ─── */}
            {handleConfig.inputs > 0 && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-2.5 !h-2.5 !bg-[#72767D] !border-2 !border-[#2F3136] !rounded-full hover:!bg-[#DCDDDE] transition-colors"
                    style={{ left: -5 }}
                />
            )}

            {/* ── 출력 핸들 (우측) ─── */}
            {handleConfig.outputs === 1 && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-2.5 !h-2.5 !bg-[#72767D] !border-2 !border-[#2F3136] !rounded-full hover:!bg-[#DCDDDE] transition-colors"
                    style={{ right: -5 }}
                />
            )}

            {/* 다중 출력 핸들 (If/Else, Switch 등) */}
            {handleConfig.outputs > 1 && Array.from({ length: handleConfig.outputs }).map((_, i) => (
                <Handle
                    key={`output-${i}`}
                    type="source"
                    position={Position.Right}
                    id={`output-${i}`}
                    className="!w-2.5 !h-2.5 !bg-[#72767D] !border-2 !border-[#2F3136] !rounded-full hover:!bg-[#DCDDDE] transition-colors"
                    style={{
                        right: -5,
                        top: `${30 + (i * 50 / Math.max(handleConfig.outputs - 1, 1))}%`,
                    }}
                />
            ))}
        </div>
    );
});

// 파라미터 요약 생성 헬퍼
function getSummaryText(nodeType, props, schema) {
    if (!schema || !props) return '';

    const firstProp = schema.props?.[0];
    if (!firstProp) return '';

    const value = props[firstProp.key];
    if (!value) return firstProp.placeholder || '';

    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
}

export default BaseNode;
