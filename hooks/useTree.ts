
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Node, NodeMap, Rating, TreeContextType, FSRSReviewLog } from '../types';
import { INITIAL_DATA } from '../utils/treeUtils';
import { recalculateFSRS } from '../fsrs';

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
      if (saved) {
         // Migration: Ensure logs array exists for old data
         const parsed = JSON.parse(saved);
         Object.keys(parsed).forEach(key => {
            if (!parsed[key].logs) parsed[key].logs = [];
         });
         return parsed;
      }
      return INITIAL_DATA;
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
    const dateObj = new Date(now);
    
    // Late night logic (00:00 - 03:00):
    // If user adds content now, they consider it "Yesterday's" session.
    // "Due Tomorrow" relative to "Yesterday" is "Today" (current physical date).
    // Standard Time (03:00+): Due = Tomorrow (Now + 24h).
    const isLateNight = dateObj.getHours() < 3;
    const initialDue = isLateNight ? now : now + (24 * 60 * 60 * 1000);
    
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
        // If mode is plan, schedule based on logic above. If store, suspended (0).
        due: mode === 'plan' ? initialDue : 0, 
        lastReview: 0 
      },
      logs: []
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

  // Standard Review (Today)
  const reviewComplete = useCallback((id: string, s: number, d: number, interval: number, rating: Rating) => {
    const now = Date.now();
    
    setNodes(prev => {
      if (!prev[id]) return prev;
      const node = prev[id];
      
      // Append new log
      const newLog: FSRSReviewLog = {
        id: crypto.randomUUID(),
        rating,
        reviewDate: now,
        stateAfter: { s, d, interval }
      };

      const updatedLogs = [...(node.logs || []), newLog];

      return {
        ...prev,
        [id]: {
          ...node,
          logs: updatedLogs,
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

  // Retroactive Log (Past/Future insertion) -> Triggers Full Recalculation
  const addRetroactiveLog = useCallback((id: string, rating: Rating, date: number) => {
    setNodes(prev => {
      if (!prev[id]) return prev;
      const node = prev[id];
      
      // 1. Add new log
      const newLog: FSRSReviewLog = {
        id: crypto.randomUUID(),
        rating,
        reviewDate: date
      };
      
      const updatedLogs = [...(node.logs || []), newLog];
      
      // 2. Strict Recalculation from History
      const recalculatedState = recalculateFSRS(updatedLogs, node.fsrs.due);

      return {
        ...prev,
        [id]: {
          ...node,
          logs: updatedLogs,
          fsrs: recalculatedState
        }
      };
    });
  }, []);

  const deleteLog = useCallback((nodeId: string, logId: string) => {
      setNodes(prev => {
          if (!prev[nodeId]) return prev;
          const node = prev[nodeId];
          const updatedLogs = node.logs.filter(l => l.id !== logId);
          
          const recalculatedState = recalculateFSRS(updatedLogs, Date.now()); // fallback due
          
          // If no logs left, maybe reset state to new?
          if (updatedLogs.length === 0) {
              recalculatedState.state = 'new';
              recalculatedState.s = 0;
              recalculatedState.d = 0;
              recalculatedState.due = Date.now(); // Reset to due now
          }

          return {
              ...prev,
              [nodeId]: {
                  ...node,
                  logs: updatedLogs,
                  fsrs: recalculatedState
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
    addRetroactiveLog,
    deleteLog,
    draggingId,
    setDraggingId
  };
}
