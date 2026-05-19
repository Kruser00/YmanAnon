import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { audioService } from '../audio';

export function MatchingScreen({ onCancel, freq, atmosphere }: { onCancel?: () => void; freq?: string | null; atmosphere?: any }) {
  const onlineCount = atmosphere?.online || 0;
  const tunedFreqUsers = (atmosphere?.freqs && freq) ? atmosphere.freqs[freq] || 0 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full text-center space-y-6 relative"
    >
      {onCancel && (
        <button onClick={() => { audioService.playKeystroke(); onCancel(); }} className="absolute top-2 right-2 p-2 hover:bg-[var(--phos-color)]/20 text-xs font-mono uppercase border border-[var(--phos-color)]/30 fx-border-shine flex flex-col items-center">
          <span>Cancel Search</span>
          <span className="font-sans text-[10px] mt-1">لغو جستجو</span>
        </button>
      )}
      <div className="relative mb-4">
        <Heart size={48} className="text-[var(--phos-color)] animate-ping relative z-10 mx-auto" />
        <Heart size={48} className="text-[var(--phos-color)] absolute inset-0 z-0 opacity-50" />
      </div>
      <div className="flex flex-col gap-2 bg-black/40 border border-[var(--phos-color)]/30 p-6 shadow-xl backdrop-blur-md min-w-[280px]">
        <span className="fx-holo font-bold text-center !text-[var(--phos-color)] text-lg uppercase tracking-wider mb-2">Scanning Matrix</span>
        <span className="font-sans text-xl text-center phosphor-glow mb-4">در حال جستجوی شبکه...</span>
        
        <div className="text-[10px] font-mono text-left flex flex-col gap-2 text-[var(--phos-color)]/80 uppercase tracking-wide">
           <div className="flex justify-between border-b border-[var(--phos-color)]/20 pb-1">
              <span>Nodes Online:</span>
              <span className="font-bold text-[var(--phos-color)]">{onlineCount > 999 ? (onlineCount/1000).toFixed(1) + 'k' : onlineCount}</span>
           </div>
           {freq && (
           <div className="flex justify-between border-b border-[var(--phos-color)]/20 pb-1">
              <span>Tuned / هم‌راستا:</span>
              <span className="font-bold text-yellow-500">{tunedFreqUsers}</span>
           </div>
           )}
           <div className="flex justify-between">
              <span className="animate-pulse">Finding match / در حال وصل...</span>
              <span className="font-bold">...</span>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
