
import { FSRSData, FSRSReviewLog, Rating, SchedulingInfo } from './types';

// Standard FSRS v4.5 Weights
const w = [
  0.40255, 1.18385, 3.173, 15.69105, 7.19605, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.41, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
];

// Constants
const DECAY = -0.5;
const FACTOR = 0.9; // Request Retention (0.9 is standard)

/**
 * Calculates the interval in days based on stability and request retention.
 * Interval = S * 9 * (1/R - 1)
 */
export const calculateInterval = (s: number): number => {
  if (s === 0) return 0;
  return Math.min(36500, Math.max(1, Math.round(s * 9 * (1 / FACTOR - 1))));
};

const nextDifficulty = (d: number, rating: Rating): number => {
  const nextD = d - w[6] * (rating - 3);
  return Math.min(10, Math.max(1, (1 - w[7]) * nextD + w[7] * 1)); 
};

const initialStability = (rating: Rating): number => {
  return w[rating - 1];
};

const initialDifficulty = (rating: Rating): number => {
  const d0 = w[4] - (rating - 3) * w[5];
  return Math.min(10, Math.max(1, d0));
};

const nextStability = (s: number, d: number, r: number, rating: Rating): number => {
  if (rating === 1) {
    return w[11] * Math.pow(d, -w[12]) * Math.pow((s + 1), w[13]) * Math.exp(w[14] * (1 - r));
  }
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;
  const nextS = s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hardPenalty * easyBonus);
  return nextS;
};

// Exported for use in prioritization logic
export const currentRetrievability = (s: number, elapsedDays: number): number => {
  if (s === 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / s, DECAY);
};

export const computeNextSchedule = (
  current: FSRSData,
  rating: Rating,
  reviewTime: number // The time the review actually happens
): SchedulingInfo => {
  // If first time (s=0), treat as new
  if (current.s === 0) {
     const nextS = initialStability(rating);
     const nextD = initialDifficulty(rating);
     return {
       s: parseFloat(nextS.toFixed(4)),
       d: parseFloat(nextD.toFixed(4)),
       interval: calculateInterval(nextS)
     };
  }

  const elapsedDays = Math.max(0, (reviewTime - current.lastReview) / (1000 * 60 * 60 * 24));
  const r = currentRetrievability(current.s, elapsedDays);
  const nextD = nextDifficulty(current.d, rating);
  const nextS = nextStability(current.s, current.d, r, rating);

  return {
    s: parseFloat(nextS.toFixed(4)),
    d: parseFloat(nextD.toFixed(4)),
    interval: calculateInterval(nextS)
  };
};

/**
 * RECALCULATE STATE FROM FULL HISTORY
 * This is the core logic for retroactive history.
 * It replays the history to determine the mathematically correct current state.
 */
export const recalculateFSRS = (logs: FSRSReviewLog[], initialDue: number): FSRSData => {
  // 1. Sort logs chronologically
  const sortedLogs = [...logs].sort((a, b) => a.reviewDate - b.reviewDate);

  // 2. Start with default empty state
  // Important: If there are no logs, the state remains 'new' (or 'suspended' depending on context, handled by caller)
  // Here we assume if we are recalculating, we want the state AFTER the last log.
  let state: FSRSData = {
    state: 'new',
    s: 0,
    d: 0,
    due: initialDue,
    lastReview: 0
  };

  if (sortedLogs.length === 0) {
      return state;
  }

  // 3. Replay history
  for (const log of sortedLogs) {
      const schedule = computeNextSchedule(state, log.rating, log.reviewDate);
      
      state = {
          state: 'review',
          s: schedule.s,
          d: schedule.d,
          lastReview: log.reviewDate,
          due: log.reviewDate + (schedule.interval * 24 * 60 * 60 * 1000)
      };
  }

  return state;
};

export const formatTime = (days: number): string => {
  if (days < 1) return '<1天';
  if (days < 30) return `${Math.round(days)}天`;
  if (days < 365) return `${Math.round(days / 30)}个月`;
  return `${(days / 365).toFixed(1)}年`;
};
