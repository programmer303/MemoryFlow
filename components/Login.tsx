
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { LogIn, LogOut, X, Loader2, Mail, Zap, Sparkles, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  mode?: 'sidebar' | 'mobile';
}

type AuthStep = 'email' | 'otp';

export function Login({ mode = 'mobile' }: LoginProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // Auth Flow State
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
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
          handleClose();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Delay reset to allow animation to finish
    setTimeout(() => {
        setStep('email');
        setMessage(null);
        setOtp('');
        setEmail('');
    }, 300);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({ 
        email,
        // options: { shouldCreateUser: true } // Default
    });

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setStep('otp');
      setMessage({ type: 'success', text: '验证码已发送' });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
    });

    setLoading(false);

    if (error) {
        setMessage({ type: 'error', text: '验证码错误或已失效，请重试。' });
    } else {
        // Success handled by onAuthStateChange listener
        setMessage({ type: 'success', text: '验证成功，正在登录...' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- RENDER HELPERS ---

  const renderModal = () => {
    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-in fade-in duration-300" 
            onClick={handleClose} 
        />
        
        {/* iOS 26 Card Style */}
        <div className="relative w-full max-w-[360px] bg-white/90 backdrop-blur-2xl rounded-[36px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] p-8 overflow-hidden animate-in zoom-in-95 duration-300 border border-white/50">
          
          <button 
              onClick={handleClose} 
              className="absolute top-5 right-5 p-2 bg-gray-100/50 hover:bg-gray-200/80 rounded-full text-gray-500 transition-colors z-20"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center relative z-10">
            {/* Header Icon based on Step */}
            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center justify-center mb-6 text-indigo-600 border border-indigo-50 transition-all duration-300">
                {step === 'email' ? (
                     <Sparkles size={28} fill="currentColor" className="opacity-90" />
                ) : (
                     <KeyRound size={28} className="opacity-90" />
                )}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight transition-all">
                {step === 'email' ? '欢迎回来' : '输入验证码'}
            </h3>
            <p className="text-sm text-gray-500 font-medium mb-8 text-center px-4 leading-relaxed h-10">
               {step === 'email' 
                  ? '登录 MemoryFlow 以同步您的记忆网络。' 
                  : `已发送验证码至 ${email}`
               }
            </p>

            {/* Error/Success Message Bubble */}
            {message && (
                <div className={`mb-4 w-full p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={14} /> : <X size={14} />}
                    {message.text}
                </div>
            )}

            {/* Form Steps */}
            <div className="w-full">
              {step === 'email' ? (
                 <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                            <Mail size={20} />
                        </div>
                        <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="输入您的邮箱"
                        className="w-full pl-12 pr-4 h-14 bg-gray-100/80 hover:bg-gray-100 focus:bg-white border-none rounded-2xl outline-none text-base font-medium transition-all text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                        required
                        autoFocus
                        />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-14 bg-[#111] text-white rounded-2xl font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-gray-200"
                    >
                      {loading ? <Loader2 size={20} className="animate-spin" /> : (
                        <>
                          <span>获取验证码</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                 </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative group">
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                                // Only allow numbers and max 8 chars
                                const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                setOtp(val);
                            }}
                            placeholder="000000"
                            className="w-full h-14 bg-gray-100/80 hover:bg-gray-100 focus:bg-white border-none rounded-2xl outline-none text-2xl font-bold tracking-[0.2em] text-center transition-all text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold text-base hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-indigo-200"
                    >
                      {loading ? <Loader2 size={20} className="animate-spin" /> : (
                        <>
                          <span>验证并登录</span>
                          <CheckCircle2 size={18} />
                        </>
                      )}
                    </button>
                    
                    <div className="text-center">
                        <button 
                            type="button"
                            onClick={() => {
                                setStep('email');
                                setMessage(null);
                                setOtp('');
                            }}
                            className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors py-2"
                        >
                            ← 更换邮箱 / 重新发送
                        </button>
                    </div>
                </form>
              )}
            </div>

            {step === 'email' && (
                <p className="text-center text-[11px] text-gray-400 font-medium mt-6">
                    我们将发送验证码至您的邮箱
                </p>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // --- COMPONENT RENDER (Triggers) ---

  // 1. Sidebar Mode (Desktop)
  if (mode === 'sidebar') {
    return (
      <>
        {user ? (
          // Logged In: Sleek Profile Row
          <div className="flex items-center gap-3 p-2 bg-gray-50/50 border border-gray-100 rounded-2xl group hover:border-indigo-100 transition-all">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-700 to-gray-900 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                {user.email?.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">{user.email?.split('@')[0]}</div>
                <div className="text-[10px] text-gray-400 truncate">Pro Member</div>
             </div>
             <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
                title="退出登录"
             >
                <LogOut size={16} />
             </button>
          </div>
        ) : (
          // Logged Out: Promo Card
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-[#1c1c1e] to-[#000] p-5 text-white shadow-xl shadow-gray-200 group cursor-pointer border border-white/10" onClick={() => setIsOpen(true)}>
             <div className="relative z-10 flex flex-col items-start">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 backdrop-blur-md">
                   <Sparkles size={14} className="text-white" />
                </div>
                <h4 className="font-bold text-sm mb-1 tracking-tight">同步数据</h4>
                <p className="text-[10px] text-gray-400 mb-4 font-medium">
                   开启多端实时同步功能
                </p>
                <button 
                  className="w-full py-2.5 bg-white text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/10"
                >
                   <Zap size={12} className="fill-black" />
                   立即登录
                </button>
             </div>
          </div>
        )}
        {renderModal()}
      </>
    );
  }

  // 2. Mobile Mode (Header Compact)
  return (
    <>
      {user ? (
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <span className="max-w-[80px] truncate">{user.email?.split('@')[0]}</span>
          <LogOut size={14} />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-4 py-1.5 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all font-bold text-xs whitespace-nowrap"
        >
          <LogIn size={14} />
          <span>登录</span>
        </button>
      )}
      {renderModal()}
    </>
  );
}
