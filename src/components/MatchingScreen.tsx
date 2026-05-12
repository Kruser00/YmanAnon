import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { audioService } from '../audio';

export function MatchingScreen({ onCancel }: { onCancel?: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full text-center space-y-6 relative"
    >
      {onCancel && (
        <button onClick={() => { audioService.playKeystroke(); onCancel(); }} className="absolute top-2 right-2 p-2 hover:bg-[var(--phos-color)]/20 text-xs font-mono uppercase border border-[var(--phos-color)]/30 fx-border-shine">
          Cancel Search
        </button>
      )}
      <div className="relative">
        <Heart size={48} className="text-[var(--phos-color)] animate-pulse relative z-10" />
        <div className="absolute inset-0 bg-[var(--phos-color)] blur-xl opacity-20 animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="fx-holo font-bold !text-white text-lg uppercase tracking-wider">Searching matching pool</span>
        <span className="phosphor-dim text-sm">Aligning intent frequencies...</span>
      </div>
    </motion.div>
  );
}
