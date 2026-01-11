
import React, { useState } from 'react';
import { Archive, CalendarClock, Plus } from 'lucide-react';

interface ToolbarProps {
  rootTitle: string;
  inputValue: string;
  setInputValue: (val: string) => void;
  onCreate: (mode: 'store' | 'plan') => void;
}

export function Toolbar({ rootTitle, inputValue, setInputValue, onCreate }: ToolbarProps) {
  const [mode, setMode] = useState<'plan' | 'store'>('plan');

  const handleCreate = () => {
    onCreate(mode);
  };

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase">
                添加到：<span className="text-indigo-600">{rootTitle}</span>
            </label>
            
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button
                    onClick={() => setMode('plan')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        mode === 'plan' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <CalendarClock size={12} />
                    规划复习
                </button>
                <button
                    onClick={() => setMode('store')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        mode === 'store' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Archive size={12} />
                    仅储存
                </button>
            </div>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={mode === 'plan' ? "输入内容并安排复习..." : "输入笔记内容..."}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <button 
            onClick={handleCreate}
            className={`px-6 py-2 font-medium rounded-lg flex items-center gap-2 shadow-md transition-all ${
                mode === 'plan' 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' 
                    : 'bg-gray-800 text-white hover:bg-gray-900 shadow-gray-200'
            }`}
          >
            {mode === 'plan' ? <Plus size={18} /> : <Archive size={18} />}
            <span>添加</span>
          </button>
        </div>
      </div>
    </div>
  );
}
