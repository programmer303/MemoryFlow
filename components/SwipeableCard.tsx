
import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { SkipForward, X, Check, ChevronsUp, AlertTriangle } from 'lucide-react';
import { Node } from '../types';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeableCardProps {
  data: Node;
  index: number;
  onSwipe: (direction: SwipeDirection) => void;
  onSkip: () => void;
}

export const SwipeableCard = ({ data, index, onSwipe, onSkip }: SwipeableCardProps) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // 1. Rotation Logic: Rotate slightly based on X drag
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // 2. Overlay Opacity Logic
  // Map x/y values to opacity (0 to 1) for color overlays
  const opacityLeft = useTransform(x, [-150, -20], [1, 0]);   // Red (Again)
  const opacityRight = useTransform(x, [20, 150], [0, 1]);    // Green (Good)
  const opacityUp = useTransform(y, [-150, -20], [1, 0]);     // Blue (Easy)
  const opacityDown = useTransform(y, [20, 150], [0, 1]);     // Yellow (Hard)

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const threshold = 100;
    const velocityThreshold = 500;
    const { offset, velocity } = info;

    // Determine dominant direction
    const isHorizontal = Math.abs(offset.x) > Math.abs(offset.y);

    let direction: SwipeDirection | null = null;

    if (isHorizontal) {
        if (offset.x > threshold || velocity.x > velocityThreshold) direction = 'right';
        else if (offset.x < -threshold || velocity.x < -velocityThreshold) direction = 'left';
    } else {
        if (offset.y > threshold || velocity.y > velocityThreshold) direction = 'down';
        else if (offset.y < -threshold || velocity.y < -velocityThreshold) direction = 'up';
    }

    if (direction) {
        // Exit Animation
        let targetX = 0;
        let targetY = 0;
        
        if (direction === 'left') targetX = -500;
        else if (direction === 'right') targetX = 500;
        else if (direction === 'up') targetY = -500;
        else if (direction === 'down') targetY = 500;

        await controls.start({
            x: targetX,
            y: targetY,
            opacity: 0,
            transition: { duration: 0.2 }
        });
        onSwipe(direction);
    } else {
        // Bounce Back
        controls.start({ x: 0, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  // Only top card is draggable
  const isFront = index === 0;

  return (
    <motion.div
      drag={isFront ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Elastic drag
      dragElastic={0.6} // Rubber band effect
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ 
        x, 
        y, 
        rotate: isFront ? rotate : 0, 
        zIndex: 100 - index,
        width: '100%',
        height: '100%',
        cursor: isFront ? 'grab' : 'default',
        position: 'absolute'
      }}
      whileTap={{ cursor: 'grabbing' }}
      className="absolute inset-0 flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-sm aspect-[3/4] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col select-none">
        
        {/* --- OVERLAYS --- */}
        {/* Left: Again (Red) */}
        <motion.div style={{ opacity: opacityLeft }} className="absolute inset-0 bg-rose-500/80 z-20 flex items-center justify-center pointer-events-none">
             <div className="border-4 border-white rounded-xl p-4 transform -rotate-12">
                 <div className="flex flex-col items-center text-white font-black text-4xl tracking-wider">
                     <X size={48} strokeWidth={4} />
                     <span>重来</span>
                 </div>
             </div>
        </motion.div>

        {/* Right: Good (Green) */}
        <motion.div style={{ opacity: opacityRight }} className="absolute inset-0 bg-emerald-500/80 z-20 flex items-center justify-center pointer-events-none">
             <div className="border-4 border-white rounded-xl p-4 transform rotate-12">
                 <div className="flex flex-col items-center text-white font-black text-4xl tracking-wider">
                     <Check size={48} strokeWidth={4} />
                     <span>良好</span>
                 </div>
             </div>
        </motion.div>

        {/* Up: Easy (Blue) */}
        <motion.div style={{ opacity: opacityUp }} className="absolute inset-0 bg-sky-500/80 z-20 flex items-center justify-center pointer-events-none">
             <div className="border-4 border-white rounded-xl p-4 transform -translate-y-10">
                 <div className="flex flex-col items-center text-white font-black text-4xl tracking-wider">
                     <ChevronsUp size={48} strokeWidth={4} />
                     <span>简单</span>
                 </div>
             </div>
        </motion.div>

        {/* Down: Hard (Yellow/Orange) */}
        <motion.div style={{ opacity: opacityDown }} className="absolute inset-0 bg-amber-500/80 z-20 flex items-center justify-center pointer-events-none">
             <div className="border-4 border-white rounded-xl p-4 transform translate-y-10">
                 <div className="flex flex-col items-center text-white font-black text-4xl tracking-wider">
                     <AlertTriangle size={48} strokeWidth={4} />
                     <span>困难</span>
                 </div>
             </div>
        </motion.div>

        {/* --- CARD CONTENT --- */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-white to-gray-50">
           <div className="w-full mb-6">
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold tracking-wide uppercase">
                    复习卡片
                </span>
           </div>
           
           <h2 className="text-3xl font-bold text-slate-800 leading-snug break-words line-clamp-6">
             {data.title}
           </h2>

           <div className="mt-8 text-xs text-gray-400 font-mono">
               上一次复习: {data.fsrs.lastReview ? new Date(data.fsrs.lastReview).toLocaleDateString() : '从未'}
           </div>
        </div>

        {/* Footer Actions */}
        <div className="h-20 bg-white border-t border-gray-100 flex items-center justify-center px-6 relative z-30">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onSkip();
                }}
                className="flex items-center gap-2 px-6 py-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors text-sm font-medium"
            >
                <SkipForward size={16} />
                <span>暂不复习</span>
            </button>
        </div>
      </div>
    </motion.div>
  );
};
