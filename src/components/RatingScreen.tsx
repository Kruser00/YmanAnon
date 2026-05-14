import React, { useState } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { audioService } from '../audio';
import { socketService } from '../socket';

export function RatingScreen({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  
  const positiveTags = [
    { id: 'thoughtful', en: 'thoughtful', fa: 'متفکر' },
    { id: 'respectful', en: 'respectful', fa: 'محترمانه' },
    { id: 'funny', en: 'funny', fa: 'شوخ‌طبع' },
    { id: 'comforting', en: 'comforting', fa: 'دلگرم‌کننده' },
    { id: 'intelligent', en: 'intelligent', fa: 'با‌هوش' }
  ];
  
  const negativeTags = [
    { id: 'creepy', en: 'creepy', fa: 'عجیب/ترسناک' },
    { id: 'spam', en: 'spam', fa: 'هرزنامه/اسپم' },
    { id: 'rude', en: 'rude', fa: 'بی‌ادب' },
    { id: 'boring', en: 'boring', fa: 'کسل‌کننده' }
  ];

  const handleToggle = (tagId: string) => {
    audioService.playKeystroke();
    setSelected(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
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
      className="flex flex-col h-full max-w-lg mx-auto py-8 sm:py-12 justify-center px-4"
    >
      <div className="mb-8 text-center text-[var(--phos-color)]">
        <h2 className="text-xl sm:text-2xl fx-holo mb-2 uppercase font-bold tracking-widest text-red-500">
          CONNECTION TERMINATED / ارتباط قطع شد
        </h2>
        <p className="opacity-70 text-[10px] sm:text-sm font-mono mt-2 uppercase">
          &gt; Rate your peer. This reinforces network safety.
          <br />
          &gt; به گره مقابل امتیاز دهید. این عمل باعث پایداری شبکه می‌شود.
        </p>
      </div>

      <div className="mb-6 space-y-4 sm:space-y-6">
        <div>
           <div className="uppercase font-mono text-[10px] opacity-50 mb-3 border-b border-[var(--phos-color)]/20 pb-1 flex justify-between">
              <span>Positive Attributes</span>
              <span>ویژگی‌های مثبت</span>
           </div>
           <div className="flex flex-wrap gap-2">
             {positiveTags.map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => handleToggle(tag.id)}
                  className={clsx(
                    "border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 font-mono text-[10px] sm:text-xs uppercase hover:bg-[var(--phos-color)]/20 transition-colors cursor-pointer flex flex-col items-center",
                    selected.includes(tag.id) && "bg-[var(--phos-color)] text-black font-bold shadow-[0_0_10px_var(--phos-color)] border-[var(--phos-color)]"
                  )}
                >
                  <span>{tag.en}</span>
                  <span className="font-sans opacity-70 text-[8px]">{tag.fa}</span>
                </button>
             ))}
           </div>
        </div>

        <div>
           <div className="uppercase font-mono text-[10px] opacity-50 mb-3 border-b border-red-500/20 pb-1 mt-6 flex justify-between">
              <span>Negative Attributes</span>
              <span>ویژگی‌های منفی</span>
           </div>
           <div className="flex flex-wrap gap-2">
             {negativeTags.map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => handleToggle(tag.id)}
                  className={clsx(
                    "border border-red-500/30 text-red-500 px-2 sm:px-3 py-1 font-mono text-[10px] sm:text-xs uppercase hover:bg-red-500/20 transition-colors cursor-pointer flex flex-col items-center",
                    selected.includes(tag.id) && "bg-red-500 text-black font-bold shadow-[0_0_10px_rgba(239,68,68,0.8)] border-red-500"
                  )}
                >
                  <span>{tag.en}</span>
                  <span className="font-sans opacity-70 text-[8px]">{tag.fa}</span>
                </button>
             ))}
           </div>
        </div>
      </div>

      <button 
        onClick={handleSubmit} 
        className="mt-8 border border-[var(--phos-color)] p-3 sm:p-4 uppercase tracking-widest hover:bg-[var(--phos-color)]/20 hover:shadow-[0_0_15px_var(--phos-color)] transition-all flex flex-col items-center"
      >
        <span className="text-xs sm:text-sm">Transmit Feedback & Out</span>
        <span className="font-sans text-[10px] opacity-70 mt-1">ارسال بازخورد و خروج</span>
      </button>

      <button 
        onClick={onComplete} 
        className="mt-4 text-[9px] sm:text-[10px] opacity-40 hover:opacity-100 uppercase tracking-widest transition-opacity flex flex-col items-center"
      >
        <span>Skip Verification</span>
        <span className="font-sans text-[8px]">رد کردن مرحله تایید</span>
      </button>
    </motion.div>
  );
}
