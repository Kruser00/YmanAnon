import React from 'react';
import { motion } from 'motion/react';

export function SelectionScreen({ title, subtitle, farsiTitle, farsiSubtitle, options, onSelect }: { title: string; subtitle: string; farsiTitle?: string; farsiSubtitle?: string; options: { id: string; en: string; fa: string }[]; onSelect: (val: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full max-w-2xl mx-auto py-8 sm:py-12 px-4 overflow-y-auto scrollbar-hide"
    >
      <div className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl phosphor-glow mb-1 uppercase tracking-wider">{title}</h2>
        {farsiTitle && <div className="text-lg sm:text-xl font-fa phosphor-dim mb-4">{farsiTitle}</div>}
        <p className="phosphor-dim text-[10px] sm:text-sm uppercase tracking-tighter">{subtitle}</p>
        {farsiSubtitle && <div className="text-xs sm:text-sm font-fa opacity-60 mt-1">{farsiSubtitle}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {options.map((opt, i) => (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(opt.id)}
            className="text-left border border-[var(--phos-color)]/30 p-4 hover:bg-[var(--phos-color)]/10 hover:border-[var(--phos-color)] transition-colors focus:outline-none focus:bg-[var(--phos-color)]/10 group relative overflow-hidden flex flex-row items-center justify-between"
          >
            <div className="flex items-center">
              <span className="phosphor-dim mr-4 opacity-50 text-[10px] font-mono">0{i+1}</span>
              <span className="phosphor-glow uppercase text-xs sm:text-sm tracking-widest">{opt.en}</span>
            </div>
            <span className="font-fa text-sm sm:text-base opacity-70 group-hover:opacity-100 transition-opacity">{opt.fa}</span>
            <div className="absolute inset-0 bg-[var(--phos-color)] opacity-0 group-hover:opacity-5 transition-opacity" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
