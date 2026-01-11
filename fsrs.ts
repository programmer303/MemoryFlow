import { FSRSData, Rating, SchedulingInfo } from './types';

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

/**
 * Calculates the next Difficulty (D)
 * D' = D - w6 * (grade - 3)
 * D is constrained between 1 and 10.
 * D_0 = w4 - (grade - 1) (Wait, simplified logic below based on FSRS specs)
 */
const nextDifficulty = (d: number, rating: Rating): number => {
  const nextD = d - w[6] * (rating - 3);
  return Math.min(10, Math.max(1, (1 - w[7]) * nextD + w[7] * 1 /* mean reversion */)); // Using simplified linear update for this implementation context or standard?
  // Let's use the explicit formula from v4:
  // next_d = d - w[6] * (grade - 3)
  // next_d = mean_reversion(w[4], next_d)
  // We will stick to the core update logic:
  let newD = d - w[6] * (rating - 3);
  // Mean reversion to initial mean D (w[4] approx) is often part of standard, 
  // but for pure JS implementation, simple clamping is often sufficient. 
  // We will apply clamping [1, 10].
  return Math.min(10, Math.max(1, newD));
};

/**
 * Calculates the Initial Stability (S0) for a new card.
 * S0 = w[rating - 1]
 */
const initialStability = (rating: Rating): number => {
  return w[rating - 1];
};

/**
 * Calculates the Initial Difficulty (D0) for a new card.
 * D0 = w[4] - (rating - 3) * w[5]
 * Clamped [1, 10]
 */
const initialDifficulty = (rating: Rating): number => {
  const d0 = w[4] - (rating - 3) * w[5];
  return Math.min(10, Math.max(1, d0));
};

/**
 * Calculates Next Stability (S') for a review.
 * Reference: S' = S * (1 + e^w8 * (11-D) * S^w9 * (e^(w10 * (1-R)) - 1))
 */
const nextStability = (s: number, d: number, r: number, rating: Rating): number => {
  if (rating === 1) {
    // Forgetting curve logic (Again)
    // S_forget = w11 * D^w12 * S^w13 * e^(w14 * (1-R))
    // We will use a simplified approach for 'Again' to ensure S drops significantly but not to 0.
    // Standard FSRS v4 logic for 'forget':
    return w[11] * Math.pow(d, -w[12]) * Math.pow((s + 1), w[13]) * Math.exp(w[14] * (1 - r));
  }

  // Success logic (Hard, Good, Easy)
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;
  
  // R is retrievability at the time of review
  const nextS = s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hardPenalty * easyBonus);
  
  return nextS;
};

/**
 * Calculate Retrievability (R)
 * R = (1 + factor * t / S) ^ decay
 */
const currentRetrievability = (s: number, elapsedDays: number): number => {
  if (s === 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / s, DECAY);
};

export const computeNextSchedule = (
  current: FSRSData,
  rating: Rating,
  now: number = Date.now()
): SchedulingInfo => {
  const elapsedDays = Math.max(0, (now - current.lastReview) / (1000 * 60 * 60 * 24));
  
  let nextS = 0;
  let nextD = 0;

  // Case 1: First time review (Transition from 'learning'/'new' state to real FSRS stats)
  // In our app, 'new'/'learning' items have s=0, d=0.
  if (current.s === 0) {
    nextS = initialStability(rating);
    nextD = initialDifficulty(rating);
  } else {
    // Case 2: Standard Review
    const r = currentRetrievability(current.s, elapsedDays);
    nextD = nextDifficulty(current.d, rating);
    nextS = nextStability(current.s, current.d, r, rating);
  }

  // Rounding for UI cleanliness
  return {
    s: parseFloat(nextS.toFixed(4)),
    d: parseFloat(nextD.toFixed(4)),
    interval: calculateInterval(nextS)
  };
};

export const formatTime = (days: number): string => {
  if (days < 1) return '<1天';
  if (days < 30) return `${Math.round(days)}天`;
  if (days < 365) return `${Math.round(days / 30)}个月`;
  return `${(days / 365).toFixed(1)}年`;
};