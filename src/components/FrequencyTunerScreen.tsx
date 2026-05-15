import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { audioService } from '../audio';
import { RadioReceiver, Settings2, Activity } from 'lucide-react';

export function FrequencyTunerScreen({ onTune }: { onTune: (freq: string) => void }) {
  const [freq, setFreq] = useState(88.0);
  const [locked, setLocked] = useState(false);

  const bands = [
    { freq: 88.0, name: 'QUIET NOISE', fa: 'تپش‌های خاموش', desc: 'ارتباط حداقلی، بیشتر شنوندگان خاموش' },
    { freq: 90.2, name: 'ENCRYPTED', fa: 'امواج محرمانه', desc: 'امنیت بالا، مکالمات محرمانه و عمیق' },
    { freq: 101.5, name: 'WIDE OPEN', fa: 'پهنای باند آزاد', desc: 'پچ‌پچ‌های عمومی، برخوردهای غیرقابل پیش‌بینی' },
    { freq: 104.4, name: 'ECHO TALES', fa: 'اکوی داستان‌ها', desc: 'داستان‌سرایان و مخابره‌های طولانی' },
    { freq: 108.0, name: 'STATIC HEAVY', fa: 'نویزهای سوزان', desc: 'آشوبناک، پرشتاب و پر انرژی' }
  ];

  // Find the closest band
  const closestBand = bands.reduce((prev, curr) => 
    Math.abs(curr.freq - freq) < Math.abs(prev.freq - freq) ? curr : prev
  );

  const isTuned = Math.abs(closestBand.freq - freq) < 0.2;

  useEffect(() => {
    if (!locked) {
      if (isTuned) {
        audioService.playAlert();
      }
    }
  }, [isTuned, locked]);

  const handleConfirm = () => {
    setLocked(true);
    audioService.playKeystroke();
    // Simulate some dial up/lock sequence
    let count = 0;
    const interval = setInterval(() => {
       count++;
       audioService.playKeystroke();
       if (count > 5) clearInterval(interval);
    }, 150);

    setTimeout(() => {
      onTune(closestBand.freq.toString());
    }, 1200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-2xl mx-auto justify-center px-4 overflow-hidden relative"
    >
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-[var(--phos-color)] mix-blend-overlay" style={{ opacity: isTuned ? 0 : Math.random() * 0.5 }} />
      </div>

      <div className="mb-8 text-center">
        <h2 className="text-2xl sm:text-3xl fx-holo mb-2 uppercase tracking-[0.2em] flex justify-center items-center gap-3">
          <Settings2 size={24} className={isTuned ? "animate-pulse text-[var(--phos-color)]" : "opacity-30"} />
          FREQUENCY_TUNER
        </h2>
        <div className="text-sm sm:text-base phosphor-dim font-fa">تنظیم فرکانس شبکه</div>
      </div>

      <div className="border border-[var(--phos-color)]/30 bg-black/40 p-6 sm:p-8 relative">
        <div className="absolute top-0 right-0 p-2 opacity-50"><RadioReceiver size={20} /></div>
        
        <div className="flex flex-col items-center mb-8">
          <div className="text-[10px] uppercase font-mono phosphor-dim tracking-widest mb-2">Current Range</div>
          <div className="text-5xl sm:text-7xl font-mono font-bold tracking-tighter text-[var(--phos-color)] drop-shadow-[0_0_15px_var(--phos-color)]">
            {freq.toFixed(1)} <span className="text-xl sm:text-2xl opacity-50">MHz</span>
          </div>
        </div>

        <div className="relative h-16 sm:h-20 mb-8 border-y border-[var(--phos-color)]/20 flex flex-col justify-center">
          {/* Tick marks */}
          <div className="absolute inset-0 flex justify-between pointer-events-none px-2 items-end pb-2 opacity-30">
            {Array.from({ length: 41 }).map((_, i) => (
              <div key={i} className={`w-0.5 bg-[var(--phos-color)] ${i % 10 === 0 ? 'h-6' : i % 5 === 0 ? 'h-4' : 'h-2'}`} />
            ))}
          </div>

          <input 
            type="range" 
            min="88.0" 
            max="108.0" 
            step="0.05"
            value={freq}
            disabled={locked}
            onChange={(e) => {
              setFreq(parseFloat(e.target.value));
              if (Math.random() > 0.5) audioService.playKeystroke();
            }}
            className="w-full h-8 z-10 appearance-none cursor-ew-resize bg-transparent"
             style={{ outline: 'none' }}
          />
          <style jsx>{`
            input[type=range]::-webkit-slider-thumb {
              appearance: none;
              width: 8px;
              height: 40px;
              background: var(--phos-color);
              box-shadow: 0 0 10px var(--phos-color);
              border-radius: 2px;
              cursor: ew-resize;
            }
          `}</style>
          
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[var(--phos-color)]/20 -translate-y-1/2" />
        </div>

        <div className="h-24 sm:h-28 text-center flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {isTuned ? (
              <motion.div 
                key="tuned"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="text-[10px] w-fit px-2 py-0.5 border border-[var(--phos-color)] text-[var(--phos-color)] mb-1 font-mono flex items-center gap-2">
                  <Activity size={10} className="animate-pulse" /> TARGET_LOCKED
                </div>
                <div className="font-bold tracking-widest uppercase phosphor-glow text-lg sm:text-xl">{closestBand.name}</div>
                <div className="text-sm sm:text-lg font-fa opacity-90 mt-1" dir="rtl">{closestBand.fa}</div>
                <div className="text-xs sm:text-sm font-fa opacity-70 mt-2 max-w-sm" dir="rtl">{closestBand.desc}</div>
              </motion.div>
            ) : (
              <motion.div 
                key="static"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="font-mono text-xs uppercase tracking-widest flex flex-col items-center gap-2"
              >
                <span>Scanning frequencies...</span>
                <div className="flex gap-1">
                  <span className="w-1 h-3 bg-[var(--phos-color)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-3 bg-[var(--phos-color)] animate-bounce" style={{ animationDelay: '100ms' }} />
                  <span className="w-1 h-3 bg-[var(--phos-color)] animate-bounce" style={{ animationDelay: '200ms' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8">
         <button 
           onClick={handleConfirm}
           disabled={!isTuned || locked}
           className="w-full border-2 border-[var(--phos-color)] p-4 font-mono uppercase tracking-[0.2em] hover:bg-[var(--phos-color)]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
         >
           <span className="relative z-10 group-hover:phosphor-glow font-bold">{locked ? 'ESTABLISHING_LINK...' : 'CONNECT_BAND'}</span>
           {locked && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--phos-color)]/20 to-transparent animate-[shimmer_1s_infinite]" />}
         </button>
      </div>

    </motion.div>
  );
}
