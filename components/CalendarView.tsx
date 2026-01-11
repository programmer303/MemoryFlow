
import React, { useMemo, useState } from 'react';
import { format, isToday, isTomorrow, parseISO, compareAsc } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Layers } from 'lucide-react';
import { useTreeContext } from '../hooks/useTree';
import { generateReviewSchedule } from '../utils/scheduler';
import { ReviewType, CalendarEvent } from '../types';

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const isConfirmed = event.type === 'confirmed';

  return (
    <div 
      className={`
        relative p-3 rounded-lg border text-sm transition-all hover:shadow-md
        ${isConfirmed 
          ? 'bg-white border-indigo-100 shadow-sm' 
          : 'bg-slate-50 border-dashed border-slate-300 opacity-80'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`font-medium truncate ${isConfirmed ? 'text-slate-800' : 'text-slate-600'}`}>
          {event.title}
        </span>
        {isConfirmed ? (
           <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" title="已确定复习" />
        ) : (
           <span className="flex-shrink-0 w-2 h-2 rounded-full border border-slate-400 mt-1.5" title="预测复习 (基于假设)" />
        )}
      </div>
      
      <div className="mt-2 flex items-center text-xs text-gray-400 gap-2">
        {isConfirmed ? (
          <span className="flex items-center gap-1 text-indigo-500 font-medium">
            <Clock size={10} />
            待复习
          </span>
        ) : (
          <span className="flex items-center gap-1">
             <Layers size={10} />
             预测间隔: {event.predictedInterval}天
          </span>
        )}
      </div>
    </div>
  );
};

export function CalendarView() {
  const { nodes } = useTreeContext();
  const [range, setRange] = useState<number>(14); // Default 14 days

  // Compute schedule only when nodes or range changes
  const scheduleMap = useMemo(() => {
    return generateReviewSchedule(nodes, range);
  }, [nodes, range]);

  // Sort dates
  const sortedDates = useMemo(() => {
    return Object.keys(scheduleMap).sort((a, b) => compareAsc(parseISO(a), parseISO(b)));
  }, [scheduleMap]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-indigo-500" size={24} />
          复习日程表
        </h2>
        
        <div className="flex items-center gap-1">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setRange(days)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                range === days 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              未来 {days} 天
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {sortedDates.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Layers size={48} className="mx-auto mb-4 opacity-20" />
              <p>未来 {range} 天内暂无复习计划</p>
            </div>
          ) : (
            sortedDates.map(dateStr => {
              const events = scheduleMap[dateStr];
              const dateObj = parseISO(dateStr);
              
              let label = format(dateObj, 'M月d日 EEEE', { locale: zhCN });
              if (isToday(dateObj)) label += ' (今天)';
              if (isTomorrow(dateObj)) label += ' (明天)';

              return (
                <div key={dateStr} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                      {label}
                    </h3>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {events.map((event, idx) => (
                      <EventCard key={`${event.nodeId}-${idx}`} event={event} />
                    ))}
                  </div>
                </div>
              );
            })
          )}

        </div>
      </div>
    </div>
  );
}
