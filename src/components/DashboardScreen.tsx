import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, ShieldAlert, Heart, Eye, Terminal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { audioService } from '../audio';
import { socketService } from '../socket';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function DashboardScreen({ onFindConnection, onOpenOracle, onOpenAdTerminal, reputation, voidMessages, atmosphere, purgePotTotal }: { onFindConnection: () => void, onOpenOracle: () => void, onOpenAdTerminal: () => void, reputation: { positive: number, negative: number }, voidMessages: any[], atmosphere: any, purgePotTotal: number }) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [isContributing, setIsContributing] = useState(false);
  const [contributeAmount, setContributeAmount] = useState(100);

  useEffect(() => {
    socketService.emit('request_atmosphere', {});
  }, []);

  const handleContribute = () => {
    socketService.emit('contribute_purge_pot', { amount: contributeAmount });
    setIsContributing(false);
    audioService.playKeystroke();
  };

  const totalMoods = (Object.values(atmosphere.moods).reduce((a: number, b: any) => a + (b as number), 0) || 1) as number;

  const infoDocs: Record<string, string> = {
    'network': 'GLOBAL_MESH_STATUS. وضعیت شبکه جهانی. نمایش تمام کلاینت‌های فعال.',
    'reputation': 'TRUST_QUOTIENT. شاخص اعتماد. اعتبار پایین ممکن است منجر به قرنطینه شود.',
    'void': 'THE_VOID. پخش عمومی پیام‌های رها شده. از طریق /void ارسال کنید.',
    'oracle': 'THE_ORACLE. مخزن دانش شبکه. سوال بپرسید یا به دیگران پاسخ دهید.',
    'pot': 'SIGNAL_CONSERVATION. ذخیره سیگنال. مشارکت جمعی برای به تاخیر انداختن پاکسازی شبکه.',
    'signal': 'SIGNAL_FUEL_GENERATOR. استخراج سیگنال. مشاهده تبلیغات برای دریافت امتیاز رایگان.'
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
            SYS.INFO &gt; {infoDocs[activeInfo]}
          </motion.div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-pulse" />
            <span className="text-[9px] uppercase tracking-tighter opacity-30 font-mono">STATION.IDLE // INTERROGATE SYSTEM SUBSYSTEMS</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1 sm:overflow-visible scrollbar-hide">
      <div className="mb-4 sm:mb-8 text-center border-b border-[var(--phos-color)]/30 pb-4 relative z-10 p-2 sm:p-4">
        <h2 className="text-xl sm:text-3xl fx-holo mb-1 uppercase tracking-[0.2em]">&gt; NETWORK STATUS</h2>
        <div className="text-[10px] sm:text-xs phosphor-dim mb-2 uppercase tracking-widest font-fa">وضعیت شبکه</div>
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
             <span className="phosphor-glow font-mono uppercase">{atmosphere.online > 999 ? (atmosphere.online/1000).toFixed(1) + 'k' : atmosphere.online} NODES</span>
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

      <div className="mb-6 sm:mb-12 relative z-10 px-4 flex flex-col md:flex-row gap-6 sm:gap-8">
        <div className="flex-1">
          <h3 className="phosphor-dim uppercase text-[10px] mb-2 sm:mb-4 tracking-widest flex justify-between items-center pr-4">
            <span>&gt; ATMOSPHERE CALIBRATION</span>
            <span className="font-sans">کالیبراسیون جو</span>
          </h3>
          <div className="space-y-1 sm:space-y-2 font-mono text-[9px] min-h-[100px] sm:min-h-[140px] max-h-[140px] overflow-y-auto overflow-x-hidden pr-2 scrollbar-hide">
            {Object.entries(atmosphere.moods).length === 0 ? (
               <div className="flex flex-col gap-2 opacity-20">
                 {[1,2,3].map(i => (
                   <div key={i} className="flex items-center gap-4 animate-pulse">
                     <div className="w-16 h-2 bg-[var(--phos-color)]/20" />
                     <div className="flex-1 h-2 bg-[var(--phos-color)]/10" />
                     <div className="w-6 h-2 bg-[var(--phos-color)]/20" />
                   </div>
                 ))}
                 <div className="text-[7px] italic mt-2">CALIBRATING_SENSORS...</div>
               </div>
            ) : Object.entries(atmosphere.moods).map(([mood, count]: [string, any]) => {
              const pct = Math.round(((count as number) / totalMoods) * 100);
              const moodFarsi: Record<string, string> = {
                'lonely': 'تنها',
                'happy': 'خوشحال',
                'curious': 'کنجکاو',
                'bored': 'بی‌حوصله',
                'anxious': 'مضطرب',
                'thoughtful': 'متفکر',
                'energetic': 'پرانرژی'
              };
              return (
                <div key={mood} className="flex flex-row items-center gap-2 sm:gap-4">
                   <div className="w-16 sm:w-24 uppercase font-bold tracking-wide truncate text-[8px] sm:text-[10px] flex flex-col leading-tight">
                     <span>{mood}</span>
                     <span className="font-sans opacity-70 text-[9px]">{moodFarsi[mood] || ''}</span>
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

        <div className="flex-1 flex flex-col gap-4">
           {/* Global Purge Pot UI */}
          <div 
            onClick={() => { audioService.playKeystroke(); setActiveInfo(activeInfo === 'pot' ? null : 'pot'); }}
            onMouseEnter={() => setActiveInfo('pot')} 
            onMouseLeave={() => setActiveInfo(null)}
            className={cn(
              "border border-yellow-500/20 p-3 sm:p-4 bg-yellow-500/5 flex flex-col cursor-help transition-all relative overflow-hidden",
              activeInfo === 'pot' ? "border-yellow-500/60 bg-yellow-500/10" : "hover:border-yellow-500/40 hover:bg-yellow-500/5"
            )}
          >
            <div className="flex justify-between items-center border-b border-yellow-500/20 pb-1 mb-2">
              <h3 className="text-yellow-500 uppercase text-[9px] sm:text-[10px] tracking-widest font-bold">Signal Conservation Pot</h3>
              <div className="text-[7px] text-yellow-500/50">COOPERATIVE_DELAY</div>
            </div>
            
            <div className="flex items-end justify-between mb-2">
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        opacity: purgePotTotal > i * 150 ? [0.4, 1, 0.4] : 0.1,
                        height: purgePotTotal > i * 150 ? [6, 12, 6] : 4,
                        backgroundColor: purgePotTotal > i * 150 ? "#eab308" : "#422006"
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: Math.max(1, 3 - (purgePotTotal / 2000)),
                        delay: i * 0.08 
                      }}
                      className="w-1.5 rounded-full"
                      style={{ boxShadow: purgePotTotal > i * 150 ? '0 0 8px rgba(234, 179, 8, 0.4)' : 'none' }}
                    />
                  ))}
                </div>
                <span className="text-sm sm:text-2xl font-mono text-yellow-500 font-bold phosphor-glow leading-none">{purgePotTotal}</span>
                <span className="text-[8px] uppercase opacity-50 font-mono tracking-tighter">GLOBAL_SIGNAL_RESERVE</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsContributing(!isContributing); }}
                className="bg-yellow-500 text-black text-[10px] px-3 py-2 uppercase tracking-tighter hover:bg-yellow-400 transition-all font-bold shadow-[0_0_15px_rgba(234,179,8,0.2)] active:scale-95"
              >
                {isContributing ? '[ CANCEL ]' : 'ALLOCATE CREDITS'}
              </button>
            </div>

            {isContributing && (
               <div className="mt-2 pt-2 border-t border-yellow-500/10 flex items-center justify-between gap-2">
                  <div className="flex-1 flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setContributeAmount(Math.max(100, contributeAmount - 100)); }} className="w-6 h-6 border border-yellow-500/30 flex items-center justify-center hover:bg-yellow-500/20">-</button>
                    <span className="flex-1 text-center font-mono text-xs text-yellow-500">{contributeAmount}</span>
                    <button onClick={(e) => { e.stopPropagation(); setContributeAmount(contributeAmount + 100); }} className="w-6 h-6 border border-yellow-500/30 flex items-center justify-center hover:bg-yellow-500/20">+</button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleContribute(); }} className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 text-[9px] px-2 py-1 uppercase hover:bg-yellow-500/40">Confirm</button>
               </div>
            )}

            <div className="text-[7px] sm:text-[8px] opacity-40 font-sans italic">
              "Every credit prolongs our existence in this RAM cache..."
            </div>
          </div>

          <div 
            onClick={() => { audioService.playKeystroke(); setActiveInfo(activeInfo === 'void' ? null : 'void'); }}
            onMouseEnter={() => setActiveInfo('void')} 
            onMouseLeave={() => setActiveInfo(null)}
            className={cn(
               "flex-1 border border-[var(--phos-color)]/20 p-3 sm:p-4 bg-black/20 flex flex-col cursor-help transition-colors",
               activeInfo === 'void' ? "border-[var(--phos-color)]/60 bg-[var(--phos-color)]/5" : "hover:border-[var(--phos-color)]/40 hover:bg-black/30"
            )}
          >
            <div className="flex justify-between items-center border-b border-[var(--phos-color)]/20 pb-1 mb-2">
              <h3 className="phosphor-dim uppercase text-[10px] tracking-widest">The Void</h3>
              <div className="text-[8px] animate-pulse">LIVE</div>
            </div>
            <div className="flex-1 space-y-2 sm:space-y-3 overflow-y-auto max-h-[60px] sm:max-h-[80px] scrollbar-hide">
              {voidMessages.length === 0 ? (
                 <div className="text-[9px] opacity-30 italic font-mono text-center mt-2">Static noise...</div>
              ) : voidMessages.map((m, i) => (
                 <motion.div 
                   key={i} 
                   initial={{ opacity: 0, x: 10 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="font-mono text-[9px] sm:text-[10px] border-l border-[var(--phos-color)]/40 pl-3 py-0.5"
                 >
                   <div className="phosphor-glow italic whitespace-pre-wrap">"{m.text}"</div>
                 </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 font-mono relative z-10 px-4">
        <button 
           onClick={() => { audioService.playKeystroke(); onOpenOracle(); }}
           onMouseEnter={() => setActiveInfo('oracle')} 
           onMouseLeave={() => setActiveInfo(null)}
           className="border border-[var(--phos-color)] p-3 sm:p-5 hover:bg-[var(--phos-color)]/10 hover:shadow-[0_0_15px_var(--phos-color)] transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-1 relative overflow-hidden group"
        >
           <Eye size={18} className="text-[var(--phos-color)] group-hover:animate-pulse" />
           <div className="flex flex-col items-start sm:items-center">
             <span className="uppercase tracking-widest text-sm sm:text-base relative z-10">The Oracle</span>
             <span className="font-sans text-xs sm:text-sm text-[var(--phos-color)]/80 relative z-10">اوراکل</span>
           </div>
        </button>
        <button 
           onClick={() => { audioService.playKeystroke(); onFindConnection(); }}
           onMouseEnter={() => setActiveInfo('match')} 
           onMouseLeave={() => setActiveInfo(null)}
           className="border bg-[var(--phos-color)]/10 border-[var(--phos-color)] p-3 sm:p-5 hover:bg-[var(--phos-color)]/20 hover:shadow-[0_0_15px_var(--phos-color)] transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-1 relative overflow-hidden group"
        >
           <Heart size={18} className="text-[var(--phos-color)] group-hover:animate-pulse" />
           <div className="flex flex-col items-start sm:items-center">
             <span className="uppercase tracking-widest text-sm sm:text-base relative z-10 font-bold">Connect</span>
             <span className="font-sans text-xs sm:text-sm text-[var(--phos-color)]/80 relative z-10">ایجاد ارتباط</span>
           </div>
        </button>
      </div>

      <div className="px-4 pb-4 mt-4">
        <button 
           onClick={() => { audioService.playKeystroke(); onOpenAdTerminal(); }}
           onMouseEnter={() => setActiveInfo('signal')} 
           onMouseLeave={() => setActiveInfo(null)}
           className="w-full border-2 border-yellow-500/40 p-3 sm:p-4 hover:bg-yellow-500/10 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all flex flex-row items-center gap-3 group relative overflow-hidden bg-yellow-500/5 group"
        >
           <Terminal size={14} className="text-yellow-500 group-hover:animate-bounce" />
           <div className="flex flex-col items-start text-left">
             <span className="uppercase tracking-widest text-xs sm:text-sm text-yellow-500 font-bold leading-tight">Signal Mine [REWARD_STATION]</span>
             <span className="text-[8px] sm:text-[9px] text-yellow-500/60 leading-none">FUEL_YOUR_SIGNAL_BY_CONTRIBUTING_ATTENTION</span>
           </div>
           <div className="ml-auto text-yellow-500 font-bold text-xs sm:text-sm phosphor-glow animate-pulse">+250</div>
        </button>
      </div>

      <div className="mt-2 sm:mt-6 text-center opacity-40 px-4 pb-6">
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
