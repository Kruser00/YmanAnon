import React, { useState } from 'react';

export function AuthScreen({ onComplete }: { onComplete: (token?: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
       setError('CREDENTIALS_REQUIRED');
       return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
         setError(data.error || 'NETWORK_FAILURE');
      } else {
         localStorage.setItem('phos_token', data.token);
         localStorage.setItem('phos_username', data.username);
         onComplete(data.token);
      }
    } catch (err) {
      setError('COMMUNICATION_ERROR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 mt-16 animate-fade-in w-full max-w-sm mx-auto font-mono text-center px-4">
       <div className="w-full border border-[var(--phos-color)] p-6 bg-black/50 shadow-[0_0_15px_rgba(0,10,0,0.5)]">
           <h2 className="text-xl tracking-widest text-[var(--phos-color)] mb-2 uppercase">
              {isLogin ? 'NODE_AUTHORIZATION' : 'NEW_NODE_REGISTRATION'}
           </h2>
           <h3 className="text-lg text-[var(--phos-color)]/80 mb-6 font-sans">
              {isLogin ? 'ورود به حساب کاربری' : 'ثبت نام'}
           </h3>
           
           <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              <div>
                 <label className="text-[10px] uppercase text-[var(--phos-color)]/70 tracking-widest mb-1 flex justify-between">
                    <span>IDENTIFIER</span>
                    <span className="font-sans text-xs">نام کاربری</span>
                 </label>
                 <input 
                   type="text" 
                   value={username}
                   onChange={e => setUsername(e.target.value)}
                   className="w-full bg-transparent border border-[var(--phos-color)]/50 p-2 text-[var(--phos-color)] font-sans focus:outline-none focus:border-[var(--phos-color)] text-right"
                   disabled={loading}
                   dir="auto"
                 />
              </div>
              
              <div>
                 <label className="text-[10px] uppercase text-[var(--phos-color)]/70 tracking-widest mb-1 flex justify-between">
                    <span>PASSPHRASE</span>
                    <span className="font-sans text-xs">رمز عبور</span>
                 </label>
                 <input 
                   type="password" 
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full bg-transparent border border-[var(--phos-color)]/50 p-2 text-[var(--phos-color)] font-sans focus:outline-none focus:border-[var(--phos-color)] text-right"
                   disabled={loading}
                   dir="auto"
                 />
              </div>

              {error && (
                 <div className="text-red-500 text-xs font-mono mt-2 bg-red-900/20 p-2 border border-red-500/50 flex justify-between">
                    <span>ERR: {error}</span>
                    <span className="font-sans">خطا</span>
                 </div>
              )}

              <button 
                 type="submit"
                 disabled={loading}
                 className="mt-4 border border-[var(--phos-color)] py-2 text-[var(--phos-color)] uppercase tracking-widest hover:bg-[var(--phos-color)]/20 transition-colors flex flex-col items-center gap-1"
              >
                 <span>{loading ? 'PROCESSING...' : (isLogin ? 'AUTHENTICATE' : 'INITIALIZE')}</span>
                 <span className="font-sans text-xs">{loading ? 'در حال پردازش...' : (isLogin ? 'ورود' : 'ثبت نام')}</span>
              </button>
           </form>

           <div className="mt-6 flex flex-col gap-4">
              <button 
                 onClick={() => { setIsLogin(!isLogin); setError(''); }}
                 className="text-[10px] uppercase text-[var(--phos-color)]/60 hover:text-[var(--phos-color)] underline underline-offset-4 flex flex-col items-center gap-1 mx-auto"
              >
                 <span>{isLogin ? 'CREATE_NEW_IDENTITY' : 'EXISTING_IDENTITY_LOGIN'}</span>
                 <span className="font-sans text-[11px] no-underline">{isLogin ? 'ایجاد حساب کاربری جدید' : 'ورود به حساب کاربری موجود'}</span>
              </button>
              
              <button 
                 onClick={() => onComplete()}
                 className="text-[10px] uppercase text-[var(--phos-color)]/40 hover:text-[var(--phos-color)] mt-4 flex flex-col items-center gap-1 mx-auto"
              >
                 <span>[ CONTINUE_AS_GUEST (NON_PERSISTENT) ]</span>
                 <span className="font-sans text-[11px]">ورود به عنوان مهمان</span>
              </button>
           </div>
       </div>
    </div>
  );
}
