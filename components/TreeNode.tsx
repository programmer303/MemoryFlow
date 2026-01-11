
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Archive, ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTreeContext, TreeVisualContext } from '../hooks/useTree';

export const NodeItem = React.memo(({ nodeId, isRoot }: { nodeId: string, isRoot?: boolean }) => {
  const { nodes, toggleExpand, addNode, deleteNode, moveNode, draggingId, setDraggingId, updateNodeTitle } = useTreeContext();
  const visualState = useContext(TreeVisualContext);
  const node = nodes[nodeId];
  
  const [isAdding, setIsAdding] = useState(false); // Legacy manual add via UI
  const [localInput, setLocalInput] = useState("");
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const isSelected = visualState?.selectedId === nodeId;
  const isEditing = visualState?.editingId === nodeId;

  // Auto focus for inline editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [isEditing]);

  if (!node) return null;
  const hasChildren = node.children && node.children.length > 0;
  
  // Status Logic
  let statusBadge = null;
  let fsrsStats = null;
  if (node.fsrs.state === 'suspended') {
    statusBadge = <span className="text-gray-300" title="已挂起"><Archive size={14} /></span>;
  } else {
    const isDue = node.fsrs.due < Date.now();
    statusBadge = isDue 
      ? <span className="text-rose-500 text-[10px] font-bold bg-rose-50 px-1.5 py-0.5 rounded">到期</span>
      : <span className="text-emerald-500 text-[10px] font-medium">{format(node.fsrs.due, 'MMM d')}</span>;

    if (node.fsrs.s > 0) {
        fsrsStats = (
            <div className={`hidden group-hover:flex items-center gap-2 text-[10px] font-mono px-1.5 py-0.5 rounded border ml-2 ${isSelected ? 'bg-indigo-200/50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                <span>S:{node.fsrs.s.toFixed(1)}</span>
                <span className={`w-px h-3 ${isSelected ? 'bg-indigo-300' : 'bg-gray-200'}`}></span>
                <span>D:{node.fsrs.d.toFixed(1)}</span>
            </div>
        );
    }
  }

  const handleLocalAdd = (mode: 'store' | 'plan') => {
    if(!localInput.trim()) return;
    addNode(nodeId, localInput, mode);
    setLocalInput("");
    setIsAdding(false);
  }
  
  // Drag Handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(nodeId); 
    visualState?.setSelectedId(nodeId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggingId || draggingId === nodeId) return;

    const sourceNode = nodes[draggingId];
    if (!sourceNode || sourceNode.parentId !== node.parentId) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      setDropPosition('top');
    } else {
      setDropPosition('bottom');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDropPosition(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId && sourceId !== nodeId && dropPosition) {
       moveNode(sourceId, nodeId, dropPosition);
    }
  };

  const finishEdit = () => {
    if (visualState) visualState.setEditingId(null);
  }

  if (isRoot) {
    return (
      <div className="space-y-1">
        {node.children.map((childId: string) => (
          <NodeItem key={childId} nodeId={childId} />
        ))}
      </div>
    );
  }

  const isBeingDragged = draggingId === nodeId;

  // Define text color based on state
  let textColorClass = 'text-gray-800 font-medium';
  if (node.fsrs.state === 'suspended') textColorClass = 'text-gray-500';
  if (isSelected) textColorClass = 'text-indigo-900 font-semibold'; // Darker blue for selected text

  return (
    <div className="pl-4">
      <div 
        className={`relative rounded-md transition-all ${isBeingDragged ? 'opacity-30' : 'opacity-100'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dropPosition === 'top' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 z-50 pointer-events-none shadow-[0_0_4px_rgba(99,102,241,0.5)] transform -translate-y-0.5" />
        )}
        
        <div 
            className={`
                group flex items-center justify-between py-1.5 px-2 rounded-md transition-colors cursor-pointer select-none
                ${dropPosition ? 'bg-indigo-50/50' : ''}
                ${isSelected 
                    ? 'bg-indigo-100 ring-1 ring-indigo-300 shadow-sm z-10' 
                    : 'hover:bg-gray-100'
                }
            `}
            onClick={(e) => {
                e.stopPropagation();
                // Ensure selection happens immediately
                if (!isSelected) {
                    visualState?.setSelectedId(nodeId);
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                visualState?.setEditingId(nodeId);
            }}
        >
          <div 
            className="flex-1 flex items-center overflow-hidden p-0" 
          >
            <div 
              className={`mr-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-gray-600 ${isSelected ? 'text-indigo-400' : 'text-gray-300'}`}
              draggable={true}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={(e) => e.stopPropagation()}
            >
               <GripVertical size={14} />
            </div>

            <span 
                className={`mr-2 w-4 flex justify-center hover:text-indigo-500 ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(nodeId);
                }}
            >
              {hasChildren ? (node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className={`text-[10px] ${isSelected ? 'text-indigo-300' : 'text-gray-300'}`}>•</span>}
            </span>
            
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input 
                        ref={inputRef}
                        className="w-full bg-white border border-indigo-300 rounded px-1 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                        value={node.title}
                        onChange={(e) => updateNodeTitle(nodeId, e.target.value)}
                        onBlur={finishEdit}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className={`truncate text-sm block ${textColorClass}`}>
                        {node.title}
                    </span>
                )}
            </div>

            {fsrsStats}
            <div className="opacity-100 ml-1">{statusBadge}</div>
          </div>

          <div className="flex items-center gap-2 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                 e.stopPropagation();
                 setIsAdding(!isAdding);
              }}
              className={`p-1 rounded ${isSelected ? 'text-indigo-400 hover:bg-indigo-200' : 'text-gray-400 hover:bg-gray-200'}`}
              title="添加子项"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => {
                 e.stopPropagation();
                 deleteNode(node.id);
              }}
              className="p-1 text-red-400 hover:bg-red-200 rounded cursor-pointer z-50 relative"
              title="删除节点"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {dropPosition === 'bottom' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 z-50 pointer-events-none shadow-[0_0_4px_rgba(99,102,241,0.5)] transform translate-y-0.5" />
        )}
      </div>

      {isAdding && (
        <div className="pl-8 py-1 mb-1">
           <div className="flex items-center gap-2">
              <input
                autoFocus
                className="text-sm border-b border-indigo-300 focus:border-indigo-600 outline-none bg-transparent w-full max-w-xs py-1"
                placeholder="子项名称..."
                value={localInput}
                onChange={e => setLocalInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleLocalAdd(e.shiftKey ? 'store' : 'plan');
                  if (e.key === 'Escape') setIsAdding(false);
                }}
              />
              <button onClick={() => handleLocalAdd('plan')} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200">规划</button>
           </div>
        </div>
      )}

      {node.isExpanded && hasChildren && (
        <div className="border-l border-gray-200 ml-2"> 
          {node.children.map((childId: string) => (
            <NodeItem key={childId} nodeId={childId} />
          ))}
        </div>
      )}
    </div>
  );
});
