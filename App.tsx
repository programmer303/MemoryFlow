
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  BookOpen, 
  Settings, 
  Plus, 
  X,
  Check,
  Trash2,
  Calendar,
  SkipForward,
  Printer
} from 'lucide-react';
import { Node, Rating } from './types';
import { computeNextSchedule, formatTime } from './fsrs';
import { useTree, TreeContext } from './hooks/useTree';
import { RecursiveTreeView } from './components/Tree';
import { RatingButton } from './components/RatingButtons';
import { CalendarView } from './components/CalendarView';
import { PrintPlanModal } from './components/PrintPlanModal';

// ----------------------
// MAIN COMPONENT
// ----------------------

type ViewMode = 'dashboard' | 'review' | 'tree' | 'calendar';

export default function App() {
  const treeLogic = useTree();
  const { nodes, addNode, deleteNode } = treeLogic;

  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // State for creating new subject via Sidebar
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // Watch for active subject deletion to reset view
  useEffect(() => {
    if (activeSubjectId && !nodes[activeSubjectId]) {
      setActiveSubjectId(null);
      setActiveView('dashboard');
    }
  }, [nodes, activeSubjectId]);

  // Derived State
  const rootSubjects = (nodes['root']?.children || []).map(id => nodes[id]).filter(Boolean);

  const reviewQueue = useMemo(() => {
    const now = Date.now();
    return (Object.values(nodes) as Node[]).filter(node => 
      node.parentId !== null && 
      node.fsrs.state !== 'suspended' &&
      node.fsrs.due <= now
    ).sort((a, b) => a.fsrs.due - b.fsrs.due);
  }, [nodes]);

  const handleCreateSubject = () => {
    if (newSubjectName.trim()) {
      addNode('root', newSubjectName, 'store');
      setNewSubjectName("");
      setIsAddingSubject(false);
    }
  };

  return (
    <TreeContext.Provider value={treeLogic}>
      <div className="flex h-screen bg-gray-50 text-slate-800 font-sans">
        
        {/* Modal Portal */}
        {showPrintModal && (
            <PrintPlanModal 
                nodes={nodes} 
                onClose={() => setShowPrintModal(false)} 
            />
        )}

        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              MemoryFlow
            </h1>
            <p className="text-xs text-gray-400 mt-1">无限层级复习规划器</p>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <SidebarItem 
              icon={<LayoutDashboard size={18} />} 
              label="首页" 
              isActive={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
            />
            <SidebarItem 
              icon={<ListTodo size={18} />} 
              label="今日复习" 
              badge={reviewQueue.length}
              isActive={activeView === 'review'}
              onClick={() => setActiveView('review')}
              highlight={reviewQueue.length > 0}
            />
             <SidebarItem 
              icon={<Calendar size={18} />} 
              label="日程预测" 
              isActive={activeView === 'calendar'}
              onClick={() => setActiveView('calendar')}
            />
            <SidebarItem 
              icon={<Printer size={18} />} 
              label="打印计划" 
              isActive={false} // Always false as it triggers modal
              onClick={() => setShowPrintModal(true)}
            />

            <div className="mt-8 mb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              科目列表
            </div>
            
            <div className="space-y-1">
              {rootSubjects.map(subject => (
                <SidebarItem 
                  key={subject.id}
                  icon={<BookOpen size={18} />} 
                  label={subject.title} 
                  isActive={activeView === 'tree' && activeSubjectId === subject.id}
                  onClick={() => {
                    setActiveView('tree');
                    setActiveSubjectId(subject.id);
                  }}
                  onDelete={() => deleteNode(subject.id)}
                />
              ))}
              
              {isAddingSubject ? (
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-indigo-100">
                  <input
                    autoFocus
                    type="text"
                    className="w-full text-sm bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-2"
                    placeholder="输入科目名称..."
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSubject();
                      if (e.key === 'Escape') {
                        setIsAddingSubject(false);
                        setNewSubjectName("");
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsAddingSubject(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
                    >
                      <X size={14} />
                    </button>
                    <button 
                      onClick={handleCreateSubject}
                      className="p-1 text-indigo-600 hover:text-indigo-700 rounded hover:bg-indigo-100"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ) : (
              <button 
                className="w-full flex items-center px-2 py-2 text-sm text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors rounded-lg hover:bg-gray-50"
                onClick={() => setIsAddingSubject(true)}
              >
                <Plus size={16} className="mr-3" />
                <span>新建科目...</span>
              </button>
              )}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <SidebarItem 
              icon={<Settings size={18} />} 
              label="设置" 
              onClick={() => console.log("设置功能暂未开发")}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {activeView === 'dashboard' && (
            <Dashboard 
              totalNodes={Object.keys(nodes).length - 1} 
              reviewCount={reviewQueue.length} 
              onReviewClick={() => setActiveView('review')}
            />
          )}
          
          {activeView === 'review' && (
            <ReviewSession 
              queue={reviewQueue} 
              onExit={() => setActiveView('dashboard')}
              reviewComplete={treeLogic.reviewComplete}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView />
          )}

          {activeView === 'tree' && activeSubjectId && nodes[activeSubjectId] && (
            <RecursiveTreeView rootId={activeSubjectId} />
          )}
        </main>
      </div>
    </TreeContext.Provider>
  );
}

// ----------------------
// SUB-COMPONENTS
// ----------------------

function SidebarItem({ icon, label, badge, isActive, onClick, highlight, onDelete }: any) {
  return (
    <div
      onClick={onClick}
      className={`group w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 cursor-pointer ${
        isActive 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center overflow-hidden">
        <span className={`${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{icon}</span>
        <span className="ml-3 truncate">{label}</span>
      </div>

      <div className="flex items-center">
        {onDelete && (
           <button 
             type="button"
             onClick={(e) => { 
               e.stopPropagation();
               e.nativeEvent.stopImmediatePropagation();
               onDelete(); 
             }}
             className="mr-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 transition-opacity p-1.5 rounded hover:bg-rose-50 relative z-50"
             title="删除科目"
           >
             <Trash2 size={14} />
           </button>
        )}
        
        {badge !== undefined && (
          <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full ${
            highlight 
              ? 'bg-rose-100 text-rose-600' 
              : 'bg-gray-100 text-gray-500'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function Dashboard({ totalNodes, reviewCount, onReviewClick }: any) {
  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">仪表盘</h2>
        <p className="text-gray-500 mt-2">欢迎回来，保持您的记忆心流。</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">待复习队列</h3>
            <div className={`w-3 h-3 rounded-full ${reviewCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-green-500'}`} />
          </div>
          <div className="text-4xl font-bold text-slate-900 mb-2">{reviewCount}</div>
          <p className="text-sm text-gray-500 mb-6">今日需复习的项目。</p>
          <button 
            onClick={onReviewClick}
            disabled={reviewCount === 0}
            className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
              reviewCount > 0 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {reviewCount > 0 ? '开始复习' : '全部完成'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">知识库总览</h3>
          <div className="text-4xl font-bold text-slate-900 mb-2">{totalNodes}</div>
          <p className="text-sm text-gray-500">无限层级树中存储的节点总数。</p>
        </div>
      </div>
    </div>
  );
}

function ReviewSession({ queue, onExit, reviewComplete }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // If queue finished
  if (currentIndex >= queue.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white text-center p-8 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
          <ListTodo size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">本轮复习完成！</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          您已完成所有待复习项目。保持这种流畅的状态！
        </p>
        <button 
          onClick={onExit}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
        >
          返回首页
        </button>
      </div>
    );
  }

  const currentNode = queue[currentIndex];
  
  // Calculate potential schedules for buttons
  const ratings: Rating[] = [1, 2, 3, 4];
  const schedules = ratings.map(r => computeNextSchedule(currentNode.fsrs, r, Date.now()));

  const handleRate = (rating: Rating, schedule: any) => {
    reviewComplete(currentNode.id, schedule.s, schedule.d, schedule.interval, rating);
    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="px-6 py-4 flex justify-between items-center text-sm text-gray-500 bg-white border-b border-gray-200">
        <button onClick={onExit} className="hover:text-gray-800">退出</button>
        <div className="font-mono">
          {currentIndex + 1} / {queue.length}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
          
          {/* Question / Topic */}
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <h3 className="text-gray-400 text-sm uppercase tracking-widest font-semibold mb-6">当前任务</h3>
            <h1 className="text-3xl font-bold text-slate-800 leading-tight">
              {currentNode.title}
            </h1>
          </div>

          {/* Reveal / Action Area */}
          <div className="bg-gray-50 border-t border-gray-100 p-8">
            {!showAnswer ? (
              <div className="flex gap-4">
                  <button 
                    onClick={handleSkip}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-semibold text-lg hover:bg-gray-200 hover:text-gray-700 transition-all flex items-center justify-center gap-2"
                  >
                    <SkipForward size={20} />
                    <span>暂不复习</span>
                  </button>
                  <button 
                    onClick={() => setShowAnswer(true)}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                  >
                    完成复习 (显示评分)
                  </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                    <RatingButton 
                    label="重来" 
                    time={formatTime(schedules[0].interval)} 
                    color="bg-rose-100 text-rose-700 hover:bg-rose-200"
                    onClick={() => handleRate(1, schedules[0])}
                    />
                    <RatingButton 
                    label="困难" 
                    time={formatTime(schedules[1].interval)} 
                    color="bg-orange-100 text-orange-700 hover:bg-orange-200"
                    onClick={() => handleRate(2, schedules[1])}
                    />
                    <RatingButton 
                    label="良好" 
                    time={formatTime(schedules[2].interval)} 
                    color="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    onClick={() => handleRate(3, schedules[2])}
                    />
                    <RatingButton 
                    label="简单" 
                    time={formatTime(schedules[3].interval)} 
                    color="bg-sky-100 text-sky-700 hover:bg-sky-200"
                    onClick={() => handleRate(4, schedules[3])}
                    />
                </div>
                <button 
                    onClick={handleSkip}
                    className="w-full py-2 text-sm text-gray-400 font-medium hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <SkipForward size={14} />
                    <span>暂不复习 (跳过)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
