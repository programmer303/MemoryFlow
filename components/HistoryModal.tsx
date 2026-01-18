
import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, History, Info } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  subMonths, 
  getDay,
  setHours,
  setMinutes,
  isToday,
  subDays
} from 'date-fns';
import { Rating, Node } from '../types';

interface HistoryModalProps {
  node: Node;
  onClose: () => void;
  onAddLog: (rating: Rating, date: number) => void;
  onDeleteLog: (logId: string) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function HistoryModal({ node, onClose, onAddLog, onDeleteLog }: HistoryModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showHelp, setShowHelp] = useState(false);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Padding for start of week
    const startDay = getDay(start); // 0-6
    const padding = Array(startDay).fill(null);
    
    return [...padding, ...days];
  }, [currentMonth]);

  // Map logs to days for quick lookup
  // ADJUSTMENT: Reviews between 00:00-03:00 belong to the previous day
  const logsByDate = useMemo(() => {
    const map = new Map<string, string>(); // dateString -> logId
    node.logs.forEach(log => {
      const logDate = new Date(log.reviewDate);
      // If hour is 0, 1, or 2, shift to previous day
      const visualDate = logDate.getHours() < 3 ? subDays(logDate, 1) : logDate;
      const dateKey = format(visualDate, 'yyyy-MM-dd');
      map.set(dateKey, log.id);
    });
    return map;
  }, [node.logs]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  // Find log for the currently selected date (using the visual adjustment logic reverse lookup is hard, so iterate)
  const selectedLog = useMemo(() => {
      return node.logs.find(log => {
          const logDate = new Date(log.reviewDate);
          const visualDate = logDate.getHours() < 3 ? subDays(logDate, 1) : logDate;
          return isSameDay(visualDate, selectedDate);
      });
  }, [node.logs, selectedDate]);

  const handleAddLog = (rating: Rating) => {
    if (selectedLog) return; // Prevent duplicate

    // Determine timestamp
    // If today, use current time. If past/future, use 9:00 AM to be consistent
    let timestamp: number;
    if (isToday(selectedDate)) {
        timestamp = Date.now();
    } else {
        const d = setHours(setMinutes(selectedDate, 0), 9);
        timestamp = d.getTime();
    }
    
    onAddLog(rating, timestamp);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 relative z-30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                <History size={18} />
            </div>
            <div>
                <h2 className="text-sm font-bold text-gray-800 line-clamp-1">{node.title}</h2>
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono hover:text-indigo-600 transition-colors bg-transparent hover:bg-gray-100 px-1 rounded -ml-1 mt-0.5"
                >
                    <span>S: {node.fsrs.s.toFixed(2)} | D: {node.fsrs.d.toFixed(2)}</span>
                    <Info size={10} />
                </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Container (Stacking Context) */}
        <div className="relative">
            
            {/* Help Overlay */}
            {showHelp && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Info size={16} className="text-indigo-500"/>
                        FSRS 参数说明
                    </h3>
                    
                    <div className="space-y-4 text-xs text-gray-600 leading-relaxed overflow-y-auto flex-1">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-indigo-700">S (Stability) - 记忆稳定性</span>
                                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono">单位: 天</span>
                            </div>
                            <p className="mb-1">表示记忆的“寿命”。数值越高，记得越牢。</p>
                            <p className="text-gray-400">例如 S=5.2，意味着大约 5.2 天后，您对该知识点的记忆保留率会下降到 90%（临界点）。</p>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-rose-700">D (Difficulty) - 记忆难度</span>
                                <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-mono">范围: 1-10</span>
                            </div>
                            <p className="mb-1">表示内容的复杂程度。数值越高，越难记住。</p>
                            <p className="text-gray-400">D 值越高，每次复习后 S 值增长得越慢（即下次复习间隔拉长得越慢）。</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowHelp(false)}
                        className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors"
                    >
                        知道了
                    </button>
                </div>
            )}

            {/* Calendar Section */}
            <div className="p-4">
                {/* Month Nav */}
                <div className="flex items-center justify-between mb-4 px-2">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft size={16} /></button>
                    <span className="text-sm font-bold text-gray-800">{format(currentMonth, 'yyyy年 M月')}</span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={16} /></button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                    {WEEKDAYS.map(d => (
                        <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-1">{d}</div>
                    ))}
                    {calendarDays.map((day, idx) => {
                        if (!day) return <div key={`pad-${idx}`} />;
                        
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = isSameDay(day, selectedDate);
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const hasLog = logsByDate.has(dateKey);
                        const isTodayDate = isToday(day);

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative h-8 rounded-lg text-xs flex items-center justify-center transition-all
                                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                                    ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105 z-10' : 'hover:bg-gray-50'}
                                    ${hasLog && !isSelected ? 'bg-green-50 text-green-700 font-bold' : ''}
                                `}
                            >
                                {format(day, 'd')}
                                {hasLog && (
                                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                                )}
                                {isTodayDate && !isSelected && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
                
                {/* Selected Date Details */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[100px]">
                    <div className="flex justify-between items-center mb-3">
                         <h4 className="text-xs font-bold text-gray-500 uppercase">
                             {format(selectedDate, 'M月d日')} 复习记录
                         </h4>
                         {selectedLog && (
                             <button 
                                onClick={() => onDeleteLog(selectedLog.id)}
                                className="text-rose-500 p-1 hover:bg-rose-100 rounded"
                                title="删除记录"
                             >
                                 <Trash2 size={14} />
                             </button>
                         )}
                    </div>

                    {selectedLog ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
                                {selectedLog.rating}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-800">
                                    {['未知', '重来 (Again)', '困难 (Hard)', '良好 (Good)', '简单 (Easy)'][selectedLog.rating]}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {format(selectedLog.reviewDate, 'HH:mm')} 
                                    {new Date(selectedLog.reviewDate).getHours() < 3 && <span className="ml-1 text-orange-400">(夜间)</span>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-3">当日无记录</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => handleAddLog(r as Rating)}
                                        className="py-1.5 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                                    >
                                        {['', '重来', '困难', '良好', '简单'][r]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
