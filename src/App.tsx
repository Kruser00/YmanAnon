import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from './socket';
import { audioService } from './audio';
import { Terminal, ShieldAlert, Cpu, Heart, Coins, Eye, User, Navigation, Monitor, Volume2, VolumeX, TrendingUp, Box, Database, Award, Search, Filter } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { doc, onSnapshot, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppState = 'START' | 'BOOT' | 'PROFILE' | 'DASHBOARD' | 'MOOD' | 'INTENT' | 'MATCHING' | 'CHAT_BOOT' | 'CHAT' | 'ORACLE' | 'RATING' | 'DATA_BROKER' | 'CHAT_STATS';
type Theme = 'green' | 'amber';

export default function App() {
  const [appState, setAppState] = useState<AppState>('START');
  const [profile, setProfile] = useState<{ age: string, gender: string, city: string, music: string, hobby: string, mbti: string }>({ age: '', gender: '', city: '', music: '', hobby: '', mbti: ''});
  const [mood, setMood] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [clearance, setClearance] = useState<number>(1);
  const [reputation, setReputation] = useState<{ positive: number, negative: number }>({ positive: 0, negative: 0 });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [chatStats, setChatStats] = useState<{ duration: number, rank: string, messageCount: number } | null>(null);
  const [voidMessages, setVoidMessages] = useState<Array<{ text: string, timestamp: number }>>([]);
  const [atmosphere, setAtmosphere] = useState<{ moods: Record<string, number>, online: number }>({ moods: {}, online: 0 });
  const [theme, setTheme] = useState<Theme>('green');
  const [nodeId, setNodeId] = useState<string | null>(null);

  useEffect(() => {
    let savedId = localStorage.getItem('terminal_node_id');
    if (!savedId) {
      savedId = `NODE_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      localStorage.setItem('terminal_node_id', savedId);
    }
    setNodeId(savedId);
  }, []);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    socketService.connect();

    socketService.on('match_found', (data: any) => {
      setRoomId(data.roomId);
      setTopic(data.topic);
      if (!isMuted) audioService.playMatchFound();
      setAppState('CHAT_BOOT');
    });

    socketService.on('partner_disconnected', () => {
      // Handled by chat_terminated now
    });

    socketService.on('chat_terminated', (data: any) => {
      setChatStats(data);
      setAppState('CHAT_STATS');
    });

    socketService.on('void_broadcast', (data: any) => {
      setVoidMessages(prev => [data, ...prev].slice(0, 3));
    });

    socketService.on('atmosphere_data', (data: any) => {
      setAtmosphere(data);
    });

    socketService.on('atmosphere_updated', (data: any) => {
      setAtmosphere(data);
    });

    socketService.on('points_updated', (data: any) => {
      setPoints(data.points);
    });

    socketService.on('user_state_sync', (data: any) => {
      if (data.points !== undefined) setPoints(data.points);
      if (data.clearance !== undefined) setClearance(data.clearance);
      if (data.reputation !== undefined) setReputation(data.reputation);
    });

    return () => {
      socketService.off('match_found', () => {});
      socketService.off('points_updated', () => {});
    };
  }, [isMuted]);

  const handleJoinPool = (selectedIntent: string) => {
    if (!isMuted) audioService.playKeystroke();
    setIntent(selectedIntent);
    setAppState('MATCHING');
    socketService.emit('join_pool', { mood, intent: selectedIntent, profile, nodeId });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'green' ? 'amber' : 'green');
  };

  const toggleAudioMute = () => {
    audioService.init(); // just in case
    const muted = audioService.toggleMute();
    setIsMuted(muted);
    if (!muted) {
       audioService.startBGM(); 
    }
  };

  return (
    <div className="crt-screen h-screen w-screen overflow-hidden bg-black selection:bg-[var(--phos-color)] selection:text-black">
      <div className="crt-overlay" />
      <div className="crt-bottom-fade" />
      <div className="crt-curve h-full w-full relative flex flex-col">
        <BackgroundCode mood={mood} corruption={clearance > 1 ? 5 : 0} />
        
        <div className="flex-1 p-4 sm:p-8 flex flex-col pointer-events-auto z-10 overflow-hidden">
        {/* Header HUD */}
        <header className="flex justify-between items-center border-b border-[var(--phos-color)]/30 pb-2 mb-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Terminal size={18} className="text-[var(--phos-color)] cursor-pointer" onClick={() => { if(appState !== 'START' && appState !== 'BOOT') setAppState('DASHBOARD'); }} />
              <span className="phosphor-glow font-bold tracking-widest uppercase cursor-pointer" onClick={() => { if(appState !== 'START' && appState !== 'BOOT') setAppState('DASHBOARD'); }}>
                TERMINAL.FA
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono opacity-60">
              <span className="flex items-center gap-1"><Cpu size={10} /> {nodeId}</span>
              <span className="hidden sm:inline border-l border-[var(--phos-color)]/30 pl-3 uppercase">Sec_Mesh_Active</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Global Identity Stats */}
            {appState !== 'BOOT' && appState !== 'START' && (
              <>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-yellow-400">
                    <Coins size={12} className="animate-pulse sm:w-3.5 sm:h-3.5" />
                    <span className="text-xs sm:text-base font-bold font-mono">{points}</span>
                  </div>
                  <div className="text-[7px] uppercase tracking-tighter opacity-50 font-mono">SIGNAL_FUEL</div>
                </div>
                
                <div className="hidden xs:flex flex-col items-end border-l border-[var(--phos-color)]/20 pl-4">
                  <div className="flex items-center gap-1.5 text-red-500">
                    <Heart size={14} />
                    <span className="text-sm sm:text-base font-bold font-mono">+{reputation.positive}</span>
                  </div>
                  <div className="text-[7px] uppercase tracking-tighter opacity-50 font-mono">MESH_REPUTATION</div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 border-l border-[var(--phos-color)]/20 pl-4">
              <button
                onClick={toggleAudioMute}
                className="p-1 hover:bg-[var(--phos-color)]/10 rounded transition-colors text-[var(--phos-color)] opacity-70 hover:opacity-100"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button
                onClick={toggleTheme}
                className="p-1 hover:bg-[var(--phos-color)]/10 rounded transition-colors text-[var(--phos-color)] opacity-70 hover:opacity-100"
                title="Toggle Retro Terminal Theme"
              >
                <Monitor size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {appState === 'START' && (
               <motion.div 
                 key="start"
                 exit={{ opacity: 0 }}
                 className="flex h-full items-center justify-center cursor-pointer"
                 onClick={() => {
                   audioService.init();
                   if (!isMuted) audioService.playKeystroke();
                   if (!isMuted) audioService.startBGM(); // Start background drone
                   setAppState('BOOT');
                 }}
               >
                 <span className="phosphor-glow animate-pulse text-lg uppercase">&gt; PRESS ANY KEY TO INITIALIZE TERMINAL</span>
               </motion.div>
            )}

            {appState === 'BOOT' && <BootSequence key="boot" onComplete={() => setAppState('PROFILE')} />}
            
            {appState === 'PROFILE' && (
              <ProfileSetupScreen 
                 key="profile"
                 onComplete={(p) => {
                    setProfile(p);
                    setAppState('DASHBOARD');
                 }}
              />
            )}

            {appState === 'DASHBOARD' && (
              <DashboardScreen
                 key="dashboard"
                 onFindConnection={() => setAppState('MOOD')}
                 onOpenOracle={() => setAppState('ORACLE')}
                 onOpenBroker={() => setAppState('DATA_BROKER')}
                 reputation={reputation}
                 clearance={clearance}
                 voidMessages={voidMessages}
                 atmosphere={atmosphere}
              />
            )}

            {appState === 'DATA_BROKER' && (
              <DataBrokerScreen
                 key="broker"
                 onBack={() => setAppState('DASHBOARD')}
                 points={points}
                 clearance={clearance}
              />
            )}

            {appState === 'ORACLE' && (
              <OracleScreen
                 key="oracle"
                 onBack={() => setAppState('DASHBOARD')}
                 clearance={clearance}
                 nodeId={nodeId}
                 points={points}
              />
            )}

            {appState === 'MOOD' && (
              <SelectionScreen 
                key="mood"
                title="SYS > HOW_ARE_YOU_FEELING?"
                subtitle="Select current emotional parameter."
                options={['lonely', 'happy', 'curious', 'bored', 'anxious', 'thoughtful', 'energetic']}
                onSelect={(m) => {
                  audioService.playKeystroke();
                  setMood(m);
                  setAppState('INTENT');
                }}
              />
            )}

            {appState === 'INTENT' && (
              <SelectionScreen 
                key="intent"
                title="SYS > WHAT_ARE_YOU_SEEKING?"
                subtitle="Calibrate matching engine intent."
                options={['deep conversation', 'random fun', 'advice', 'listening', 'debate', 'storytelling']}
                onSelect={handleJoinPool}
              />
            )}

            {appState === 'MATCHING' && <MatchingScreen key="matching" onCancel={() => {
              socketService.emit('leave_pool', {});
              setAppState('DASHBOARD');
            }} />}
            
            {appState === 'CHAT_BOOT' && <ChatBootSequence key="chatboot" onComplete={() => setAppState('CHAT')} />}

            {appState === 'CHAT' && (
              <ChatScreen 
                key="chat" 
                topic={topic || ""} 
                roomId={roomId!}
                points={points}
                nodeId={nodeId}
                onPointsSpent={(cost, type) => {
                  audioService.playKeystroke();
                  socketService.emit('propose_reveal', { cost, type: type.toLowerCase() });
                }}
              />
            )}

            {appState === 'CHAT_STATS' && (
              <ConversationStatsScreen 
                key="stats"
                stats={chatStats}
                onNext={() => setAppState('RATING')}
              />
            )}

            {appState === 'RATING' && (
              <RatingScreen 
                key="rating"
                onComplete={() => setAppState('DASHBOARD')}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
  );
}

// ---------------------------
// VIEW COMPONENTS
// ---------------------------

function BackgroundCode({ mood, corruption = 0 }: { mood?: string | null, corruption?: number }) {
  const [leakedLines, setLeakedLines] = useState<string[]>([]);
  
  const instructions = ['LOAD', 'STORE', 'JMP', 'CALL', 'RET', 'PUSH', 'POP', 'ADD', 'SUB', 'XOR', 'CMP', 'SYS.ALLOC', 'SYS.FREE', 'MOV', 'NOP', 'INT', 'HALT', 'STI', 'CLI', 'SHL', 'SHR'];
  const registers = ['REG_A', 'REG_B', 'REG_X', 'REG_Y', 'EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP', 'FLAGS'];

  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    const interval = setInterval(() => {
      const addr = `0x${(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase().slice(0,6)}`;
      const instr = instructions[Math.floor(Math.random() * instructions.length)];
      const reg = registers[Math.floor(Math.random() * registers.length)];
      const val = `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}`;
      
      let newLine = `${addr} ${instr} ${reg}, ${val}`;
      const crit = Math.random();
      if (crit < 0.05 && mood) newLine = `${addr} CRITICAL_EMOTION_${mood.toUpperCase()}`;
      else if (crit < 0.15) newLine = `${addr} ERR_MEM_LEAK_AT_${val}`;

      setLeakedLines(prev => [...prev.slice(isMobile ? -40 : -80), newLine]);
    }, isMobile ? 400 : (250 - (corruption * 20)));

    return () => clearInterval(interval);
  }, [mood, corruption]);

  return (
    <div className={clsx(
      "absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10",
      corruption > 3 ? "fx-jitter" : "",
      corruption > 0 ? "blur-[0.6px]" : "blur-[0.2px]"
    )}>
      <div className={clsx(
        "flex flex-col font-mono text-[8px] sm:text-[9px] leading-tight text-[var(--phos-color)]",
        corruption > 4 ? "fx-leak-blur" : ""
      )}>
        {leakedLines.map((line, i) => (
          <div 
            key={i} 
            className={clsx(
              "whitespace-nowrap",
              line.includes('ERR') ? 'text-red-500 font-bold' : '',
              line.includes('CRITICAL') ? 'text-yellow-400' : ''
            )}
          >
            {line}
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

function BootSequence({ onComplete }: { key?: string, onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const bootSteps = [
      { text: 'BIOS Check... OK', delay: 300 },
      { text: 'Loading memory blocks... [1024 OK]', delay: 600 },
      { text: 'Initializing neural engine...', delay: 1000 },
      { text: 'Establishing secure websocket...', delay: 1500 },
      { text: 'Bypass protocol active...', delay: 2000 },
      { text: 'Loading anonymity layer...', delay: 2500 },
      { text: 'Generating unique identity matrix...', delay: 3000 },
      { text: 'Terminal.fa ready.', delay: 3800 }
    ];

    bootSteps.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLogs(prev => [...prev, text]);
        setProgress(Math.floor((delay / 4000) * 100));
        audioService.playKeystroke();
      }, delay);
    });

    const timer = setTimeout(onComplete, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      className="flex flex-col items-center justify-center h-full max-w-md mx-auto w-full space-y-4"
    >
      <Cpu size={48} className="text-[var(--phos-color)] mb-4 animate-pulse opacity-80" />
      <span className="phosphor-glow text-xl tracking-widest text-center">INITIALIZING TERMINAL.FA</span>
      
      <div className="w-full flex-col flex text-left font-mono text-xs space-y-1 mt-6 px-4">
         {logs.map((log, i) => (
           <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
             <span className="opacity-50 inline-block w-24">[{new Date().toISOString().substring(11,23)}]</span>
             <span className="phosphor-glow ml-2">{log}</span>
           </motion.div>
         ))}
      </div>

      <div className="w-full px-4 mt-8">
        <div className="w-full h-1 bg-[var(--phos-color)]/20 relative overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-[var(--phos-color)]"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <div className="text-right text-[10px] font-mono opacity-50 mt-1 uppercase">{progress}% allocated</div>
      </div>
    </motion.div>
  );
}

function ProfileSetupScreen({ onComplete }: { key?: string, onComplete: (p: any) => void }) {
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

function SelectionScreen({ title, subtitle, options, onSelect }: { key?: string, title: string; subtitle: string; options: string[]; onSelect: (val: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full max-w-2xl mx-auto py-12"
    >
      <div className="mb-12">
        <h2 className="text-2xl phosphor-glow mb-2">{title}</h2>
        <p className="phosphor-dim">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt, i) => (
          <motion.button
            key={opt}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(opt)}
            className="text-left border border-[var(--phos-color)]/30 p-4 hover:bg-[var(--phos-color)]/10 hover:border-[var(--phos-color)] transition-colors focus:outline-none focus:bg-[var(--phos-color)]/10 group relative overflow-hidden"
          >
            <span className="phosphor-dim mr-4 opacity-50 text-xs">0{i+1}</span>
            <span className="phosphor-glow uppercase">{opt}</span>
            <div className="absolute inset-0 bg-[var(--phos-color)] opacity-0 group-hover:opacity-5 transition-opacity" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function MatchingScreen({ onCancel }: { key?: string, onCancel?: () => void }) {
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

function ConversationStatsScreen({ stats, onNext }: { key?: string, stats: any, onNext: () => void }) {
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

function RatingScreen({ onComplete }: { key?: string, onComplete: () => void }) {
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
                    selected.includes(tag) && "bg-[var(--phos-color)] text-[var(--bg-color)] font-bold shadow-[0_0_10px_var(--phos-color)]"
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

function DataBrokerScreen({ onBack, points, clearance }: { key?: string, onBack: () => void, points: number, clearance: number }) {
  const [logs, setLogs] = useState<string[]>(['[DATA BROKER] Connection established.']);

  const logAction = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
    audioService.playKeystroke();
  };

  const buyClearance = () => {
    if (points >= 500) {
      socketService.emit('buy_clearance');
      logAction('>> Requesting Level 2 Clearance clearance...');
    } else {
      logAction('!! Insufficient funds for clearance upgrade.');
    }
  };

  const buyIntel = () => {
    if (points >= 50) {
      logAction('>> Purchasing regional metadata (simulated)...');
      socketService.emit('spend_points', { amount: 50 });
      setTimeout(() => logAction('>> Intel: "Synthwave" listeners are active in sector 4.'), 1000);
    } else {
      logAction('!! Insufficient funds for intel.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-2xl mx-auto py-8 justify-center relative"
    >
      <div className="mb-4 text-center border-b border-[var(--phos-color)]/30 pb-4 relative z-10 px-4">
        <h2 className="text-2xl fx-holo mb-2 uppercase tracking-[0.2em]">DATA BROKER</h2>
        <p className="phosphor-dim text-sm mt-2 font-mono">&gt; Spend pts to acquire privileged data and access rights.</p>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row gap-6 p-4">
         <div className="flex-1 space-y-4">
            <h3 className="font-mono text-xs uppercase opacity-70 border-b border-[var(--phos-color)]/20 pb-1">Available Contracts</h3>
            
            <button onClick={buyIntel} className="w-full border border-[var(--phos-color)] p-4 hover:bg-[var(--phos-color)]/10 text-left group transition-all">
               <div className="font-mono font-bold group-hover:fx-holo">Regional Intel snippet</div>
               <div className="flex justify-between items-center mt-2 text-xs opacity-70 font-mono">
                 <span>Random global matching data.</span>
                 <span className="text-yellow-400">50 PTS</span>
               </div>
            </button>

            <button onClick={buyClearance} disabled={clearance > 1} className="w-full border border-[var(--phos-color)] p-4 hover:bg-[var(--phos-color)]/10 text-left group transition-all disabled:opacity-30 disabled:hover:bg-transparent">
               <div className="font-mono font-bold group-hover:fx-holo">Security Clearance Level 2</div>
               <div className="flex justify-between items-center mt-2 text-xs opacity-70 font-mono">
                 <span>Unlock premium Oracle threads.</span>
                 <span className="text-yellow-400">500 PTS</span>
               </div>
            </button>
         </div>
         <div className="flex-1 border border-[var(--phos-color)]/20 p-4 bg-black/40 flex flex-col font-mono text-xs overflow-hidden h-48 sm:h-auto">
            <h3 className="uppercase opacity-70 border-b border-[var(--phos-color)]/20 pb-1 mb-2">Terminal Logs</h3>
            <div className="flex-1 overflow-y-auto space-y-2 opacity-80">
               {logs.map((log, i) => (
                 <div key={i} className={i === 0 ? 'text-[var(--phos-color)]' : 'opacity-50'}>{log}</div>
               ))}
            </div>
         </div>
      </div>
      
      <div className="px-4 mt-6">
        <button onClick={() => { audioService.playKeystroke(); onBack(); }} className="border border-[var(--phos-color)] px-6 py-2 uppercase font-mono text-xs hover:bg-[var(--phos-color)]/20 transition-all opacity-80 hover:opacity-100">
          &lt; Return to Dashboard
        </button>
      </div>
    </motion.div>
  );
}
function DashboardScreen({ onFindConnection, onOpenOracle, onOpenBroker, reputation, clearance, voidMessages, atmosphere }: { key?: string, onFindConnection: () => void, onOpenOracle: () => void, onOpenBroker: () => void, reputation: { positive: number, negative: number }, clearance: number, voidMessages: any[], atmosphere: any }) {
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
          <div className="space-y-1 sm:space-y-2 font-mono text-[9px] max-h-[140px] overflow-y-auto overflow-x-hidden pr-2">
            {Object.entries(atmosphere.moods).length === 0 ? (
               <div className="opacity-30 italic">SIGNAL_OFFLINE...</div>
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

function OracleScreen({ onBack, clearance, nodeId, points }: { key?: string, onBack: () => void, clearance: number, nodeId: string | null, points: number }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [input, setInput] = useState('');
  const [bounty, setBounty] = useState(0);
  const [filter, setFilter] = useState<'active' | 'archive'>('active');

  useEffect(() => {
     socketService.emit('request_oracle', {});
     socketService.on('oracle_data', (data) => setThreads(data));
     socketService.on('oracle_updated', () => socketService.emit('request_oracle', {}));
  }, []);

  const handlePostThread = (e: React.FormEvent) => {
    e.preventDefault();
    if(input.trim()) {
       audioService.playKeystroke();
       socketService.emit('post_oracle_thread', { question: input, bounty, nodeId });
       setInput('');
       setBounty(0);
    }
  };

  const handlePostAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if(input.trim() && activeThread) {
       audioService.playKeystroke();
       socketService.emit('post_oracle_answer', { threadId: activeThread.id, text: input, nodeId });
       setInput('');
    }
  };

  const handleVouch = (threadId: string, answerId: string) => {
     audioService.playAlert();
     socketService.emit('vouch_answer', { threadId, answerId, nodeId });
  };

  const handleResolve = () => {
    if (activeThread && activeThread.authorId === nodeId) {
      audioService.playAlert();
      socketService.emit('resolve_thread', { threadId: activeThread.id, nodeId });
      setActiveThread(null);
    }
  };

  const filteredThreads = threads.filter(t => filter === 'archive' ? t.isResolved : !t.isResolved);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full max-w-4xl mx-auto relative px-2 sm:px-0"
    >
       <div className="absolute -top-2 right-0 flex gap-2 z-20">
         <button 
           onClick={() => { audioService.playKeystroke(); setFilter(filter === 'active' ? 'archive' : 'active'); }}
           className={cn(
             "p-2 text-[10px] font-mono uppercase border transition-colors",
             filter === 'archive' ? "bg-[var(--phos-color)] text-black border-[var(--phos-color)]" : "hover:bg-[var(--phos-color)]/20 border-[var(--phos-color)]/30 text-[var(--phos-color)] bg-black/60"
           )}
         >
            {filter === 'active' ? <Database size={12} className="inline mr-1" /> : <TrendingUp size={12} className="inline mr-1" />}
            {filter === 'active' ? 'Archive' : 'Active'}
         </button>
         <button onClick={() => { audioService.playKeystroke(); onBack(); }} className="p-2 hover:bg-[var(--phos-color)]/20 text-[10px] font-mono uppercase border border-[var(--phos-color)]/30 text-red-400 bg-black/60">
            &lt; Return
         </button>
       </div>

       <div className="border-b border-[var(--phos-color)]/30 pb-3 mb-4 mt-8 sm:mt-0">
         <h2 className="text-xl sm:text-2xl phosphor-glow uppercase tracking-widest flex items-center gap-2">
           {filter === 'active' ? <Eye size={20} /> : <Database size={20} />} 
           {filter === 'active' ? 'THE ORACLE' : 'GLOBAL ARCHIVE'}
         </h2>
         <p className="phosphor-dim text-[10px] sm:text-sm font-mono mt-1">
           {filter === 'active' ? '> Knowledge exchange for points and reputation.' : '> Permanent fragments of verified wisdom.'}
         </p>
       </div>

       {!activeThread ? (
         <div className="flex flex-col flex-1 overflow-hidden min-h-0">
           {filter === 'active' && (
             <form onSubmit={handlePostThread} className="mb-4 sm:mb-6 flex flex-col gap-2 border border-[var(--phos-color)]/10 p-3 bg-black/20">
               <input 
                  type="text" 
                  value={input}
                  onChange={e => { audioService.playKeystroke(); setInput(e.target.value) }}
                  placeholder="Ask a question to the mesh..."
                  className="bg-transparent border-b border-[var(--phos-color)]/30 p-2 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] font-mono text-xs sm:text-sm"
               />
               <div className="flex justify-between items-center mt-1">
                 <div className="flex items-center gap-2">
                   <span className="text-[10px] uppercase opacity-50 font-mono">Bounty (pts):</span>
                   <input 
                     type="number"
                     min={0}
                     max={points}
                     step={50}
                     value={bounty} 
                     onChange={(e) => { audioService.playKeystroke(); setBounty(Math.max(0, Number(e.target.value))); }}
                     className="bg-black border border-[var(--phos-color)]/30 text-[var(--phos-color)] text-[10px] font-mono px-2 py-1 outline-none w-20"
                     placeholder="0"
                   />
                 </div>
                 <button type="submit" disabled={!input} className="border border-[var(--phos-color)] px-4 py-1 uppercase font-mono text-[10px] sm:text-xs hover:bg-[var(--phos-color)]/20 disabled:opacity-30 flex items-center gap-2">
                   <TrendingUp size={12} /> Transmit Query
                 </button>
               </div>
             </form>
           )}

           <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 font-mono scrollbar-hide pb-10">
             {filteredThreads.length === 0 ? (
               <div className="text-center py-20 opacity-30 font-mono italic text-sm">-- No fragments found in this sector --</div>
             ) : (
               filteredThreads.map(t => (
                  <div key={t.id} onClick={() => { audioService.playKeystroke(); setActiveThread(t) }} className="border border-[var(--phos-color)]/20 p-3 sm:p-4 hover:border-[var(--phos-color)]/60 cursor-pointer transition-colors group relative overflow-hidden">
                     {t.bounty > 0 && (
                       <div className="absolute top-0 right-0 bg-yellow-400 text-black px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-tighter">
                         +{t.bounty} PTS
                       </div>
                     )}
                     <div className="text-sm sm:text-lg phosphor-glow mb-1 sm:mb-2 leading-tight pr-14">{t.question}</div>
                     <div className="flex items-center gap-3 text-[9px] sm:text-xs opacity-60 uppercase">
                       <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                       <span className="flex items-center gap-1"><Box size={10} /> {t.answers?.length || 0} Resp.</span>
                       {t.isResolved && <span className="text-green-500 flex items-center gap-1"><Award size={10} /> Resolved</span>}
                       <span className="opacity-0 group-hover:opacity-100 ml-auto transition-opacity text-[var(--phos-color)]">&gt; {t.isResolved ? 'Inspect' : 'Contribute'}</span>
                     </div>
                  </div>
               ))
             )}
           </div>
         </div>
       ) : (
         <div className="flex flex-col flex-1 min-h-0 font-mono overflow-hidden">
            <button onClick={() => { audioService.playKeystroke(); setActiveThread(null) }} className="self-start text-[9px] sm:text-xs uppercase opacity-80 hover:opacity-100 hover:bg-[var(--phos-color)]/20 mb-3 flex items-center gap-1 border border-[var(--phos-color)]/30 px-2 py-1 transition-colors">
              &lt; RETURN TO DIRECTORY
            </button>
            <div className="relative border border-[var(--phos-color)]/40 p-4 mb-4 sm:mb-6 bg-[var(--phos-color)]/5">
              <div className="text-lg sm:text-2xl phosphor-glow leading-relaxed">
                {activeThread.question}
              </div>
              {activeThread.bounty > 0 && !activeThread.isResolved && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400 px-2 py-0.5 rounded-full text-yellow-400 text-[9px] font-bold">
                  <Coins size={10} /> BOUNTY: {activeThread.bounty} PTS
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 mb-4 scrollbar-hide">
              {!activeThread.answers || activeThread.answers.length === 0 ? (
                 <div className="opacity-50 text-center py-10 text-xs sm:text-sm uppercase">&gt; NO RESPONSES RECEIVED YET</div>
              ) : activeThread.answers.map((a: any, idx: number) => (
                 <div key={idx} className="border-l-2 border-[var(--phos-color)]/40 pl-3 py-2 bg-black/10 relative group">
                    <div className="mb-1 text-xs sm:text-sm leading-relaxed">{a.text}</div>
                    <div className="flex justify-between items-center">
                       <div className="text-[8px] sm:text-[10px] opacity-40 uppercase">{new Date(a.timestamp).toLocaleString()} // {a.vouchCount > 5 ? 'VERIFIED EXPERT' : 'ANONYMOUS'}</div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleVouch(activeThread.id, a.id); }}
                         className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] sm:text-[10px] border border-[var(--phos-color)]/30 px-2 hover:bg-[var(--phos-color)]/20 uppercase"
                       >
                         Commend (+5 Rep)
                       </button>
                    </div>
                 </div>
              ))}
            </div>

              {!activeThread.isResolved && (
                <div className="flex gap-2 pb-2">
                 <input 
                    type="text" 
                    value={input}
                    onChange={e => { audioService.playKeystroke(); setInput(e.target.value) }}
                    placeholder="Inject knowledge fragment..."
                    className="flex-1 bg-transparent border border-[var(--phos-color)]/30 p-2 sm:p-3 text-[var(--phos-color)] focus:outline-none focus:border-[var(--phos-color)] font-mono text-xs sm:text-sm"
                    autoFocus 
                 />
                 <button onClick={handlePostAnswer} disabled={!input} className="border border-[var(--phos-color)] px-4 sm:px-6 uppercase font-mono text-xs sm:text-sm hover:bg-[var(--phos-color)]/20 disabled:opacity-30">Contribute</button>
               </div>
              )}
              
              {!activeThread.isResolved && activeThread.authorId === nodeId && (
                <button 
                  onClick={handleResolve}
                  className="w-full border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-500 p-2 uppercase font-mono text-xs hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Award size={14} /> Resolve & Award Bounty
                </button>
              )}
         </div>
       )}
    </motion.div>
  );
}

function ChatBootSequence({ onComplete }: { key?: string, onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    audioService.playBootUp();
    
    let isMounted = true;
    let i = 0;
    
    // Simulate rapid retro terminal output
    const interval = setInterval(() => {
      if (!isMounted) return;
      const memLoc = `0x${(Math.random() * 0xFFFFF).toString(16).padStart(5, '0').toUpperCase()}`;
      const size = Math.floor(Math.random() * 90) + 10;
      
      const lines = [
         `[SYS] ALLOCATING BUFFER ${memLoc} ... OK`,
         `[DRV] START MODEM HANDSHAKE ... WAIT`,
         `[NET] NEGOTIATING BAUD RATE ... 56000`,
         `[SEC] EXCHANGING ENCRYPTION KEYS [RSA-4096]`,
         `[INT] RESOLVING PEER IDENTITY MATRIX ...`,
         `[SYS] DOWNLOAD SEED: [${Array(20).fill(0).map(()=>Math.random()>0.5?'1':'0').join('')}]`,
         `[MOD] SYNCING FREQUENCY SHIFT KEYING ... DONE`
      ];
      
      setLogs(prev => [...prev.slice(-15), lines[i % lines.length] + ` ... TIME:${Date.now()%1000}ms`]);
      i++;
    }, 100);

    const timer = setTimeout(() => {
      clearInterval(interval);
      onComplete();
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-start justify-end h-full p-8 font-mono text-xs overflow-hidden"
    >
      <div className="flex flex-col space-y-1 w-full text-left">
        {logs.map((log, idx) => (
          <div key={idx} className="phosphor-dim opacity-70 w-full whitespace-nowrap overflow-hidden text-ellipsis">
             &gt; {log}
          </div>
        ))}
      </div>
      <div className="mt-8 text-center w-full">
        <span className="phosphor-glow uppercase text-xl animate-pulse tracking-[0.3em]">CONNECTION ACTIVE</span>
      </div>
    </motion.div>
  );
}

function ChatScreen({ topic, roomId, points, onPointsSpent, nodeId }: { key?: string, topic: string, roomId: string, points: number, onPointsSpent: (c: number, t: string) => void, nodeId: string | null }) {
  const [messages, setMessages] = useState<Array<{ id: string, text: string, isSelf: boolean, system?: boolean }>>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add initial system message
    setMessages([{
      id: 'sys-1',
      text: `CONNECTION ESTABLISHED. TOPIC: "${topic}". REMEMBER: Identity is earned, not given.`,
      isSelf: false,
      system: true
    }]);

    const handleReceive = (data: any) => {
      audioService.playKeystroke();
      setMessages(prev => [...prev, { id: data.id, text: data.text, isSelf: false, boost: data.boost }]);
    };
    
    const handleSystem = (data: any) => {
      audioService.playAlert();
      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isSelf: false, system: true }]);
    };

    const handlePartnerDisconnect = () => {
      setMessages(prev => [...prev, { id: 'sys-dis', text: 'PARTNER HAS DISCONNECTED.', isSelf: false, system: true }]);
    };

    const handleMessageUpdate = (data: any) => {
       setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, boost: data.boost } : m));
    };

    socketService.on('receive_message', handleReceive);
    socketService.on('system_message', handleSystem);
    socketService.on('partner_disconnected', handlePartnerDisconnect);
    socketService.on('message_updated', handleMessageUpdate);

    return () => {
      socketService.off('receive_message', handleReceive);
      socketService.off('system_message', handleSystem);
      socketService.off('partner_disconnected', handlePartnerDisconnect);
      socketService.off('message_updated', handleMessageUpdate);
    };
  }, [topic]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBoost = (messageId: string, type: string) => {
    audioService.playAlert();
    socketService.emit('boost_message', { roomId, messageId, type, nodeId });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    audioService.playKeystroke();

    if (input.startsWith('/accept ')) {
       const type = input.split(' ')[1];
       if (type) {
         socketService.emit('accept_reveal', { type });
         setInput('');
         return;
       }
    }

    const newMsg = { id: Date.now().toString(), text: input, isSelf: true };
    setMessages(prev => [...prev, newMsg]);
    socketService.emit('send_message', { roomId, text: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] border border-[var(--phos-color)]/20 max-w-4xl mx-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
      <button 
        onClick={() => { audioService.playKeystroke(); socketService.emit('leave_pool', {}); }} 
        className="absolute top-2 right-2 p-1 px-2 hover:bg-[var(--phos-color)]/20 text-[10px] font-mono uppercase border border-[var(--phos-color)]/30 text-red-500 z-30 bg-black/60 backdrop-blur-sm"
      >
          Disconnect
      </button>

      {/* Identity Store / Actions Sidebar */}
      <div className="border-b border-[var(--phos-color)]/20 p-2 pt-10 sm:pt-2 flex gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap text-[10px] sm:text-xs scrollbar-hide relative z-20 bg-black/20">
        <span className="phosphor-dim uppercase py-1 hidden lg:inline">Exchange Points:</span>
        <button 
          onClick={() => onPointsSpent(300, 'Age')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 300 pts"
        >
           <Eye size={12} className="group-hover:animate-pulse" />
           <span>Age (300)</span>
        </button>
        <button 
          onClick={() => onPointsSpent(400, 'Gender')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 400 pts"
        >
           <Eye size={12} className="group-hover:animate-pulse" />
           <span>Gender (400)</span>
        </button>
        <button 
          onClick={() => onPointsSpent(500, 'City')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 500 pts"
        >
           <Navigation size={12} className="group-hover:animate-pulse" />
           <span>City (500)</span>
        </button>
        <button 
          onClick={() => onPointsSpent(600, 'Music')}
          className="border border-[var(--phos-color)]/30 px-2 sm:px-3 py-1 hover:bg-[var(--phos-color)]/10 hover:text-white transition-colors flex items-center gap-1 group whitespace-nowrap"
          title="Cost: 600 pts"
        >
           <Eye size={12} className="group-hover:animate-pulse" />
           <span>Music (600)</span>
        </button>
        
        <button 
          onClick={() => {
             audioService.playKeystroke();
             socketService.emit('trigger_activity', {});
          }}
          className="border border-[var(--phos-color)]/40 px-2 sm:px-3 py-1 bg-[var(--phos-color)]/10 hover:bg-[var(--phos-color)]/20 hover:text-white transition-colors flex items-center gap-1 group ml-auto sticky right-0 z-10"
          title="Inject Activity"
        >
           <Terminal size={12} className="group-hover:animate-pulse" />
           <span className="hidden sm:inline">Inject Activity</span>
           <span className="sm:hidden">Inject</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 relative z-10 backdrop-blur-[1px] scrollbar-hide">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
               "max-w-[85%] sm:max-w-[80%] break-words p-2 sm:p-3 relative group",
               m.system ? "mx-auto text-center border-y border-[var(--phos-color)]/30 text-[10px] sm:text-xs text-[var(--phos-color)] uppercase max-w-full my-3 sm:my-4 phosphor-dim" :
               m.isSelf ? "ml-auto border border-[var(--phos-color)]/50 bg-[var(--phos-color)]/5 text-[var(--phos-color)]" : 
               "mr-auto border border-white/10 text-white/90",
               m.boost === 'highlight' ? "shadow-[0_0_15px_var(--phos-color)] border-[var(--phos-color)] phosphor-glow" : "",
               m.boost === 'glitch' ? "fx-jitter" : "",
               m.boost === 'redact' ? "bg-black text-black hover:text-[var(--phos-color)] transition-colors cursor-pointer" : ""
            )}
            dir="auto"
          >
            {m.system && <span className="mr-2">***</span>}
            <span className={cn(
              "font-sans", 
              m.system ? "font-mono" : "text-[13px] sm:text-base leading-relaxed",
              m.boost === 'redact' ? "select-none" : ""
            )}>
              {m.text}
            </span>
            {m.system && <span className="ml-2">***</span>}

            {/* Boost Controls for self messages */}
            {!m.system && m.isSelf && !m.boost && (
              <div className="absolute -top-6 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 p-1 border border-[var(--phos-color)]/20 z-20">
                <button onClick={() => handleBoost(m.id, 'highlight')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20">Glow (50)</button>
                <button onClick={() => handleBoost(m.id, 'glitch')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20">Jitter (150)</button>
                <button onClick={() => handleBoost(m.id, 'redact')} className="text-[8px] uppercase px-1 hover:bg-[var(--phos-color)]/20">Hide (200)</button>
              </div>
            )}
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Base */}
      <form onSubmit={sendMessage} className="border-t border-[var(--phos-color)]/30 p-1 sm:p-2 flex bg-black/60 relative z-20">
        <div className="flex items-center phosphor-dim px-2 sm:px-3">
          <span className="animate-pulse">{'>'}</span>
        </div>
        <input 
          type="text" 
          value={input}
          onChange={(e) => {
            if (e.target.value.length > input.length) {
               audioService.playKeystroke();
            }
            setInput(e.target.value);
          }}
          className="flex-1 bg-transparent border-none outline-none text-[var(--phos-color)] phosphor-glow font-sans text-sm sm:text-base py-2 px-1"
          placeholder="Message..."
          autoFocus /* eslint-disable-line jsx-a11y/no-autofocus */
          autoComplete="off"
          dir="auto"
        />
        <button type="submit" disabled={!input.trim()} className="px-2 sm:px-4 text-[var(--phos-color)] phosphor-dim hover:text-white hover:phosphor-glow disabled:opacity-30 uppercase text-[10px] sm:text-xs font-bold">
          Send
        </button>
      </form>
    </div>
  );
}

