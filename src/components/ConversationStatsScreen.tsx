import React from 'react';
import { motion } from 'motion/react';
import { audioService } from '../audio';

export function ConversationStatsScreen({ stats, onNext }: { stats: any, onNext: () => void }) {
  if (!stats) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-lg mx-auto py-12 justify-center font-mono"
    >
      <div className="mb-8 text-center border-b border-[var(--phos-color)]/30 pb-6 relative fx-border-shine overflow-hidden p-6">
        <div className="absolute inset-0 bg-[var(--phos-color)]/5 -z-10" />
        <h2 className="text-3xl fx-holo mb-4 uppercase tracking-[0.2em] font-bold">SESSION ARCHIVAL</h2>
        <div className="flex justify-center gap-1 opacity-50 mb-2">
            {Array(5).fill(0).map((_, i) => <div key={i} className="w-1 h-1 bg-[var(--phos-color)] rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
        </div>
        <p className="text-sm opacity-70">Conversation stats analyzed and cataloged.</p>
      </div>

      <div className="space-y-6 mb-12">
        <div className="flex justify-between items-center border-b border-[var(--phos-color)]/10 pb-2">
           <span className="opacity-50 uppercase text-xs">Duration</span>
           <span className="text-xl phosphor-glow">{Math.floor(stats.duration / 60)}m {stats.duration % 60}s</span>
        </div>
        <div className="flex justify-between items-center border-b border-[var(--phos-color)]/10 pb-2">
           <span className="opacity-50 uppercase text-xs">Data Transmitted</span>
           <span className="text-xl phosphor-glow">{stats.messageCount} Message Packets</span>
        </div>
        <div className="flex justify-between items-center border-b border-[var(--phos-color)]/10 pb-2">
           <span className="opacity-50 uppercase text-xs">Network Ranking</span>
           <div className="flex flex-col items-end">
             <span className="text-2xl fx-holo text-yellow-400 font-bold">{stats.rank}</span>
             <span className="text-[10px] opacity-40 uppercase">Global session percentile</span>
           </div>
        </div>
      </div>

      <button 
        onClick={() => { audioService.playKeystroke(); onNext(); }} 
        className="border border-[var(--phos-color)] p-4 uppercase tracking-widest hover:bg-[var(--phos-color)]/20 shadow-[0_0_15px_var(--phos-dim)] group relative overflow-hidden fx-border-shine"
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10 group-hover:fx-holo">Proceed to Verification</span>
      </button>
    </motion.div>
  );
}
