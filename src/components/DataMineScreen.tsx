import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Binary, LockOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { audioService } from '../audio';
import { socketService } from '../socket';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function DataMineScreen({ onBack }: { onBack: () => void }) {
  const [miningState, setMiningState] = useState<'idle' | 'mining' | 'success'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (miningState === 'mining') {
      const duration = 15000; // Simulated 15 second "ad"
      const interval = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += interval;
        setProgress((elapsed / duration) * 100);

        if (elapsed >= duration) {
          clearInterval(timer);
          setMiningState('success');
          socketService.emit('mining_complete', { amount: 50 });
          audioService.playAlert();
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [miningState]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-2xl mx-auto p-4 sm:p-8"
    >
      <header className="flex justify-between items-center border-b border-[var(--phos-color)]/30 pb-4 mb-8">
        <button 
           onClick={() => { audioService.playKeystroke(); onBack(); }}
           className="flex items-center gap-2 text-[var(--phos-color)] hover:text-white transition-colors"
        >
           <ArrowLeft size={16} />
           <span className="font-mono text-xs uppercase tracking-widest hidden sm:inline">RETURN_TO_CORE</span>
           <span className="font-fa text-xs sm:hidden">بازگشت</span>
        </button>
        <div className="font-mono text-xs uppercase tracking-widest text-[var(--phos-color)]/70">DATA_MINE_PROTO</div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        {miningState === 'idle' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center max-w-md">
            <Database size={48} className="text-[var(--phos-color)] mb-6 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-widest mb-2 font-mono">Data Extraction Node</h2>
            <h3 className="font-fa text-lg mb-6 opacity-90">گره استخراج داده (تماشای تبلیغ)</h3>
            <p className="font-fa text-sm opacity-70 leading-relaxed mb-8">
               برای کسب امتیازات بیشتر در شبکه، می‌توانید به جریان‌های رمزنگاری شده خارجی متصل شوید و داده استخراج کنید. این فرآیند ممکن است ۱۵ ثانیه طول بکشد.
            </p>

            <button 
              onClick={() => {
                 audioService.playKeystroke();
                 setMiningState('mining');
              }}
              className="border-2 border-[var(--phos-color)] bg-[var(--phos-color)]/10 px-8 py-4 uppercase tracking-[0.2em] font-mono text-sm hover:bg-[var(--phos-color)] hover:text-black hover:shadow-[0_0_20px_var(--phos-color)] transition-all font-bold w-full"
            >
              INITIATE_EXTRACTION ( +50 PTS )
            </button>
          </motion.div>
        )}

        {miningState === 'mining' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full max-w-md">
             <div className="relative mb-8 flex justify-center items-center">
                 <Loader2 size={64} className="text-[var(--phos-color)] animate-spin" />
                 <Binary size={24} className="absolute text-[var(--phos-color)] animate-ping" />
             </div>
             
             <div className="font-mono text-xs sm:text-sm uppercase tracking-widest mb-2 text-[var(--phos-color)]">
                DECRYPTING_EXTERNAL_STREAM... {Math.round(progress)}%
             </div>
             <div className="font-fa text-xs opacity-70 mb-8">در حال اتصال به جریان حامی (تبلیغات)... لطفا صبر کنید.</div>
             
             <div className="w-full h-2 bg-[var(--phos-color)]/20 border border-[var(--phos-color)]/50 relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-[var(--phos-color)] shadow-[0_0_10px_var(--phos-color)]"
                  style={{ width: `${progress}%` }}
                />
             </div>
             
             <div className="mt-8 font-mono text-[8px] sm:text-[10px] text-[var(--phos-color)]/50 text-center max-w-xs break-all">
                {Array.from({ length: 5 }).map((_, i) => (
                   <div key={i} className="mb-1">
                      0x{Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0')} : {Math.random() > 0.5 ? 'BUFFER_OK' : 'PARSING_CHUNK'}
                   </div>
                ))}
             </div>
          </motion.div>
        )}

        {miningState === 'success' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
            <LockOpen size={48} className="text-yellow-400 mb-6" />
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-widest mb-2 font-mono text-yellow-400">EXTRACTION_COMPLETE</h2>
            <h3 className="font-fa text-lg mb-6 opacity-90 text-yellow-400">استخراج با موفقیت انجام شد</h3>
            
            <p className="font-mono text-sm opacity-80 mb-8 p-4 border border-[var(--phos-color)]/30 bg-[var(--phos-color)]/10">
               ACQUIRED: +50 PTS<br/>
               <span className="font-fa text-xs mt-2 block opacity-70">امتیار به حساب شما واریز شد.</span>
            </p>

            <button 
              onClick={() => {
                 audioService.playKeystroke();
                 onBack();
              }}
              className="border border-[var(--phos-color)] px-8 py-3 text-sm uppercase tracking-widest hover:bg-[var(--phos-color)] hover:text-black transition-colors font-mono"
            >
              CLOSE_TERMINAL
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
