
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { LogIn, LogOut, User as UserIcon, X, Loader2, Mail } from 'lucide-react';

export function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
          setIsOpen(false); // Close modal on successful login
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
            emailRedirectTo: window.location.origin, // Ensure redirection comes back here
        }
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: '登录链接已发送！请查收邮件。' });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
         <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200 shadow-sm text-sm text-gray-600">
            <UserIcon size={14} className="text-indigo-500" />
            <span className="max-w-[150px] truncate">{user.email}</span>
         </div>
         <button
            onClick={handleLogout}
            className="p-1.5 bg-white/80 backdrop-blur rounded-full border border-gray-200 shadow-sm text-gray-500 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            title="退出登录"
         >
            <LogOut size={16} />
         </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[100]">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-indigo-200 transition-all font-medium text-sm animate-in fade-in slide-in-from-top-2"
        >
          <LogIn size={16} />
          <span>登录</span>
        </button>
      )}

      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6 w-80 animate-in fade-in slide-in-from-top-4 duration-200 absolute right-0 top-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-lg">登录 / 注册</h3>
            <button 
                onClick={() => {
                    setIsOpen(false);
                    setMessage(null);
                    setEmail('');
                }} 
                className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {!message ? (
             <form onSubmit={handleLogin} className="space-y-4">
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">电子邮箱</label>
                   <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
                        required
                      />
                   </div>
                   <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
                      我们将发送一个“魔术链接”到您的邮箱，点击即可登录，无需密码。
                   </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : '发送登录链接'}
                </button>
             </form>
          ) : (
            <div className={`text-center py-4 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
               <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-3 ${message.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {message.type === 'success' ? <Mail size={20}/> : <X size={20}/>}
               </div>
               <p className="text-sm font-medium mb-2">{message.text}</p>
               {message.type === 'success' && (
                 <p className="text-xs text-gray-500 mb-4">请检查收件箱（包括垃圾邮件）。</p>
               )}
               <button
                 onClick={() => {
                    setMessage(null);
                 }}
                 className="text-xs underline text-gray-500 hover:text-gray-800"
               >
                 返回重试
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
