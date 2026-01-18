
export type NodeState = 'new' | 'learning' | 'review' | 'suspended';

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface FSRSData {
  state: NodeState;
  s: number; // Stability
  d: number; // Difficulty
  due: number; // Timestamp
  lastReview: number; // Timestamp
}

export interface FSRSReviewLog {
  id: string; // Unique ID for the log entry
  rating: Rating;
  reviewDate: number; // Timestamp when review happened
  // Snapshot of state AFTER this review (optional, but good for debugging)
  stateAfter?: {
    s: number;
    d: number;
    interval: number;
  };
}

export interface Node {
  id: string;
  parentId: string | null;
  title: string;
  children: string[]; // List of child IDs
  isExpanded: boolean;
  fsrs: FSRSData;
  logs: FSRSReviewLog[]; // FULL HISTORY
}

export type NodeMap = Record<string, Node>;

export interface SchedulingInfo {
  s: number;
  d: number;
  interval: number; // in days
}

export interface TreeContextType {
  nodes: NodeMap;
  addNode: (parentId: string, title: string, mode: 'store' | 'plan') => string;
  updateNodeTitle: (id: string, title: string) => void;
  deleteNode: (nodeId: string) => void;
  toggleExpand: (id: string) => void;
  moveNode: (sourceId: string, targetId: string, position: 'top' | 'bottom') => void;
  reviewComplete: (id: string, s: number, d: number, interval: number, rating: Rating) => void;
  addRetroactiveLog: (id: string, rating: Rating, date: number) => void;
  deleteLog: (nodeId: string, logId: string) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}

// --- Calendar & Simulation Types ---

export type ReviewType = 'confirmed' | 'projected';

export interface CalendarEvent {
  nodeId: string;
  title: string;
  date: number; // Timestamp
  type: ReviewType;
  predictedInterval?: number; // For tooltip info
}

export type CalendarData = Record<string, CalendarEvent[]>; // Key is YYYY-MM-DD
