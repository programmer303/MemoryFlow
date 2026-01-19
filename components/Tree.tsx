
import React, { useState, useEffect, useRef, useContext } from 'react';
import { LayoutList, GitGraph, ChevronDown } from 'lucide-react';
import { useTreeContext, TreeVisualContext } from '../hooks/useTree';
import { NodeItem } from './TreeNode';
import { Toolbar } from './Toolbar';
import { NodeMap } from '../types';

interface RecursiveTreeViewProps {
  rootId: string;
  onSubjectChange?: (id: string) => void;
}

export function RecursiveTreeView({ rootId, onSubjectChange }: RecursiveTreeViewProps) {
  const { nodes, addNode, toggleExpand, updateNodeTitle } = useTreeContext();
  const rootNode = nodes[rootId];
  const [inputValue, setInputValue] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Shared Visual State for both List and Map
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Initialize selection on root when loading
  useEffect(() => {
    if (!selectedId) {
      setSelectedId(rootId);
    }
  }, [rootId, selectedId]);

  // ----------------------------------------------------------------
  // KEYBOARD SHORTCUTS HANDLER
  // ----------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Handle actions while editing
      if (editingId) {
        if (e.key === 'Enter') {
           // Enter -> Just Exit Edit Mode (Commit changes)
           e.preventDefault();
           setEditingId(null);
           return;
        } else if (e.key === 'Tab') {
           // Tab -> Add Child (Commit edit & create new child)
           e.preventDefault();
           setEditingId(null);

           if (selectedId) {
             const newId = addNode(selectedId, "新节点", 'plan');
             // NOTE: addNode already sets isExpanded=true on parent. 
             // Do NOT call toggleExpand here, or it might flip it back to false due to state batching.
             setSelectedId(newId);
             setEditingId(newId);
           }
           return;
        } else if (e.key === 'Escape') {
           setEditingId(null);
           return;
        }
        // While editing, ignore other navigation keys (Arrows, etc.)
        return;
      }

      // 2. Ignore shortcuts if focused on Toolbar input
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      const current = selectedId ? nodes[selectedId] : null;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (viewMode === 'map') {
            if (current && current.parentId) setSelectedId(current.parentId);
          } else {
            if (current) {
                if (current.isExpanded && current.children.length > 0) {
                    toggleExpand(current.id);
                } else if (current.parentId && current.parentId !== 'root' && current.id !== rootId) {
                    setSelectedId(current.parentId);
                }
            }
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (current) {
            if (viewMode === 'map') {
                if (current.isExpanded && current.children.length > 0) {
                   setSelectedId(current.children[0]);
                } else if (!current.isExpanded && current.children.length > 0) {
                   toggleExpand(current.id);
                }
            } else {
                if (!current.isExpanded && current.children.length > 0) {
                    toggleExpand(current.id);
                } 
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (viewMode === 'map') {
             if (current && current.parentId) {
                const siblings = nodes[current.parentId].children;
                const idx = siblings.indexOf(current.id);
                if (idx !== -1 && idx < siblings.length - 1) {
                   setSelectedId(siblings[idx + 1]);
                }
             }
          } else {
             if (selectedId) {
                 const nextId = getNextVisibleId(selectedId, nodes, rootId);
                 if (nextId) setSelectedId(nextId);
             }
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (viewMode === 'map') {
             if (current && current.parentId) {
                const siblings = nodes[current.parentId].children;
                const idx = siblings.indexOf(current.id);
                if (idx > 0) {
                   setSelectedId(siblings[idx - 1]);
                }
             }
          } else {
              if (selectedId) {
                 const prevId = getPrevVisibleId(selectedId, nodes, rootId);
                 if (prevId) setSelectedId(prevId);
              }
          }
          break;

        case 'Enter': 
          // Enter -> Add Sibling (Only when NOT editing)
          e.preventDefault();
          if (current && current.parentId) {
             const newId = addNode(current.parentId, "新节点", 'plan');
             setSelectedId(newId);
             setEditingId(newId);
          }
          break;
          
        case 'Tab': 
          // Tab -> Add Child
          e.preventDefault();
          if (selectedId) {
             const newId = addNode(selectedId, "新节点", 'plan');
             // NOTE: addNode ensures parent is expanded. No toggle needed.
             setSelectedId(newId);
             setEditingId(newId);
          }
          break;

        case ' ': 
          e.preventDefault();
          if (selectedId) {
            setEditingId(selectedId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, selectedId, editingId, nodes, addNode, toggleExpand, rootId]);


  if (!rootNode) return null;

  const handleCreate = (mode: 'store' | 'plan') => {
    if (!inputValue.trim()) return;
    addNode(rootId, inputValue, mode);
    setInputValue("");
  };

  const rootSubjects = nodes['root']?.children.map(id => nodes[id]) || [];

  return (
    <TreeVisualContext.Provider value={{ selectedId, setSelectedId, editingId, setEditingId }}>
        <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 h-16 border-b border-gray-200 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur sticky top-0 z-10">
            {onSubjectChange && rootSubjects.length > 0 ? (
                // Mobile / Switcher Mode
                <div className="relative">
                    <select 
                        value={rootId}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        className="appearance-none bg-transparent text-lg md:text-xl font-bold text-gray-800 pr-8 py-1 outline-none cursor-pointer"
                    >
                        {rootSubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>
                                # {sub.title}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            ) : (
                // Desktop / Static Mode
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-indigo-500">#</span> {rootNode.title}
                </h2>
            )}

            <div className="flex items-center gap-1">
            <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title="列表视图"
            >
                <LayoutList size={18} />
                <span className="hidden sm:inline">列表</span>
            </button>
            <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'map' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title="思维导图视图"
            >
                <GitGraph size={18} />
                <span className="hidden sm:inline">导图</span>
            </button>
            </div>
        </div>

        {/* Content Area */}
        {viewMode === 'list' ? (
            <div 
                className="flex-1 overflow-y-auto px-4 md:px-6 py-6 outline-none pb-24 md:pb-6" 
                tabIndex={0}
                onClick={() => {}}
            >
            <NodeItem 
                nodeId={rootId} 
                isRoot={true}
            />
            </div>
        ) : (
            <div className="flex-1 overflow-auto bg-slate-50 relative cursor-grab active:cursor-grabbing outline-none pb-24 md:pb-0" tabIndex={0}>
                {/* Keyboard Hints */}
                <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-40 hover:opacity-100 transition-opacity text-[10px] text-gray-500 space-y-1 bg-white/50 p-2 rounded backdrop-blur-sm hidden md:block">
                    <p><kbd className="bg-white border rounded px-1 shadow-sm font-mono">Tab</kbd> 添加子节点</p>
                    <p><kbd className="bg-white border rounded px-1 shadow-sm font-mono">Enter</kbd> 添加兄弟节点</p>
                    <p><kbd className="bg-white border rounded px-1 shadow-sm font-mono">Space</kbd> 编辑名称</p>
                    <p><kbd className="bg-white border rounded px-1 shadow-sm font-mono">Arrows</kbd> 切换选中</p>
                </div>
                <div className="min-w-max min-h-full p-20 flex items-center justify-start">
                <MindMapNode nodeId={rootId} isRoot />
                </div>
            </div>
        )}

        <Toolbar 
            rootTitle={rootNode.title}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onCreate={handleCreate}
        />
        </div>
    </TreeVisualContext.Provider>
  );
}

// ---------------------------------------------
// LIST VIEW HELPERS
// ---------------------------------------------

const getNextVisibleId = (currentId: string, nodes: NodeMap, rootId: string): string | null => {
  const node = nodes[currentId];
  if (!node) return null;

  // 1. If expanded and has children, first child is next
  if (node.isExpanded && node.children.length > 0) {
    return node.children[0];
  }

  // 2. Else, try next sibling. If no next sibling, go up recursively
  let curr = node;
  while (curr.id !== rootId && curr.parentId) {
    const parent = nodes[curr.parentId];
    const idx = parent.children.indexOf(curr.id);
    if (idx !== -1 && idx < parent.children.length - 1) {
      return parent.children[idx + 1];
    }
    // No next sibling, move up
    curr = parent;
  }
  return null;
};

const getPrevVisibleId = (currentId: string, nodes: NodeMap, rootId: string): string | null => {
    if (currentId === rootId) return null;
    const node = nodes[currentId];
    if (!node || !node.parentId) return null;
  
    const parent = nodes[node.parentId];
    const idx = parent.children.indexOf(currentId);
  
    // 1. If first child, go to parent
    if (idx === 0) {
      return parent.id;
    }
  
    // 2. Go to previous sibling's deepest expanded visible descendant
    let curr = nodes[parent.children[idx - 1]];
    while (curr.isExpanded && curr.children.length > 0) {
      curr = nodes[curr.children[curr.children.length - 1]];
    }
    return curr.id;
  };

// ---------------------------------------------
// MIND MAP COMPONENTS
// ---------------------------------------------

interface MindMapNodeProps {
  nodeId: string;
  isRoot?: boolean;
  index?: number;
  total?: number;
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ nodeId, isRoot = false, index = 0, total = 1 }) => {
  const { nodes, toggleExpand, updateNodeTitle } = useTreeContext();
  const mapState = useContext(TreeVisualContext);
  const node = nodes[nodeId];
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mapState?.editingId === nodeId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mapState?.editingId, nodeId]);

  if (!node) return null;

  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.isExpanded;
  const isSelected = mapState?.selectedId === nodeId;
  const isEditing = mapState?.editingId === nodeId;
  
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isOnly = total === 1;

  // Status Styles
  let statusClasses = "border-gray-200 bg-white text-slate-700";
  if (node.fsrs.state === 'suspended') statusClasses = "border-dashed border-gray-300 bg-gray-50 text-gray-400";
  else if (node.fsrs.due < Date.now()) statusClasses = "border-rose-200 bg-rose-50 text-rose-900 font-medium";
  else if (node.fsrs.s > 0) statusClasses = "border-emerald-200 bg-emerald-50 text-emerald-900";
  
  if (isRoot) statusClasses = "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200";

  // Selection Overlay
  const selectionClass = isSelected 
    ? "ring-2 ring-indigo-500 ring-offset-2 z-20 shadow-md scale-[1.02]" 
    : "hover:border-indigo-300 hover:shadow-sm";

  const handleFinishEdit = () => {
    if (mapState) mapState.setEditingId(null);
  };

  return (
    <div className="flex items-center">
      {!isRoot && (
        <div className="w-8 h-auto self-stretch relative flex-shrink-0">
          <ConnectorLines isFirst={isFirst} isLast={isLast} isOnly={isOnly} />
        </div>
      )}

      <div 
        onClick={(e) => {
          e.stopPropagation();
          mapState?.setSelectedId(nodeId);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          mapState?.setEditingId(nodeId);
        }}
        className={`
          group relative flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer min-w-[100px]
          ${statusClasses}
          ${selectionClass}
        `}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="w-32 bg-transparent outline-none border-b border-indigo-400 text-sm py-0 text-inherit"
            value={node.title}
            onChange={(e) => updateNodeTitle(nodeId, e.target.value)}
            onBlur={handleFinishEdit}
            onClick={(e) => e.stopPropagation()}
            // Note: Enter/Tab handling bubbles to global window listener
          />
        ) : (
          <span className="whitespace-nowrap text-sm">{node.title}</span>
        )}
        
        {hasChildren && (
          <div 
             onClick={(e) => {
               e.stopPropagation();
               toggleExpand(nodeId);
             }}
             className={`
                w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ml-1 hover:scale-110 transition-transform
                ${isRoot 
                    ? 'bg-white/20 text-white border-white/30' 
                    : isExpanded ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-gray-100 text-gray-500 border-gray-200'}
             `}
          >
             {isExpanded ? '-' : '+'}
          </div>
        )}

        {!isRoot && !isEditing && node.fsrs.state !== 'suspended' && (
           <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
              S:{node.fsrs.s.toFixed(1)} D:{node.fsrs.d.toFixed(1)}
              <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
           </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="flex items-center">
          <div className="w-8 h-px bg-gray-300 flex-shrink-0" />
          <div className="flex flex-col gap-y-2"> 
             {node.children.map((childId, idx) => (
                <MindMapNode 
                  key={childId} 
                  nodeId={childId} 
                  index={idx} 
                  total={node.children.length} 
                />
             ))}
          </div>
        </div>
      )}
      
      {hasChildren && !isExpanded && (
         <div className="w-3 h-px bg-gray-300 opacity-50" />
      )}
    </div>
  );
};

const ConnectorLines = ({ isFirst, isLast, isOnly }: { isFirst: boolean, isLast: boolean, isOnly: boolean }) => {
  const lineColor = "border-gray-300";

  if (isOnly) {
    return <div className={`absolute top-1/2 left-0 w-full border-t-2 ${lineColor}`} />;
  }

  if (isFirst) {
    return (
      <div className={`absolute bottom-0 left-0 w-full h-[50%] border-l-2 border-t-2 ${lineColor} rounded-tl-xl`} />
    );
  }

  if (isLast) {
    return (
      <div className={`absolute top-0 left-0 w-full h-[50%] border-l-2 border-b-2 ${lineColor} rounded-bl-xl`} />
    );
  }

  return (
    <>
      <div className={`absolute top-0 left-0 h-full w-0 border-l-2 ${lineColor}`} />
      <div className={`absolute top-1/2 left-0 w-full h-0 border-t-2 ${lineColor}`} />
    </>
  );
};
