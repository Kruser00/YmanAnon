import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { User, ShieldAlert, Heart, Eye, Terminal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { audioService } from '../audio';
import { socketService } from '../socket';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function DashboardScreen({ onFindConnection, onDataMine, reputation, atmosphere, voidMessages = [] }: { onFindConnection: () => void, onDataMine: () => void, reputation: { positive: number, negative: number }, atmosphere: any, voidMessages?: any[] }) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  useEffect(() => {
    socketService.emit('request_atmosphere', {});
  }, []);

  const totalFreqs = (Object.values(atmosphere.freqs || {}).reduce((a: number, b: any) => a + (b as number), 0) || 1) as number;

  const infoDocs: Record<string, string> = {
    'network': 'GLOBAL_MESH_STATUS. وضعیت شبکه جهانی. فعال‌سازی تمامی گره‌ها.',
    'reputation': 'TRUST_QUOTIENT. شاخص اعتماد. اعتبار شما در هسته عصبی.',
    'match': 'NODE_CONNECT. اتصال به یک گره ناشناس بر اساس فرکانس و رمزنگاری.',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-2xl mx-auto justify-start sm:justify-center relative overflow-hidden"
    >
      {/* Network Mesh Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--phos-color)] opacity-20" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {Array.from({ length: 20 }).map((_, i) => {
            const startX = Math.random() * 100 + "%";
            const startY = Math.random() * 100 + "%";
            const endX = Math.random() * 100 + "%";
            const endY = Math.random() * 100 + "%";
            return (
              <motion.line
                key={i}
                x1={startX} y1={startY} x2={endX} y2={endY}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-[var(--phos-color)]"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: [0, 0.4, 0], pathLength: 1 }}
                transition={{ duration: Math.random() * 5 + 5, repeat: Infinity, delay: Math.random() * 5 }}
              />
            );
          })}
        </svg>
      </div>

      <div className="absolute inset-0 pointer-events-none rounded-xl border border-[var(--phos-color)]/10 shadow-[0_0_20px_var(--phos-dim)] hidden sm:block" />
      
      {/* HUD Info Readout - Now Fixed outside scroll */}
      <div className="min-h-[28px] sm:min-h-[36px] border-b border-[var(--phos-color)]/20 flex items-center px-4 bg-black/80 relative z-50 py-1 backdrop-blur-md">
        {activeInfo ? (
          <motion.div 
            initial={{ x: -20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            className="text-[9px] sm:text-[10px] uppercase tracking-tighter text-yellow-400 font-sans w-full leading-tight"
          >
            MAINFRAME.SYS &gt; {infoDocs[activeInfo]}
          </motion.div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-pulse" />
            <span className="text-[9px] uppercase tracking-tighter opacity-30 font-mono">NEURAL_CORE_IDLE // ACCESSING_PERIPHERALS_0x9</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1 sm:overflow-visible scrollbar-hide">
      <div className="mb-4 sm:mb-8 text-center border-b border-[var(--phos-color)]/30 pb-4 relative z-10 p-2 sm:p-4">
        <h2 className="text-xl sm:text-3xl fx-holo mb-1 uppercase tracking-[0.2em]">&gt; MAINFRAME STATUS</h2>
        <div className="text-[10px] sm:text-xs phosphor-dim mb-2 uppercase tracking-widest font-fa">وضعیت سیستم مرکزی</div>
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center items-center mt-2 text-[9px] sm:text-sm">
          <div 
            onClick={() => { audioService.playKeystroke(); setActiveInfo(activeInfo === 'network' ? null : 'network'); }}
            onMouseEnter={() => setActiveInfo('network')} 
            onMouseLeave={() => setActiveInfo(null)}
            className={cn(
              "flex items-center gap-2 border border-[var(--phos-color)]/20 px-2 py-1 cursor-help transition-colors",
              activeInfo === 'network' ? "bg-[var(--phos-color)]/20" : "hover:bg-[var(--phos-color)]/10"
            )}
          >
            <User size={12} className="text-[var(--phos-color)]" />
             <span className="phosphor-glow font-mono uppercase">{atmosphere.online > 999 ? (atmosphere.online/1000).toFixed(1) + 'k' : atmosphere.online} NODES / {atmosphere.activeChats || 0} LINKS</span>
          </div>
          <div 
            onClick={() => { audioService.playKeystroke(); setActiveInfo(activeInfo === 'reputation' ? null : 'reputation'); }}
            onMouseEnter={() => setActiveInfo('reputation')} 
            onMouseLeave={() => setActiveInfo(null)}
            className={cn(
              "flex items-center gap-2 border border-[var(--phos-color)]/20 px-2 py-1 cursor-help transition-colors",
              activeInfo === 'reputation' ? "bg-[var(--phos-color)]/20" : "hover:bg-[var(--phos-color)]/10"
            )}
          >
            <Heart size={12} className="text-red-500" />
            <span className="font-mono uppercase">Rep: {reputation.positive}/{reputation.negative}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 sm:mb-8 relative z-10 px-4 flex flex-col md:flex-row gap-6 sm:gap-8">
        <div className="flex-1">
          <h3 className="phosphor-dim uppercase text-[10px] mb-2 sm:mb-4 tracking-widest flex justify-between items-center pr-4">
            <span>&gt; NEURAL ATMOSPHERE</span>
            <span className="font-sans">جو عصبی</span>
          </h3>
          <div className="space-y-1 sm:space-y-2 font-mono text-[9px] min-h-[100px] sm:min-h-[140px] max-h-[140px] overflow-y-auto overflow-x-hidden pr-2 scrollbar-hide">
            {!atmosphere.freqs || Object.entries(atmosphere.freqs).length === 0 ? (
               <div className="flex flex-col gap-2 opacity-20">
                 {[1,2,3].map(i => (
                   <div key={i} className="flex items-center gap-4 animate-pulse">
                     <div className="w-16 h-2 bg-[var(--phos-color)]/20" />
                     <div className="flex-1 h-2 bg-[var(--phos-color)]/10" />
                     <div className="w-6 h-2 bg-[var(--phos-color)]/20" />
                   </div>
                 ))}
                 <div className="text-[7px] italic mt-2">ANALYZING_NODE_STREAMS...</div>
               </div>
            ) : Object.entries(atmosphere.freqs).map(([freq, count]: [string, any]) => {
              const pct = totalFreqs > 0 ? Math.round(((count as number) / totalFreqs) * 100) : 0;
              const freqFarsi: Record<string, string> = {
                '88.0': 'تپش‌های خاموش',
                '90.2': 'امواج محرمانه',
                '101.5': 'پهنای باند آزاد',
                '104.4': 'اکوی داستان‌ها',
                '108.0': 'نویزهای سوزان'
              };
              return (
                <div key={freq} className="flex flex-row items-center gap-2 sm:gap-4">
                   <div className="w-16 sm:w-24 uppercase font-bold tracking-wide truncate text-[8px] sm:text-[10px] flex flex-col leading-tight">
                     <span>{freq} MHz</span>
                     <span className="font-sans opacity-70 text-[9px]">{freqFarsi[freq] || ''}</span>
                   </div>
                   <div className="flex-1 h-1.5 sm:h-2 bg-[var(--phos-color)]/10 overflow-hidden relative border border-[var(--phos-color)]/20 shadow-[0_0_5px_var(--phos-dim)]">
                      <motion.div 
                        className="h-full bg-[var(--phos-color)] opacity-70"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1 }}
                      />
                   </div>
                   <div className="w-6 sm:w-8 text-right opacity-80 text-[7px] sm:text-[9px]">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col font-mono relative z-10 px-4">
        {voidMessages.length > 0 && (
           <div className="w-full border border-[var(--phos-color)]/30 bg-black/80 p-2 mb-6 shadow-[0_0_15px_var(--phos-dim)] overflow-hidden">
             <div className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[var(--phos-color)]/70 mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--phos-color)] animate-ping" />
                GLOBAL VOID STREAM / پیام‌های همگانی
             </div>
             <div className="relative w-full h-[20px] overflow-hidden">
               <motion.div 
                 animate={{ y: [0, -((voidMessages.length - 1) * 20)] }}
                 transition={{ duration: voidMessages.length * 3, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
                 className="flex flex-col text-[10px] sm:text-xs text-[var(--phos-color)] font-sans"
               >
                 {voidMessages.map((msg, i) => (
                    <div key={i} className="h-[20px] flex items-center truncate opacity-80 hover:opacity-100 transition-opacity">
                       <span className="opacity-50 mr-2 font-mono text-[9px]">[{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                       <span className="truncate">{msg.text}</span>
                    </div>
                 ))}
               </motion.div>
             </div>
           </div>
        )}

        <button 
           onClick={() => { audioService.playKeystroke(); onFindConnection(); }}
           onMouseEnter={() => setActiveInfo('match')} 
           onMouseLeave={() => setActiveInfo(null)}
           className="w-full border-2 bg-[var(--phos-color)]/10 border-[var(--phos-color)] p-4 sm:p-6 hover:bg-[var(--phos-color)]/20 hover:shadow-[0_0_20px_var(--phos-color)] transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden group mb-6"
        >
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--phos-color)]/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
           <Heart size={32} className="text-[var(--phos-color)] group-hover:animate-pulse group-hover:scale-110 transition-transform" />
           <div className="flex flex-col items-center flex-1 w-full max-w-md">
             <span className="uppercase tracking-[0.3em] text-lg sm:text-2xl relative z-10 font-bold phosphor-glow text-center">NODE_CONNECT</span>
             <span className="font-sans text-sm sm:text-base text-[var(--phos-color)] relative z-10 mt-1 mb-2 text-center font-bold">اتصال ناشناس به گره تصادفی</span>
             <p className="text-[10px] sm:text-[11px] font-sans opacity-70 text-center leading-relaxed max-w-sm">
               جهت آغاز یک گفتگوی ناشناس، رمزنگاری شده و زمان‌دار با کاربری دیگر در این شبکه. این ارتباط پس از منقضی شدن زمان به طور دائم پاک می‌شود.
             </p>
           </div>
        </button>
      </div>
      <div className="px-4">
         <button 
           onClick={() => { audioService.playKeystroke(); onDataMine(); }}
           className="w-full border border-[var(--phos-color)]/30 bg-black/60 p-3 sm:p-4 hover:bg-[var(--phos-color)]/10 hover:border-[var(--phos-color)]/50 transition-all flex items-center justify-center gap-3 relative overflow-hidden group mb-6 flex-row-reverse"
         >
           <Terminal size={18} className="text-[var(--phos-color)]/70 group-hover:text-[var(--phos-color)] mx-4" />
           <div className="flex flex-col items-start text-right flex-1" dir="rtl">
             <span className="uppercase tracking-widest text-xs sm:text-sm font-bold font-mono text-[var(--phos-color)]/80 group-hover:text-[var(--phos-color)] text-left w-full translate-y-1 sm:translate-y-2">DATA_MINE</span>
             <span className="font-fa text-[10px] sm:text-xs text-[var(--phos-color)]/50 mt-1">استخراج داده (تماشای تبلیغ) - کسب امتیاز ۵۰+</span>
           </div>
         </button>
      </div>

      <div className="mt-6 text-center opacity-40 px-4 pb-6">
        <div className="text-[7px] sm:text-[9px] uppercase tracking-[0.2em] font-mono animate-pulse mb-1 leading-relaxed">
          KNOWLEDGE IS TEMPORARY // NOTHING IS SAVED // USE YOUR TIME WISELY
        </div>
        <div className="text-[9px] sm:text-[11px] font-sans tracking-[0.1em] opacity-80 leading-relaxed">
          دانش موقتی است // چیزی ذخیره نمی‌شود // از زمان خود عاقلانه استفاده کنید
        </div>
      </div>
      </div>
    </motion.div>
  );
}
