
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
  Printer,
  ChevronRight
} from 'lucide-react';
import { Node } from './types';
import { useTree, TreeContext, useTreeContext } from './hooks/useTree';
import { RecursiveTreeView } from './components/Tree';
import { CalendarView } from './components/CalendarView';
import { PrintPlanView } from './components/PrintPlanModal';
import { ReviewDeck } from './components/ReviewDeck';
import { Login } from './components/Login';

// ----------------------
// MAIN COMPONENT
// ----------------------

type ViewMode = 'dashboard' | 'review' | 'tree' | 'calendar' | 'subjects' | 'settings' | 'print';

export default function App() {
  const treeLogic = useTree();
  const { nodes, addNode, deleteNode } = treeLogic;

  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  
  // State for creating new subject via Sidebar
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  useEffect(() => {
    if (activeSubjectId && !nodes[activeSubjectId]) {
      setActiveSubjectId(null);
      if (activeView === 'tree') {
          setActiveView('dashboard');
      }
    }
  }, [nodes, activeSubjectId, activeView]);

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

  const handleMobileSubjectChange = (id: string) => {
      setActiveSubjectId(id);
      setActiveView('tree');
  };

  return (
    <TreeContext.Provider value={treeLogic}>
      {/* Root Container: Flex Column on Mobile, Row on Desktop. No scrolling on body. */}
      <div className="flex h-screen w-screen bg-gray-50 text-slate-800 font-sans overflow-hidden">
        
        {/* 1. SIDEBAR (Desktop Only) */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0 z-20">
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 whitespace-nowrap">
              MemoryFlow
            </h1>
            <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">无限层级复习规划器</p>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
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
              isActive={activeView === 'print'}
              onClick={() => setActiveView('print')}
            />

            <div className="mt-8 mb-2 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
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
              
              {/* Add Subject Input (Sidebar) */}
              {isAddingSubject ? (
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-indigo-100">
                  <input
                    autoFocus
                    type="text"
                    className="w-full text-sm bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 mb-2"
                    placeholder="科目名称..."
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSubject();
                      if (e.key === 'Escape') setIsAddingSubject(false);
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsAddingSubject(false)} className="p-1 text-gray-400 hover:bg-gray-200 rounded"><X size={14} /></button>
                    <button onClick={handleCreateSubject} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded"><Check size={14} /></button>
                  </div>
                </div>
              ) : (
                <button 
                  className="w-full flex items-center px-2 py-2 text-sm text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => setIsAddingSubject(true)}
                >
                  <Plus size={16} className="mr-3" />
                  <span>新建科目...</span>
                </button>
              )}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200">
             {/* New Login Component Location for Desktop */}
             <Login mode="sidebar" />
          </div>
        </aside>

        {/* 2. MAIN CONTENT COLUMN (Flex vertical) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            
            {/* A. GLOBAL HEADER (Mobile: Title+Login, Desktop: Login hidden) */}
            <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30">
                {/* Left Side: Title on Mobile, Spacer on Desktop */}
                <div className="flex items-center gap-2">
                    <div className="md:hidden font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 whitespace-nowrap">
                        MemoryFlow
                    </div>
                </div>

                {/* Right Side: Login Component - Only visible on Mobile now */}
                <div className="md:hidden">
                    <Login mode="mobile" />
                </div>
            </header>

            {/* B. VIEWPORT (Scrollable Area) */}
            {/* flex-1 ensures it fills space between Header and Footer */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                
                {/* Scenario 1: Views that handle their own scrolling */}
                {/* These components are designed to be h-full and flex-col inside */}
                {activeView === 'tree' && activeSubjectId && nodes[activeSubjectId] && (
                    <RecursiveTreeView 
                        rootId={activeSubjectId} 
                        onSubjectChange={handleMobileSubjectChange}
                    />
                )}
                
                {activeView === 'review' && (
                    <ReviewDeck 
                        queue={reviewQueue} 
                        onExit={() => setActiveView('dashboard')}
                        onReviewComplete={treeLogic.reviewComplete}
                    />
                )}

                {activeView === 'calendar' && (
                    <CalendarView />
                )}

                {activeView === 'print' && (
                    <PrintPlanView nodes={nodes} />
                )}

                {/* Scenario 2: Views that need a scroll wrapper (Dashboard, Lists) */}
                {activeView === 'dashboard' && (
                    <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <Dashboard 
                            totalNodes={Object.keys(nodes).length - 1} 
                            reviewCount={reviewQueue.length} 
                            onReviewClick={() => setActiveView('review')}
                        />
                    </div>
                )}

                {activeView === 'subjects' && (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar">
                        <MobileSubjectsList 
                            subjects={rootSubjects}
                            onSelect={(id) => {
                                setActiveSubjectId(id);
                                setActiveView('tree');
                            }}
                        />
                    </div>
                )}

                {activeView === 'settings' && (
                    <div className="h-full flex items-center justify-center text-gray-400">
                         <div className="text-center">
                            <Settings size={48} className="mx-auto mb-4 opacity-20" />
                            <p>设置功能暂未开发</p>
                        </div>
                    </div>
                )}

            </main>

            {/* C. BOTTOM NAV (Mobile Only) */}
            {/* It is a flex item, not absolute/fixed, so it claims space legitimately */}
            <nav className="md:hidden flex-shrink-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center z-30 pb-safe">
                <MobileNavItem 
                    icon={<LayoutDashboard size={20} />} 
                    label="首页" 
                    isActive={activeView === 'dashboard'} 
                    onClick={() => setActiveView('dashboard')} 
                />
                <MobileNavItem 
                    icon={<ListTodo size={20} />} 
                    label="复习" 
                    isActive={activeView === 'review'} 
                    onClick={() => setActiveView('review')} 
                    badge={reviewQueue.length > 0 ? reviewQueue.length : undefined}
                />
                <MobileNavItem 
                    icon={<Calendar size={20} />} 
                    label="日程" 
                    isActive={activeView === 'calendar'} 
                    onClick={() => setActiveView('calendar')} 
                />
                <MobileNavItem 
                    icon={<BookOpen size={20} />} 
                    label="科目" 
                    isActive={activeView === 'subjects' || activeView === 'tree'} 
                    onClick={() => setActiveView('subjects')} 
                />
                <MobileNavItem 
                    icon={<Settings size={20} />} 
                    label="设置" 
                    isActive={activeView === 'settings'} 
                    onClick={() => setActiveView('settings')} 
                />
            </nav>
        </div>
      </div>
    </TreeContext.Provider>
  );
}

// ----------------------
// SUB-COMPONENTS
// ----------------------

function MobileNavItem({ icon, label, isActive, onClick, badge }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative min-w-[60px] active:bg-gray-50 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-400'
            }`}
        >
            <div className="relative">
                {icon}
                {badge && (
                    <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] shadow-sm">
                        {badge}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
        </button>
    )
}

function MobileSubjectsList({ subjects, onSelect }: { subjects: Node[], onSelect: (id: string) => void }) {
    const { addNode } = useTreeContext();
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState("");

    const handleCreate = () => {
        if(name.trim()) {
            addNode('root', name, 'store');
            setName("");
            setIsAdding(false);
        }
    };

    return (
        <div className="p-4 pb-24">
            <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">我的科目</h2>
            <div className="space-y-3">
                {subjects.map(sub => (
                    <div 
                        key={sub.id}
                        onClick={() => onSelect(sub.id)}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                                <BookOpen size={24} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-gray-800 text-lg truncate">{sub.title}</div>
                                <div className="text-sm text-gray-400 truncate">{sub.children.length} 个子项</div>
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-300 shrink-0" />
                    </div>
                ))}
            </div>

            {isAdding ? (
                 <div className="mt-4 bg-white p-4 rounded-2xl border border-indigo-100 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                     <input 
                        autoFocus
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none mb-3"
                        placeholder="输入科目名称..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                     />
                     <div className="flex gap-3">
                         <button 
                            onClick={() => setIsAdding(false)}
                            className="flex-1 py-3 text-gray-500 bg-gray-100 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                         >
                             取消
                         </button>
                         <button 
                            onClick={handleCreate}
                            className="flex-1 py-3 text-white bg-indigo-600 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 active:scale-95 transition-transform"
                         >
                             创建
                         </button>
                     </div>
                 </div>
            ) : (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 text-gray-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    添加新科目
                </button>
            )}
        </div>
    )
}

function SidebarItem({ icon, label, badge, isActive, onClick, highlight, onDelete }: any) {
  return (
    <div
      onClick={onClick}
      className={`group w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 cursor-pointer mb-0.5 ${
        isActive 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <span className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{icon}</span>
        <span className="truncate whitespace-nowrap">{label}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onDelete && (
           <button 
             type="button"
             onClick={(e) => { 
               e.stopPropagation();
               onDelete(); 
             }}
             className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 transition-opacity p-1 rounded hover:bg-rose-50"
             title="删除"
           >
             <Trash2 size={14} />
           </button>
        )}
        
        {badge !== undefined && (
          <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full ${
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
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full pb-24">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">仪表盘</h2>
        <p className="text-gray-500 mt-2 font-medium">欢迎回来，保持您的记忆心流。</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Review Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <ListTodo className="text-indigo-500" />
                待复习队列
            </h3>
            {reviewCount > 0 && <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-pulse" />}
          </div>
          
          <div className="flex items-baseline gap-2 mb-2">
             <span className="text-5xl font-black text-slate-900 tracking-tight">{reviewCount}</span>
             <span className="text-sm text-gray-500 font-medium">个项目</span>
          </div>
          
          <p className="text-sm text-gray-400 mb-8 line-clamp-1">需要您今日关注的记忆节点。</p>
          
          <button 
            onClick={onReviewClick}
            disabled={reviewCount === 0}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all active:scale-95 shadow-lg ${
              reviewCount > 0 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {reviewCount > 0 ? '开始今日复习' : '今日已完成'}
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                <BookOpen className="text-emerald-500" />
                知识库概览
            </h3>
            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-slate-900 tracking-tight">{totalNodes}</span>
                <span className="text-sm text-gray-500 font-medium">个节点</span>
            </div>
            <p className="text-sm text-gray-400">无限层级树中存储的总知识点。</p>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-50">
             <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">MemoryFlow Pro</div>
          </div>
        </div>
      </div>
    </div>
  );
}
