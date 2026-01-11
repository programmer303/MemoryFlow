import { format } from 'date-fns';
import { computeNextSchedule } from '../fsrs';
import { CalendarData, CalendarEvent, FSRSData, NodeMap } from '../types';

/**
 * PURE FUNCTION: Simulates future reviews based on current state.
 * Does NOT mutate the original nodes.
 * 
 * CORE LOGIC:
 * 1. Identify 'Confirmed Review' (actual due date).
 * 2. If user reviews on that date (Rating: Good), what is the new FSRS state?
 * 3. Based on new state, when is the NEXT review? -> 'Projected Review'
 * 4. Recursively repeat step 2 & 3 using the simulated state.
 */
export const generateReviewSchedule = (
  nodes: NodeMap, 
  daysToProject: number
): CalendarData => {
  const schedule: CalendarData = {};
  const now = Date.now();
  const rangeEnd = now + (daysToProject * 24 * 60 * 60 * 1000);
  
  const addToSchedule = (timestamp: number, event: CalendarEvent) => {
    const dateKey = format(timestamp, 'yyyy-MM-dd');
    if (!schedule[dateKey]) {
      schedule[dateKey] = [];
    }
    schedule[dateKey].push(event);
  };

  const allNodes = Object.values(nodes);

  for (const node of allNodes) {
    // Skip invalid nodes
    if (node.id === 'root' || node.fsrs.state === 'suspended' || !node.parentId) continue;

    // ---------------------------------------------
    // STEP 1: Confirmed Review (The Real Next Due)
    // ---------------------------------------------
    const currentDue = node.fsrs.due;
    
    // For simulation, if a card is overdue, we assume it gets reviewed TODAY.
    // If it's due in the future, we assume it gets reviewed ON TIME.
    const effectiveReviewDate = Math.max(currentDue, now);

    // Only display 'Confirmed' if it's within our viewing range
    // (Note: Overdue cards effectively appear on "Today" in this logic if we visualized them by dateKey, 
    // but here we store them by their *due* date for the calendar. 
    // We will stick to adding it if currentDue <= rangeEnd.)
    if (currentDue <= rangeEnd) {
       addToSchedule(currentDue, {
        nodeId: node.id,
        title: node.title,
        date: currentDue,
        type: 'confirmed'
      });
    } else {
        // If the *first* review is already outside the range, we don't need to project anything.
        continue;
    }

    // ---------------------------------------------
    // STEP 2: Projected Reviews (Iterative FSRS)
    // ---------------------------------------------
    
    // Initialize simulation with the REAL current state
    let simulatedState: FSRSData = { ...node.fsrs };
    
    // 'lastSimulatedReviewDate' tracks when the PREVIOUS review happened in our simulation chain.
    // Start with the confirmed review date.
    let lastSimulatedReviewDate = effectiveReviewDate;
    
    let safetyCounter = 0;
    
    // Simulate chain: Review -> New State -> Next Due -> Review -> ...
    while (safetyCounter < 365) { 
        // A. Simulate a 'Good' (3) review occurring at 'lastSimulatedReviewDate'
        //    computeNextSchedule uses: (Current State, Rating, Time of Review)
        const simulationResult = computeNextSchedule(simulatedState, 3, lastSimulatedReviewDate);
        
        // B. Get the strictly calculated interval from FSRS
        const nextIntervalDays = simulationResult.interval;
        
        // C. Calculate the Date for the NEXT review
        const nextReviewTimestamp = lastSimulatedReviewDate + (nextIntervalDays * 24 * 60 * 60 * 1000);
        
        // D. Check if this next review falls outside our projection window
        if (nextReviewTimestamp > rangeEnd) break;
        
        // E. Register this as a Projected Event
        addToSchedule(nextReviewTimestamp, {
            nodeId: node.id,
            title: node.title,
            date: nextReviewTimestamp,
            type: 'projected',
            predictedInterval: nextIntervalDays
        });
        
        // F. EVOLVE STATE for the next iteration
        //    The node now has the properties resulting from the review at 'lastSimulatedReviewDate'.
        simulatedState = {
            state: 'review',
            s: simulationResult.s,
            d: simulationResult.d,
            lastReview: lastSimulatedReviewDate, // The review happened "just now" in simulation time
            due: nextReviewTimestamp // Optional for computation but good for consistency
        };
        
        // G. Advance time: The next review will happen at 'nextReviewTimestamp'
        lastSimulatedReviewDate = nextReviewTimestamp;
        
        safetyCounter++;
    }
  }

  // Sort events: Confirmed first, then alphabetical
  Object.keys(schedule).forEach(date => {
    schedule[date].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'confirmed' ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  });

  return schedule;
};
