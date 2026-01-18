
import React, { useMemo, useState, useRef } from 'react';
import { X, Printer, BrainCircuit, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format, addDays, endOfDay, isSameDay, isToday, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import { Node, NodeMap } from '../types';
import { currentRetrievability } from '../fsrs';

interface PrintPlanModalProps {
  nodes: NodeMap;
  onClose: () => void;
}

interface PrioritizedItem {
  node: Node;
  rootSubject: string;
  retrievability: number;
  priorityScore: number;
}

export function PrintPlanModal({ nodes, onClose }: PrintPlanModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Initialize targetDate based on the 3AM logic
  const [targetDate, setTargetDate] = useState<Date>(() => {
    const now = new Date();
    // If between 00:00 and 03:00, default to 'Today'
    if (now.getHours() < 3) return now;
    // Otherwise default to 'Tomorrow'
    return addDays(now, 1);
  });

  // Generate next 7 days for selector
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    // Allow going back 1 day (yesterday) just in case, and forward 7 days
    for (let i = -1; i < 7; i++) {
        dates.push(addDays(today, i));
    }
    return dates;
  }, []);

  // 1. Logic to group and prioritize items based on TARGET DATE
  const planData = useMemo(() => {
    const targetTime = endOfDay(targetDate).getTime();
    const items: PrioritizedItem[] = [];

    // Helper: Find the root subject (child of 'root') for a node
    const getRootSubject = (nodeId: string): string => {
        let curr = nodes[nodeId];
        while(curr && curr.parentId !== 'root' && curr.parentId !== null) {
            curr = nodes[curr.parentId];
        }
        return curr ? curr.title : '其他';
    };

    // Filter Review Queue
    Object.values(nodes).forEach(node => {
        if (
            node.parentId !== null && 
            node.fsrs.state !== 'suspended' &&
            node.fsrs.due <= targetTime // Check against selected date
        ) {
            // Calculate Retrievability (R)
            let r = 0;
            // For R calculation, we assume the review happens at the target date
            // This helps prioritize what will be most urgent THEN.
            if (node.fsrs.lastReview === 0) {
                r = 0;
            } else {
                const elapsedDays = (targetTime - node.fsrs.lastReview) / (1000 * 60 * 60 * 24);
                r = currentRetrievability(node.fsrs.s, elapsedDays);
            }

            // Calculate Priority Score
            const priorityScore = node.fsrs.d * (1 - r);

            items.push({
                node,
                rootSubject: getRootSubject(node.id),
                retrievability: r,
                priorityScore
            });
        }
    });

    // Sort by Priority Descending
    items.sort((a, b) => b.priorityScore - a.priorityScore);

    // Group by Subject
    const grouped: Record<string, PrioritizedItem[]> = {};
    items.forEach(item => {
        if (!grouped[item.rootSubject]) grouped[item.rootSubject] = [];
        grouped[item.rootSubject].push(item);
    });

    return grouped;
  }, [nodes, targetDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportImage = async () => {
    if (printRef.current === null) return;
    
    try {
        setIsGeneratingImage(true);
        // Using a slightly larger pixel ratio for better quality
        const dataUrl = await toPng(printRef.current, { 
            cacheBust: true, 
            backgroundColor: '#ffffff',
            pixelRatio: 2 
        });
        
        const link = document.createElement('a');
        link.download = `MemoryFlow_Plan_${format(targetDate, 'yyyy-MM-dd')}.png`;
        link.href = dataUrl;
        link.click();
    } catch (err) {
        console.error('Failed to generate image', err);
        alert('图片生成失败，请重试或使用打印功能。');
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const subjectKeys = Object.keys(planData);
  const totalItems = Object.values(planData).reduce((acc: number, curr: PrioritizedItem[]) => acc + curr.length, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:block">
      {/* Strict Print Styles Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-content, #printable-content * {
            visibility: visible;
          }
          #printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
            box-shadow: none !important;
          }
          /* Ensure colors are printed */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide scrollbars during print */
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>

      <div className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden print:h-auto print:shadow-none print:w-full print:max-w-none print:rounded-none print:bg-white print:overflow-visible">
        
        {/* Toolbar (Hidden on Print) */}
        <div className="p-4 bg-white border-b border-gray-200 flex flex-col gap-4 print:hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-700">
                <BrainCircuit className="text-indigo-600" />
                <span className="font-bold">每日复习规划</span>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleExportImage}
                    disabled={isGeneratingImage}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
                >
                    {isGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                    保存图片
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm text-sm"
                    title="使用浏览器打印功能，选择'另存为 PDF'"
                >
                    <Printer size={16} />
                    打印 / PDF
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
          </div>

          {/* Date Selector Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
             {availableDates.map(date => {
                 const isSelected = isSameDay(date, targetDate);
                 let label = format(date, 'd');
                 if (isToday(date)) label = '今天';
                 if (isTomorrow(date)) label = '明天';
                 
                 return (
                     <button
                        key={date.toString()}
                        onClick={() => setTargetDate(date)}
                        className={`
                            flex flex-col items-center justify-center min-w-[3rem] py-1.5 rounded-lg border text-xs transition-all flex-shrink-0
                            ${isSelected 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}
                        `}
                     >
                        <span className="font-bold">{label}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                            {format(date, 'EEE', { locale: zhCN })}
                        </span>
                     </button>
                 )
             })}
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-8 print:overflow-visible print:p-0 bg-gray-100 print:bg-white">
           <div 
                id="printable-content"
                ref={printRef}
                className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-[15mm] print:shadow-none print:max-w-none print:w-full print:min-h-0 print:p-[10mm]"
            >
                
                {/* Document Header */}
                <div className="border-b-2 border-indigo-900 pb-4 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">每日复习计划</h1>
                        <p className="text-sm text-gray-500">MemoryFlow 智能生成 | 纸质评分表</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-indigo-600">
                            {format(targetDate, 'yyyy/MM/dd')}
                        </div>
                        <div className="text-sm text-gray-400 font-medium">
                            {format(targetDate, 'EEEE', { locale: zhCN })} | 待复习: {totalItems} 项
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex justify-between items-center mb-6 text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-100 print:bg-transparent print:border-none print:p-0">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            高优
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                            中优
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            普通
                        </span>
                    </div>
                    <div className="print:hidden text-[10px] text-gray-400">
                        * 使用“保存图片”或“打印 > 另存为 PDF”导出
                    </div>
                </div>

                {/* Content List */}
                {totalItems === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
                        <p>该日期前暂无待复习任务。</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {subjectKeys.map(subject => (
                            <div key={subject} className="break-inside-avoid">
                                <h2 className="text-base font-bold text-indigo-900 border-b border-indigo-100 pb-1 mb-3 flex items-center justify-between">
                                    {subject}
                                    <span className="text-xs font-normal text-gray-400">
                                        {planData[subject].length} 项
                                    </span>
                                </h2>
                                
                                <div className="grid grid-cols-1 gap-0">
                                    {planData[subject].map((item, idx) => {
                                        // Determine visual urgency
                                        let dotColor = 'bg-emerald-400';
                                        if (item.priorityScore > 4) dotColor = 'bg-rose-500';
                                        else if (item.priorityScore > 2) dotColor = 'bg-orange-400';

                                        return (
                                            <div 
                                                key={item.node.id} 
                                                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm print:py-1.5"
                                            >
                                                <div className="flex items-center gap-3 flex-1 mr-4 overflow-hidden">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`}></span>
                                                    <span className="font-medium text-gray-800 truncate leading-tight">{item.node.title}</span>
                                                </div>
                                                
                                                <div className="flex items-center flex-shrink-0">
                                                    {/* Screen Only: Stats */}
                                                    <div className="hidden sm:flex print:hidden items-center gap-3 text-xs font-mono text-gray-400 mr-4">
                                                        <span title="难度">D:{item.node.fsrs.d.toFixed(1)}</span>
                                                        <span title="稳定性">S:{item.node.fsrs.s.toFixed(1)}</span>
                                                        <span title="保留率" className="font-bold text-gray-500">R:{(item.retrievability * 100).toFixed(0)}%</span>
                                                    </div>

                                                    {/* Print & Preview: Rating Checkboxes */}
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        {['重来', '困难', '良好', '简单'].map((label, i) => (
                                                            <div key={label} className="flex flex-col items-center justify-center w-8">
                                                                <div className="w-3.5 h-3.5 border border-gray-300 rounded-sm mb-1 bg-white shadow-sm"></div>
                                                                <span className="text-[8px] text-gray-500 font-medium leading-none">
                                                                    {label}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 font-mono">
                     <span>Generated by MemoryFlow</span>
                     <span>Keep flowing, keep growing.</span>
                </div>

           </div>
        </div>
      </div>
    </div>
  );
}
