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

export function DashboardScreen({ onFindConnection, onOpenOracle, onOpenBroker, reputation, clearance, voidMessages, atmosphere }: { onFindConnection: () => void, onOpenOracle: () => void, onOpenBroker: () => void, reputation: { positive: number, negative: number }, clearance: number, voidMessages: any[], atmosphere: any }) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  useEffect(() => {
    socketService.emit('request_atmosphere', {});
  }, []);

  const totalMoods = (Object.values(atmosphere.moods).reduce((a: number, b: any) => a + (b as number), 0) || 1) as number;

  const infoDocs: Record<string, string> = {
    'network': 'GLOBAL_MESH_STATUS. REPRESENTS ALL USERS CURRENTLY EMITTING SIGNALS IN THE TERMINAL.',
    'clearance': 'SECURITY_LVL. HIGHER CLEARANCE UNLOCKS PREMIUM MODES AND PROTECTS AGAINST DATA CORRUPTION.',
    'reputation': 'TRUST_QUOTIENT. ACCRUED VIA POSITIVE INTERACTIONS. LOW REP MAY LEAD TO NETWORK QUARANTINE.',
    'void': 'THE_VOID. A PUBLIC BROADCAST CHANNEL FOR UNROUTED PACKETS. TYPE "/void [message]" IN CHAT TO CAST.',
    'oracle': 'THE_ORACLE. AN ASYNCHRONOUS DATA REPOSITORY. ASK QUESTIONS, RECEIVE FRAGMENTS FROM THE NETWORK.',
    'match': 'INITIATE_HANDSHAKE. SCAN THE NETWORK FOR A COMPATIBLE USER BASED ON CURRENT MOOD/INTENT.',
    'broker': 'DATA_BROKER. EXCHANGE ACCUMULATED POINTS FOR SECURITY UPGRADES AND PROTOCOLS.'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-2xl mx-auto justify-center relative"
    >
      <div className="absolute inset-0 pointer-events-none rounded-xl border border-[var(--phos-color)]/10 shadow-[0_0_20px_var(--phos-dim)]" />
      
      {/* HUD Info Readout */}
      <div className="h-6 mb-2 overflow-hidden border-b border-[var(--phos-color)]/10 flex items-center px-4 bg-black/40 relative z-20">
        {activeInfo ? (
          <motion.div 
            initial={{ x: -20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            className="text-[7px] sm:text-[9px] uppercase tracking-tighter text-yellow-400 font-mono w-full truncate"
          >
            SYS.INFO &gt; {infoDocs[activeInfo]}
          </motion.div>
        ) : (
          <span className="text-[9px] uppercase tracking-tighter opacity-20 font-mono">SYS.IDLE // TAP COMPONENTS FOR DETAILS</span>
        )}
      </div>

      <div className="mb-4 sm:mb-8 text-center border-b border-[var(--phos-color)]/30 pb-4 relative z-10 p-2 sm:p-4">
        <h2 className="text-xl sm:text-3xl fx-holo mb-2 uppercase tracking-[0.2em]">&gt; NETWORK STATUS</h2>
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center items-center mt-2 sm:mt-4 text-[9px] sm:text-sm">
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
            onClick={() => { audioService.playKeystroke(); setActiveInfo(activeInfo === 'clearance' ? null : 'clearance'); }}
            onMouseEnter={() => setActiveInfo('clearance')} 
            onMouseLeave={() => setActiveInfo(null)}
            className={cn(
               "flex items-center gap-2 border border-[var(--phos-color)]/20 px-2 py-1 cursor-help transition-colors",
               activeInfo === 'clearance' ? "bg-[var(--phos-color)]/20" : "hover:bg-[var(--phos-color)]/10"
            )}
          >
            <ShieldAlert size={12} className={clearance > 1 ? "text-yellow-400" : "text-[var(--phos-color)]/50"} />
            <span className="font-mono uppercase">Lvl {clearance}</span>
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
          <h3 className="phosphor-dim uppercase text-[10px] mb-2 sm:mb-4 tracking-widest">&gt; ATMOSPHERE CALIBRATION</h3>
          <div className="space-y-1 sm:space-y-2 font-mono text-[9px] min-h-[100px] sm:min-h-[140px] max-h-[140px] overflow-y-auto overflow-x-hidden pr-2">
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
              return (
                <div key={mood} className="flex flex-row items-center gap-2 sm:gap-4">
                   <div className="w-16 sm:w-20 uppercase font-bold tracking-wide truncate text-[7px] sm:text-[9px]">{mood}</div>
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

        <div 
          onClick={() => { audioService.playKeystroke(); setActiveInfo(activeInfo === 'void' ? null : 'void'); }}
          onMouseEnter={() => setActiveInfo('void')} 
          onMouseLeave={() => setActiveInfo(null)}
          className={cn(
             "flex-1 border border-[var(--phos-color)]/20 p-4 bg-black/20 min-h-[120px] sm:min-h-[150px] flex flex-col cursor-help transition-colors",
             activeInfo === 'void' ? "border-[var(--phos-color)]/60 bg-[var(--phos-color)]/5" : "hover:border-[var(--phos-color)]/40 hover:bg-black/30"
          )}
        >
          <div className="flex justify-between items-center border-b border-[var(--phos-color)]/20 pb-1 mb-3 sm:mb-4">
            <h3 className="phosphor-dim uppercase text-[10px] tracking-widest">The Void</h3>
            <div className="text-[8px] animate-pulse">LIVE</div>
          </div>
          <div className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto max-h-[100px] sm:max-h-[120px] scrollbar-hide">
            {voidMessages.length === 0 ? (
               <div className="text-[9px] opacity-30 italic font-mono text-center mt-2">Static noise...</div>
            ) : voidMessages.map((m, i) => (
               <motion.div 
                 key={i} 
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="font-mono text-[10px] sm:text-xs border-l border-[var(--phos-color)]/40 pl-3 py-1"
               >
                 <div className="opacity-40 text-[7px] sm:text-[8px] uppercase mb-1">{new Date(m.timestamp).toLocaleTimeString()} // FRAGMENT</div>
                 <div className="phosphor-glow italic text-[11px] sm:text-xs whitespace-pre-wrap">"{m.text}"</div>
               </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3 sm:gap-4 font-mono relative z-10 px-4 pb-4">
        <button 
           onClick={() => { audioService.playKeystroke(); onOpenOracle(); }}
           onMouseEnter={() => setActiveInfo('oracle')} 
           onMouseLeave={() => setActiveInfo(null)}
           className="flex-1 border border-[var(--phos-color)] p-3 sm:p-6 hover:bg-[var(--phos-color)]/10 hover:shadow-[0_0_15px_var(--phos-color)] transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-2 relative overflow-hidden group fx-border-shine"
        >
           <Eye size={18} className="text-[var(--phos-color)] group-hover:animate-pulse" />
           <div className="flex flex-col items-start sm:items-center">
             <span className="uppercase tracking-widest text-sm sm:text-lg relative z-10 group-hover:fx-holo transition-all duration-300">The Oracle</span>
             <span className="opacity-50 text-[9px] sm:text-xs text-center relative z-10 sm:block hidden">&gt; Async threads.</span>
           </div>
        </button>
        <button 
           onClick={() => { audioService.playKeystroke(); onFindConnection(); }}
           onMouseEnter={() => setActiveInfo('match')} 
           onMouseLeave={() => setActiveInfo(null)}
           className="flex-1 border bg-[var(--phos-color)]/10 border-[var(--phos-color)] p-3 sm:p-6 hover:bg-[var(--phos-color)]/20 hover:shadow-[0_0_15px_var(--phos-color)] transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-2 relative overflow-hidden group fx-border-shine"
        >
           <Heart size={18} className="text-[var(--phos-color)] group-hover:animate-pulse" />
           <div className="flex flex-col items-start sm:items-center">
             <span className="uppercase tracking-widest text-sm sm:text-lg relative z-10 group-hover:fx-holo transition-all duration-300">Find Connection</span>
             <span className="opacity-50 text-[9px] sm:text-xs text-center relative z-10 sm:block hidden">&gt; Enter queue.</span>
           </div>
        </button>
        <button 
           onClick={() => { audioService.playKeystroke(); onOpenBroker(); }}
           onMouseEnter={() => setActiveInfo('broker')} 
           onMouseLeave={() => setActiveInfo(null)}
           className="flex-1 border border-[var(--phos-color)] p-3 sm:p-6 hover:bg-[var(--phos-color)]/10 hover:shadow-[0_0_15px_var(--phos-color)] transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4 sm:gap-2 relative overflow-hidden group fx-border-shine"
        >
           <ShieldAlert size={18} className="text-[var(--phos-color)] group-hover:animate-pulse" />
           <div className="flex flex-col items-start sm:items-center">
             <span className="uppercase tracking-widest text-sm sm:text-lg relative z-10 group-hover:fx-holo transition-all duration-300">Data Broker</span>
             <span className="opacity-50 text-[9px] sm:text-xs text-center relative z-10 sm:block hidden">&gt; Intel & upgrades.</span>
           </div>
        </button>
      </div>
    </motion.div>
  );
}
