import React, { useState } from 'react';
import {
    ChevronRight, ChevronDown,
    Zap, MessageSquare, MousePointer2, Shield, Mic,
    Send, Puzzle, FormInput, UserCog, Hash,
    GitBranch, Calculator, Repeat, Timer, Calendar,
    Type, List, Dices, LayoutList, Variable,
    Globe, Braces, Webhook, Bot, Image, Scan,
    Sheet, Languages, AudioLines, Rss, Wrench,
} from 'lucide-react';
import NODE_SCHEMA, {
    CATEGORY_COLORS,
    CATEGORY_LABELS,
    getNodesByCategory,
    getAllCategories,
} from '../../data/nodeSchema';

/**
 * SideBar - 좌측 TOOLBOX (nodeSchema 기반)
 */

// 아이콘 매핑 (lucide-react)
const ICON_MAP = {
    Zap, MessageSquare, MousePointer2, Shield, Mic,
    Send, Puzzle, FormInput, UserCog, Hash,
    GitBranch, Calculator, Repeat, Timer, Calendar,
    Type, List, Dices, LayoutList, Variable,
    Globe, Braces, Webhook, Bot, Image, Scan,
    Sheet, Languages, AudioLines, Rss, Wrench,
};

function getIcon(iconName) {
    return ICON_MAP[iconName] || Zap;
}

// 카테고리 표시 이름
const CATEGORY_DISPLAY = {
    TRIGGER: 'Triggers',
    ACTION: 'Actions',
    LOGIC: 'Logic',
    INTEG: 'Integrations',
    CUSTOM: 'Custom',
};

function CategorySection({ categoryKey, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const nodes = getNodesByCategory(categoryKey);
    const color = CATEGORY_COLORS[categoryKey];

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div>
            {/* Category Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm-discord hover:bg-discord-bg-tertiary transition-colors group"
            >
                {isOpen ? (
                    <ChevronDown size={12} strokeWidth={2} className="text-discord-text-muted" />
                ) : (
                    <ChevronRight size={12} strokeWidth={2} className="text-discord-text-muted" />
                )}
                <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                />
                <span className="text-[12px] font-semibold text-discord-interactive-normal group-hover:text-discord-interactive-hover tracking-wide">
                    {CATEGORY_DISPLAY[categoryKey] || categoryKey}
                </span>
                <span className="ml-auto text-[10px] text-discord-text-muted">
                    {nodes.length}
                </span>
            </button>

            {/* Node Items */}
            {isOpen && (
                <div className="ml-3 mt-1 space-y-0.5 animate-fade-in">
                    {nodes.map((node) => {
                        const IconComponent = getIcon(node.icon);
                        return (
                            <div
                                key={node.type}
                                draggable
                                onDragStart={(e) => onDragStart(e, node.type)}
                                title={node.description}
                                className="flex items-center gap-2.5 px-3 py-[7px] rounded-sm-discord cursor-grab active:cursor-grabbing hover:bg-discord-bg-tertiary transition-colors group"
                            >
                                <div
                                    className="w-[3px] h-4 rounded-full flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: color }}
                                />
                                <IconComponent
                                    size={13}
                                    strokeWidth={1.5}
                                    className="text-discord-text-muted group-hover:text-discord-interactive-hover transition-colors flex-shrink-0"
                                />
                                <span className="text-[12px] text-discord-header-secondary group-hover:text-discord-text-normal transition-colors truncate">
                                    {node.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SideBar() {
    return (
        <aside className="w-sidebar flex-shrink-0 bg-discord-bg-secondary border-r border-[#202225] flex flex-col overflow-hidden no-select">
            {/* Header */}
            <div className="h-10 flex items-center px-4 border-b border-[#202225]">
                <span className="text-[11px] font-bold text-discord-text-muted uppercase tracking-[0.08em]">
                    Toolbox
                </span>
            </div>

            {/* Scrollable categories */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
                {getAllCategories().map((cat, index) => (
                    <CategorySection
                        key={cat}
                        categoryKey={cat}
                        defaultOpen={index < 2}
                    />
                ))}
            </div>
        </aside>
    );
}

export default SideBar;
