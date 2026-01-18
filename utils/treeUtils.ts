
import { NodeMap } from '../types';

export const INITIAL_DATA: NodeMap = {
  'root': {
    id: 'root',
    parentId: null,
    title: '根节点',
    children: ['subject-1', 'subject-2'],
    isExpanded: true,
    fsrs: { state: 'suspended', s: 0, d: 0, due: 0, lastReview: 0 },
    logs: []
  },
  'subject-1': {
    id: 'subject-1',
    parentId: 'root',
    title: '数学',
    children: ['node-101'],
    isExpanded: true,
    fsrs: { state: 'suspended', s: 0, d: 0, due: 0, lastReview: 0 },
    logs: []
  },
  'subject-2': {
    id: 'subject-2',
    parentId: 'root',
    title: '计算机科学',
    children: [],
    isExpanded: false,
    fsrs: { state: 'suspended', s: 0, d: 0, due: 0, lastReview: 0 },
    logs: []
  },
  'node-101': {
    id: 'node-101',
    parentId: 'subject-1',
    title: '微积分',
    children: [],
    isExpanded: false,
    fsrs: { state: 'new', s: 0, d: 0, due: Date.now() - 10000, lastReview: 0 },
    logs: [] 
  }
};
