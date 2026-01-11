
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Node, NodeMap, Rating, TreeContextType } from '../types';
import { INITIAL_DATA } from '../utils/treeUtils';

// Context Definition
export const TreeContext = createContext<TreeContextType | null>(null);

export interface TreeVisualContextType {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}
export const TreeVisualContext = createContext<TreeVisualContextType | null>(null);

export const useTreeContext = () => {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error('useTreeContext must be used within a TreeProvider');
  }
  return context;
};

// Hook Implementation
export function useTree() {
  const [nodes, setNodes] = useState<NodeMap>(() => {
    try {
      const saved = localStorage.getItem('memoryflow_data');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch (e) {
      console.error("Failed to load data", e);
      return INITIAL_DATA;
    }
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('memoryflow_data', JSON.stringify(nodes));
  }, [nodes]);

  const addNode = useCallback((parentId: string, title: string, mode: 'store' | 'plan') => {
    const newId = crypto.randomUUID();
    const now = Date.now();
    
    const newNode: Node = {
      id: newId,
      parentId,
      title,
      children: [],
      isExpanded: false,
      fsrs: {
        state: mode === 'plan' ? 'new' : 'suspended',
        s: 0,
        d: 0,
        due: mode === 'plan' ? now + (24 * 60 * 60 * 1000) : 0, 
        lastReview: 0 
      }
    };

    setNodes(prev => {
      const next = { ...prev };
      if (next[parentId]) {
        next[newId] = newNode;
        next[parentId] = {
          ...next[parentId],
          children: [...next[parentId].children, newId],
          isExpanded: true 
        };
      }
      return next;
    });

    return newId;
  }, []);

  const updateNodeTitle = useCallback((id: string, title: string) => {
    setNodes(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], title }
      };
    });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prevNodes) => {
      const newNodes = JSON.parse(JSON.stringify(prevNodes));
      const targetId = String(nodeId); 

      if (!newNodes[targetId]) return prevNodes;

      const targetNode = newNodes[targetId];
      const parentId = targetNode.parentId ? String(targetNode.parentId) : null;

      if (parentId && newNodes[parentId]) {
        const parent = newNodes[parentId];
        parent.children = parent.children.filter((childId: string) => String(childId) !== targetId);
      }

      const idsToDelete: string[] = [];
      const stack = [targetId];

      while (stack.length > 0) {
        const currentId = String(stack.pop()!);
        idsToDelete.push(currentId);
        const node = newNodes[currentId];
        if (node && node.children && node.children.length > 0) {
          node.children.forEach((childId: string) => stack.push(String(childId)));
        }
      }

      idsToDelete.forEach((id) => delete newNodes[id]);
      return newNodes;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setNodes(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], isExpanded: !prev[id].isExpanded }
      };
    });
  }, []);

  const moveNode = useCallback((sourceId: string, targetId: string, position: 'top' | 'bottom') => {
    setNodes(prev => {
      const source = prev[sourceId];
      const target = prev[targetId];
      if (!source || !target || source.parentId !== target.parentId || !source.parentId) {
        return prev;
      }
      const parentId = source.parentId;
      const parent = prev[parentId];

      const newChildren = parent.children.filter(id => id !== sourceId);
      
      const targetIndex = newChildren.indexOf(targetId);
      if (targetIndex === -1) return prev;

      const insertIndex = position === 'top' ? targetIndex : targetIndex + 1;
      newChildren.splice(insertIndex, 0, sourceId);

      return {
        ...prev,
        [parentId]: { ...parent, children: newChildren }
      };
    });
  }, []);

  const reviewComplete = useCallback((id: string, s: number, d: number, interval: number, rating: Rating) => {
    const now = Date.now();
    setNodes(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          fsrs: {
            state: 'review',
            s,
            d,
            lastReview: now,
            due: now + (interval * 24 * 60 * 60 * 1000)
          }
        }
      };
    });
  }, []);

  return {
    nodes,
    addNode,
    updateNodeTitle,
    deleteNode,
    toggleExpand,
    moveNode,
    reviewComplete,
    draggingId,
    setDraggingId
  };
}
