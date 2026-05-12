import React, { useState } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { audioService } from '../audio';
import { socketService } from '../socket';

export function RatingScreen({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  
  const positiveTags = ['thoughtful', 'respectful', 'funny', 'comforting', 'intelligent'];
  const negativeTags = ['creepy', 'spam', 'rude', 'boring'];

  const handleToggle = (tag: string) => {
    audioService.playKeystroke();
    setSelected(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = () => {
    audioService.playKeystroke();
    socketService.emit('rate_partner', { tags: selected });
    onComplete();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-lg mx-auto py-12 justify-center"
    >
      <div className="mb-8 text-center text-[var(--phos-color)]">
        <h2 className="text-2xl fx-holo mb-2 uppercase font-bold">Connection Terminated</h2>
        <p className="opacity-70 text-sm font-mono mt-2">&gt; Rate your peer. This reinforces network safety and matching efficiency.</p>
      </div>

      <div className="mb-6 space-y-4">
        <div>
           <div className="uppercase font-mono text-xs opacity-50 mb-2 border-b border-[var(--phos-color)]/20 pb-1">Positive Attributes</div>
           <div className="flex flex-wrap gap-2">
             {positiveTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => handleToggle(tag)}
                  className={clsx(
                    "border border-[var(--phos-color)]/30 px-3 py-1 font-mono text-xs uppercase hover:bg-[var(--phos-color)]/20 transition-colors cursor-pointer",
                    selected.includes(tag) && "bg-[var(--phos-color)] text-black font-bold shadow-[0_0_10px_var(--phos-color)]"
                  )}
                >
                  {tag}
                </button>
             ))}
           </div>
        </div>

        <div>
           <div className="uppercase font-mono text-xs opacity-50 mb-2 border-b border-[var(--phos-color)]/20 pb-1 mt-6">Negative Attributes</div>
           <div className="flex flex-wrap gap-2">
             {negativeTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => handleToggle(tag)}
                  className={clsx(
                    "border border-red-500/30 text-red-500 px-3 py-1 font-mono text-xs uppercase hover:bg-red-500/20 transition-colors cursor-pointer",
                    selected.includes(tag) && "bg-red-500 text-black font-bold shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                  )}
                >
                  {tag}
                </button>
             ))}
           </div>
        </div>
      </div>

      <button 
        onClick={handleSubmit} 
        className="mt-8 border border-[var(--phos-color)] p-4 uppercase tracking-widest hover:bg-[var(--phos-color)]/20 hover:shadow-[0_0_15px_var(--phos-color)] transition-all"
      >
        Transmit Feedback & Return
      </button>

      <button 
        onClick={onComplete} 
        className="mt-4 text-[10px] opacity-40 hover:opacity-100 uppercase tracking-widest transition-opacity"
      >
        Skip Verification
      </button>
    </motion.div>
  );
}
