import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Shield, Zap, Activity, CheckCircle2 } from 'lucide-react';
import { audioService } from '../audio';
import { socketService } from '../socket';

export function AdTerminal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [codeChunks, setCodeChunks] = useState<string[]>([]);

  useEffect(() => {
    // Background code leak effect
    const codeSnippets = [
      "void* ptr = malloc(sizeof(uint64_t) * 1024);",
      "for (int i = 0; i < node_id; ++i) { map_signal(i); }",
      "if (auth_token == VALID) { unlock_credits(250); }",
      "while(alive) { mine_data(); contribute_attention(); }",
      "asm { mov eax, ds:[0x8892]; push eax; call relay; }",
      "DATA_MINING_HUB_ACK: SIGNAL_STRENGTH_CRITICAL",
      "0xDEADBEEF >> 0xCAFEBABE",
      "SYN_ACK_FIN_PUSH_RESET_URGENT",
      "REWRITING_MEMORY_CACHE... [OK]",
      "BYPASSING_RESTRICTIONS_0x4...",
      "float signal = noise(uv * 10.0 + iTime);",
      "vector3 pos = get_node_position(sId);",
      "struct User { uint32_t id; char sig[32]; };",
      "template<typename T> class SignalBuffer { ... };",
      "if (is_compromised()) { self_destruct_0x9(); }",
      "volatile uint8_t* p = (uint8_t*)0x4000;",
      "while (!(SPI1->SR & SPI_SR_TXE));",
      "pthread_create(&miner_thread, NULL, async_harvest, NULL);",
      "curl_easy_setopt(curl, CURLOPT_URL, \"https://ram.storage\");",
      "glDispatchCompute(num_groups_x, 1, 1);",
      "unsigned int nonce = brute_force_gate(0xAABBCC);",
      "socket.emit('heartbeat', { ts: Date.now() });",
      "import { entropy } from \"./crypto_core\";",
      "chmod +x ./bypass_v4.sh && sudo ./bypass_v4.sh",
      "grep -r \"admin_password\" /var/log/syslog",
      "rm -rf /sys/fs/cgroup/memory/system.slice"
    ];

    const generateRandomLine = () => {
       const mix = Math.random();
       if (mix < 0.7) {
          return codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
       } else {
          const hex = () => "0x" + Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
          const junk = () => Math.random().toString(36).substring(2, 10).toUpperCase();
          return `${hex()} | ${junk()} | ${hex()} | ${junk()}`;
       }
    };

    const codeTimer = setInterval(() => {
      setCodeChunks(prev => [generateRandomLine(), ...prev.slice(0, 15)]);
    }, 400);

    const sequences = [
      { text: ">>> CONNECTING TO DATA_MINING_HUB_01...", delay: 500 },
      { text: ">>> HANDSHAKE: SUCCESS. PROTOCOL: B-AD_64", delay: 1200 },
      { text: ">>> INJECTING PROMOTIONAL DATA MATRIX...", delay: 2000 },
      { text: ">>> HARVESTING ATTENTION_UNITS [30s EXPECTED]", delay: 3000 },
      { text: ">>> AD_ID: 0x8892_VIRTUAL_REALITY_UPGRADE", delay: 4000 },
      { text: ">>> AD_TEXT: 'UPGRADE YOUR BIOWARE TODAY. WHY FEEL REAL WHEN YOU CAN FEEL MORE?'", delay: 6000 },
      { text: ">>> AD_TEXT: 'NEW NEURAL LINKS AVAILABLE AT SECTOR 4.'", delay: 9000 },
      { text: ">>> EXTRACTING TOKEN_REWARDS...", delay: 12000 },
      { text: ">>> ALIGNING REVENUE_STREAMS...", delay: 15000 },
      { text: ">>> DATA_MINING: 100% COMPLETE.", delay: 18000 },
      { text: ">>> REWARD_CLAIM_READY. BROADCASTING TO NODE.", delay: 19000 }
    ];

    sequences.forEach(s => {
      setTimeout(() => {
        setLogs(prev => [...prev.slice(-8), s.text]);
        audioService.playKeystroke();
      }, s.delay);
    });

    const progressTimer = setInterval(() => {
       setProgress(prev => {
          if (prev >= 100) {
             clearInterval(progressTimer);
             return 100;
          }
          return prev + (1 / 2); // Roughly 20 seconds
       });
    }, 100);

    const completionTimer = setTimeout(() => {
      setStep(1); // Ready to claim
    }, 20000);

    return () => {
       clearInterval(progressTimer);
       clearTimeout(completionTimer);
    };
  }, []);

  const claimReward = () => {
    socketService.emit('claim_ad_reward', {});
    onComplete();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-full items-center justify-center space-y-6 max-w-md mx-auto relative overflow-hidden"
    >
      {/* Background Code Leak */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] font-mono text-[7px] sm:text-[9px] overflow-hidden select-none whitespace-nowrap p-4 leading-relaxed z-0">
        {codeChunks.map((line, i) => (
          <motion.div 
            key={`${i}-${line}`} 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="text-yellow-500 mb-1"
          >
            {line}
          </motion.div>
        ))}
      </div>

      <div className="text-center space-y-2 relative z-10">
        <Database size={48} className="mx-auto text-yellow-500 phosphor-glow animate-pulse" />
        <h2 className="text-xl font-bold phosphor-glow tracking-widest uppercase">DATA_MINING Terminal</h2>
        <p className="text-[10px] opacity-60 font-mono tracking-tighter">CONTRIBUTE ATTENTION_UNITS TO FUEL YOUR SIGNAL</p>
      </div>

      <div className="w-full bg-black/40 border border-[var(--phos-color)]/20 p-4 font-mono text-[9px] sm:text-xs min-h-[160px] flex flex-col justify-end space-y-1 relative z-10 backdrop-blur-sm">
        {logs.map((log, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-yellow-500/80 mr-2">&gt;</span>
            {log}
          </motion.div>
        ))}
      </div>

      <div className="w-full space-y-2 relative z-10">
        <div className="flex justify-between text-[10px] font-mono opacity-50 uppercase tracking-widest">
           <span>Mining Progress</span>
           <span>{Math.floor(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-[var(--phos-color)]/10 relative overflow-hidden">
           <motion.div 
             className="absolute top-0 left-0 h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
             animate={{ width: `${progress}%` }}
           />
        </div>
      </div>

      <AnimatePresence>
        {step === 1 ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={claimReward}
            className="w-full py-4 border-2 border-yellow-500 bg-yellow-500/10 text-yellow-500 font-bold uppercase tracking-[0.3em] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-3 phosphor-glow active:scale-95 relative z-10"
          >
            <CheckCircle2 size={20} />
            Claim 250 Credits
          </motion.button>
        ) : (
          <div className="flex items-center gap-3 text-[10px] uppercase opacity-40 animate-pulse tracking-[0.2em] relative z-10">
            <Activity size={14} />
            Mining in progress... Do not disconnect
          </div>
        )}
      </AnimatePresence>

      <button onClick={onComplete} className="text-[9px] uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity relative z-10">
        [ ABORT_SEQUENCE ]
      </button>
    </motion.div>
  );
}
