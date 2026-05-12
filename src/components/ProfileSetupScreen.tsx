import React, { useState } from 'react';
import { motion } from 'motion/react';
import { audioService } from '../audio';

export function ProfileSetupScreen({ onComplete }: { onComplete: (p: any) => void }) {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [music, setMusic] = useState('');
  const [hobby, setHobby] = useState('');
  const [mbti, setMbti] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (age && gender && city && music && hobby && mbti) {
       audioService.playKeystroke();
       onComplete({ age, gender, city, music, hobby, mbti });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full max-w-lg mx-auto py-4 sm:py-12 justify-center relative"
    >
      <div className="absolute inset-0 pointer-events-none rounded-xl border border-[var(--phos-color)]/20 shadow-[0_0_30px_var(--phos-dim)]" />
      <div className="mb-4 sm:mb-6 text-center px-4">
        <h2 className="text-xl sm:text-2xl fx-holo mb-1 sm:mb-2 uppercase tracking-[0.1em] mt-2 sm:mt-4 font-bold">Establish Identity Matrix</h2>
        <p className="phosphor-dim text-[10px] sm:text-sm mt-1 sm:mt-2">Data encrypted. Only revealed upon mutual agreement.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex flex-col overflow-y-auto px-4 pb-4 scrollbar-hide">
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; Age Range</label>
           <input required type="text" placeholder="e.g. 20-25" value={age} onChange={(e) => { audioService.playKeystroke(); setAge(e.target.value) }} className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; Gender</label>
           <input required type="text" placeholder="e.g. Female" value={gender} onChange={(e) => { audioService.playKeystroke(); setGender(e.target.value) }} className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; City (or Region)</label>
           <input required type="text" placeholder="e.g. Tehran" value={city} onChange={(e) => { audioService.playKeystroke(); setCity(e.target.value) }} className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; Top Music Genre</label>
           <input required type="text" placeholder="e.g. Synthwave" value={music} onChange={(e) => { audioService.playKeystroke(); setMusic(e.target.value) }} className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; Main Hobby</label>
           <input required type="text" placeholder="e.g. Gaming" value={hobby} onChange={(e) => { audioService.playKeystroke(); setHobby(e.target.value) }} className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
           <label className="phosphor-dim uppercase text-xs">&gt; MBTI (or NA)</label>
           <input required type="text" placeholder="e.g. INTP" value={mbti} onChange={(e) => { audioService.playKeystroke(); setMbti(e.target.value) }} className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] transition-colors" />
        </div>
        
        <button type="submit" disabled={!age || !gender || !city || !music || !hobby || !mbti} className="mt-8 relative border border-[var(--phos-color)] bg-[var(--phos-color)]/5 flex-shrink-0 p-3 uppercase tracking-widest hover:bg-[var(--phos-color)]/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors fx-border-shine overflow-hidden group">
          <span className="relative z-10 group-hover:fx-holo transition-all duration-300">Initialize Profile</span>
        </button>
      </form>
    </motion.div>
  );
}
