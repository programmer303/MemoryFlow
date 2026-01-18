
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, ArrowLeft } from 'lucide-react';
import { Node, Rating } from '../types';
import { computeNextSchedule } from '../fsrs';
import { SwipeableCard } from './SwipeableCard';
import type { SwipeDirection } from './SwipeableCard';

interface ReviewDeckProps {
  queue: Node[];
  onReviewComplete: (id: string, s: number, d: number, interval: number, rating: Rating) => void;
  onExit: () => void;
}

export const ReviewDeck = ({ queue, onReviewComplete, onExit }: ReviewDeckProps) => {
  // We maintain a local queue state to handle immediate visual removal
  // even if the parent state update lags slightly.
  const [activeQueue, setActiveQueue] = useState<Node[]>(queue);

  useEffect(() => {
    setActiveQueue(queue);
  }, [queue]);

  const handleSwipe = (direction: SwipeDirection, cardId: string) => {
    // 1. Map direction to Rating
    let rating: Rating = 3; // Default Good
    switch (direction) {
        case 'left': rating = 1; break; // Again
        case 'down': rating = 2; break; // Hard
        case 'right': rating = 3; break; // Good
        case 'up': rating = 4; break; // Easy
    }

    // 2. Compute Schedule
    const currentNode = activeQueue.find(n => n.id === cardId);
    if (!currentNode) return;

    const result = computeNextSchedule(currentNode.fsrs, rating, Date.now());

    // 3. Update Parent State (Sync)
    onReviewComplete(cardId, result.s, result.d, result.interval, rating);

    // 4. Update Local State (Visual)
    setActiveQueue(prev => prev.slice(1));
  };

  const handleSkip = (cardId: string) => {
    // Move current card to end of queue visually
    setActiveQueue(prev => {
        const [first, ...rest] = prev;
        return [...rest, first];
    });
  };

  // --- EMPTY STATE ---
  if (activeQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-center p-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm">
          <ListTodo size={48} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">今日任务达成！</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          所有待复习卡片已清空。休息一下，明天继续保持。
        </p>
        <button 
          onClick={onExit}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
        >
          返回首页
        </button>
      </div>
    );
  }

  // --- DECK RENDER ---
  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-hidden relative">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 z-50 flex justify-between items-center pointer-events-none">
            <button 
                onClick={onExit}
                className="pointer-events-auto p-2 bg-white/80 backdrop-blur rounded-full text-gray-600 hover:text-gray-900 shadow-sm hover:bg-white transition-all"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="px-3 py-1 bg-white/80 backdrop-blur rounded-full text-xs font-mono font-bold text-indigo-600 shadow-sm">
                剩余: {activeQueue.length}
            </div>
        </div>

        {/* Card Stack Container */}
        <div className="flex-1 flex items-center justify-center relative w-full max-w-lg mx-auto">
            <AnimatePresence>
                {activeQueue.slice(0, 3).map((item, index) => {
                    // index 0 is active card. 
                    return (
                        <CardWrapper 
                            key={item.id} 
                            item={item} 
                            index={index} 
                            onSwipe={handleSwipe}
                            onSkip={handleSkip}
                        />
                    );
                })}
            </AnimatePresence>
        </div>

        {/* Legend / Controls Hint */}
        <div className="h-24 pb-6 flex items-end justify-center gap-8 text-[10px] text-gray-400 font-medium uppercase tracking-widest pointer-events-none">
             <div className="flex flex-col items-center gap-1">
                 <div className="w-8 h-8 rounded-full border border-rose-200 flex items-center justify-center text-rose-400 bg-rose-50">←</div>
                 <span>重来</span>
             </div>
             <div className="flex flex-col items-center gap-1">
                 <div className="w-8 h-8 rounded-full border border-amber-200 flex items-center justify-center text-amber-400 bg-amber-50">↓</div>
                 <span>困难</span>
             </div>
             <div className="flex flex-col items-center gap-1">
                 <div className="w-8 h-8 rounded-full border border-sky-200 flex items-center justify-center text-sky-400 bg-sky-50">↑</div>
                 <span>简单</span>
             </div>
             <div className="flex flex-col items-center gap-1">
                 <div className="w-8 h-8 rounded-full border border-emerald-200 flex items-center justify-center text-emerald-400 bg-emerald-50">→</div>
                 <span>良好</span>
             </div>
        </div>
    </div>
  );
};

// Helper wrapper to handle Layout Animations (Stacking) cleanly
interface CardWrapperProps { 
    item: Node;
    index: number;
    onSwipe: (d: SwipeDirection, id: string) => void;
    onSkip: (id: string) => void;
}

const CardWrapper: React.FC<CardWrapperProps> = ({ item, index, onSwipe, onSkip }) => {
    // Determine visuals based on index (0 = front, 1 = middle, 2 = back)
    const isFront = index === 0;

    // 3D Stack Effect Logic:
    // 1. Rotation: Alternating tilt for messy stack look (e.g. -5deg, +4deg)
    // 2. Scale: Each card behind is significantly smaller
    // 3. Y-Offset: Each card behind peeks out from bottom
    const stackRotate = index === 0 ? 0 : (index % 2 === 1 ? -5 : 4) + (index * (index % 2 === 1 ? -1 : 1));
    
    return (
        <motion.div
            layout
            initial={{ scale: 0.8, y: 100, opacity: 0, rotate: 0 }}
            animate={{ 
                scale: 1 - index * 0.08, 
                y: index * 20, 
                opacity: 1 - index * 0.1,
                rotate: stackRotate,
                zIndex: 100 - index 
            }}
            exit={{ 
                opacity: 0, 
                scale: 0.95,
                transition: { duration: 0.15 } 
            }}
            transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 40,
                mass: 1
            }}
            className="absolute w-full h-full flex items-center justify-center pointer-events-none"
        >
            <div className={`w-full h-full flex items-center justify-center ${isFront ? 'pointer-events-auto' : ''}`}>
                 <SwipeableCard 
                    data={item} 
                    index={index} 
                    onSwipe={(dir) => onSwipe(dir, item.id)}
                    onSkip={() => onSkip(item.id)}
                 />
            </div>
        </motion.div>
    )
}
