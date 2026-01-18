
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Node, NodeMap, Rating, TreeContextType, FSRSReviewLog } from '../types';
import { INITIAL_DATA } from '../utils/treeUtils';
import { recalculateFSRS } from '../fsrs';
import { useCloudSync } from './useCloudSync';

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
  // 1. Initialize Nodes
  const [nodes, setNodes] = useState<NodeMap>(() => {
    try {
      const saved = localStorage.getItem('memoryflow_data');
      if (saved) {
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

  // 2. Initialize Timestamp
  const [lastModified, setLastModified] = useState<number>(() => {
      try {
          const savedTs = localStorage.getItem('memoryflow_timestamp');
          return savedTs ? parseInt(savedTs, 10) : 0;
      } catch {
          return 0;
      }
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);

  // 3. Cloud Sync Integration
  // We pass a wrapped setter to useCloudSync to ensure we can update nodes from cloud
  const { isSyncing } = useCloudSync(
      nodes, 
      setNodes, 
      lastModified, 
      (ts) => {
          setLastModified(ts);
          localStorage.setItem('memoryflow_timestamp', ts.toString());
      }
  );

  // 4. Persistence Effect
  // Whenever nodes change locally, we update localStorage and the timestamp.
  useEffect(() => {
    localStorage.setItem('memoryflow_data', JSON.stringify(nodes));
    
    // NOTE: This effect runs on EVERY node change.
    // Ideally, we only update the timestamp if it's a "user action", 
    // but differentiating that cleanly is hard. 
    // We simply update the timestamp to NOW.
    // useCloudSync handles the "isRemoteUpdate" check to avoid echo-loops.
    const now = Date.now();
    setLastModified(now);
    localStorage.setItem('memoryflow_timestamp', now.toString());
    
  }, [nodes]);

  const addNode = useCallback((parentId: string, title: string, mode: 'store' | 'plan') => {
    const newId = crypto.randomUUID();
    const now = Date.now();
    const dateObj = new Date(now);
    
    // Late night logic (00:00 - 03:00):
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

  // Retroactive Log
  const addRetroactiveLog = useCallback((id: string, rating: Rating, date: number) => {
    setNodes(prev => {
      if (!prev[id]) return prev;
      const node = prev[id];
      
      const newLog: FSRSReviewLog = {
        id: crypto.randomUUID(),
        rating,
        reviewDate: date
      };
      
      const updatedLogs = [...(node.logs || []), newLog];
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
          
          const recalculatedState = recalculateFSRS(updatedLogs, Date.now()); 
          
          if (updatedLogs.length === 0) {
              recalculatedState.state = 'new';
              recalculatedState.s = 0;
              recalculatedState.d = 0;
              recalculatedState.due = Date.now(); 
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
    setDraggingId,
    isSyncing // Exposed for UI if needed
  };
}
