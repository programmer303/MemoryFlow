
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
  ChevronRight,
  User
} from 'lucide-react';
import { Node } from './types';
import { useTree, TreeContext, useTreeContext } from './hooks/useTree';
import { RecursiveTreeView } from './components/Tree';
import { CalendarView } from './components/CalendarView';
import { PrintPlanModal } from './components/PrintPlanModal';
import { ReviewDeck } from './components/ReviewDeck';
import { Login } from './components/Login';

// ----------------------
// MAIN COMPONENT
// ----------------------

// Added 'subjects' and 'settings' for explicit mobile navigation states
type ViewMode = 'dashboard' | 'review' | 'tree' | 'calendar' | 'subjects' | 'settings';

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
      // If we were in tree view, go back to dashboard or subjects list
      if (activeView === 'tree') {
          // On mobile, maybe go back to subjects list? 
          // For now default to dashboard safely.
          setActiveView('dashboard');
      }
    }
  }, [nodes, activeSubjectId, activeView]);

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

  // When switching subjects from the mobile header
  const handleMobileSubjectChange = (id: string) => {
      setActiveSubjectId(id);
      setActiveView('tree');
  };

  return (
    <TreeContext.Provider value={treeLogic}>
      <div className="flex h-screen bg-gray-50 text-slate-800 font-sans relative">
        
        {/* Auth Floating Widget */}
        <Login />

        {/* Modal Portal */}
        {showPrintModal && (
            <PrintPlanModal 
                nodes={nodes} 
                onClose={() => setShowPrintModal(false)} 
            />
        )}

        {/* Sidebar - HIDDEN ON MOBILE */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0">
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

        {/* Main Content Area - Added pb-20 for Mobile Nav */}
        <main className="flex-1 flex flex-col min-w-0 bg-white pb-20 md:pb-0">
          {activeView === 'dashboard' && (
            <Dashboard 
              totalNodes={Object.keys(nodes).length - 1} 
              reviewCount={reviewQueue.length} 
              onReviewClick={() => setActiveView('review')}
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

          {activeView === 'tree' && activeSubjectId && nodes[activeSubjectId] && (
            <RecursiveTreeView 
                rootId={activeSubjectId} 
                onSubjectChange={handleMobileSubjectChange}
            />
          )}

          {/* Mobile Only: Subjects List */}
          {activeView === 'subjects' && (
              <MobileSubjectsList 
                subjects={rootSubjects}
                onSelect={(id) => {
                    setActiveSubjectId(id);
                    setActiveView('tree');
                }}
              />
          )}

          {/* Mobile Only: Settings Placeholder */}
          {activeView === 'settings' && (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                      <Settings size={48} className="mx-auto mb-4 opacity-20" />
                      <p>设置功能暂未开发</p>
                  </div>
              </div>
          )}
        </main>

        {/* Mobile Bottom Navigation - 5 Columns */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center z-50 pb-safe">
            <MobileNavItem 
                icon={<LayoutDashboard size={20} />} 
                label="首页" 
                isActive={activeView === 'dashboard'} 
                onClick={() => setActiveView('dashboard')} 
            />
            <MobileNavItem 
                icon={<ListTodo size={20} />} 
                label="今日复习" 
                isActive={activeView === 'review'} 
                onClick={() => setActiveView('review')} 
                badge={reviewQueue.length > 0 ? reviewQueue.length : undefined}
            />
            <MobileNavItem 
                icon={<Calendar size={20} />} 
                label="日程预测" 
                isActive={activeView === 'calendar'} 
                onClick={() => setActiveView('calendar')} 
            />
            <MobileNavItem 
                icon={<BookOpen size={20} />} 
                label="科目列表" 
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
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${
                isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
            <div className="relative">
                {icon}
                {badge && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[14px] flex justify-center">
                        {badge}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    )
}

function MobileSubjectsList({ subjects, onSelect }: { subjects: Node[], onSelect: (id: string) => void }) {
    const { addNode, deleteNode } = useTreeContext();
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
        <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">科目列表</h2>
            <div className="space-y-3">
                {subjects.map(sub => (
                    <div 
                        key={sub.id}
                        onClick={() => onSelect(sub.id)}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:scale-95 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">{sub.title}</div>
                                <div className="text-xs text-gray-400">{sub.children.length} 个子项</div>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </div>
                ))}
            </div>

            {isAdding ? (
                 <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                     <input 
                        autoFocus
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-3"
                        placeholder="科目名称..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                     />
                     <div className="flex gap-2">
                         <button 
                            onClick={() => setIsAdding(false)}
                            className="flex-1 py-2 text-gray-500 bg-white border border-gray-200 rounded-lg text-sm"
                         >
                             取消
                         </button>
                         <button 
                            onClick={handleCreate}
                            className="flex-1 py-2 text-white bg-indigo-600 rounded-lg text-sm font-bold"
                         >
                             创建
                         </button>
                     </div>
                 </div>
            ) : (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 text-gray-400 rounded-xl font-medium flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                >
                    <Plus size={18} />
                    新建科目
                </button>
            )}
        </div>
    )
}

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
