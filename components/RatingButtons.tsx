import React from 'react';

interface RatingButtonProps {
  label: string;
  time: string;
  color: string;
  onClick: () => void;
}

export function RatingButton({ label, time, color, onClick }: RatingButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-4 rounded-xl transition-colors ${color}`}
    >
      <span className="font-bold text-lg mb-1">{label}</span>
      <span className="text-xs opacity-70 font-mono">{time}</span>
    </button>
  );
}
