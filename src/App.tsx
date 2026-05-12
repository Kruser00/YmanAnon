import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from './socket';
import { audioService } from './audio';
import { Terminal, Cpu, Heart, Coins, Volume2, VolumeX, Monitor } from 'lucide-react';
import { 
  BackgroundCode, 
  BootSequence, 
  ProfileSetupScreen, 
  DashboardScreen, 
  DataBrokerScreen, 
  OracleScreen, 
  SelectionScreen, 
  MatchingScreen, 
  ChatBootSequence, 
  ChatScreen, 
  ConversationStatsScreen, 
  RatingScreen 
} from './components';

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
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let savedId = localStorage.getItem('terminal_node_id');
    if (!savedId) {
      savedId = `NODE_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      localStorage.setItem('terminal_node_id', savedId);
    }
    setNodeId(savedId);
  }, []);

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

    socketService.on('chat_terminated', (data: any) => {
      setChatStats(data);
      setAppState('CHAT_STATS');
    });

    socketService.on('void_broadcast', (data: any) => {
      setVoidMessages(prev => [data, ...prev].slice(0, 3));
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
    audioService.init();
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
          <header className="flex justify-between items-center border-b border-[var(--phos-color)]/30 pb-2 mb-4 sm:mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Terminal size={18} className="text-[var(--phos-color)] cursor-pointer" onClick={() => { if(appState !== 'START' && appState !== 'BOOT') setAppState('DASHBOARD'); }} />
                <span className="phosphor-glow font-bold tracking-widest uppercase cursor-pointer text-sm sm:text-base" onClick={() => { if(appState !== 'START' && appState !== 'BOOT') setAppState('DASHBOARD'); }}>
                  TERMINAL.FA
                </span>
              </div>
              <div className="flex items-center gap-3 text-[7px] sm:text-[9px] font-mono opacity-60">
                <span className="flex items-center gap-1"><Cpu size={10} /> {nodeId}</span>
                <span className="hidden sm:inline border-l border-[var(--phos-color)]/30 pl-3 uppercase">Sec_Mesh_Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6">
              {appState !== 'BOOT' && appState !== 'START' && (
                <>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 sm:gap-1.5 text-yellow-400">
                      <Coins size={12} className="animate-pulse sm:w-3.5 sm:h-3.5" />
                      <span className="text-xs sm:text-base font-bold font-mono">{points}</span>
                    </div>
                    <div className="text-[7px] uppercase tracking-tighter opacity-50 font-mono">SIGNAL_FUEL</div>
                  </div>
                  
                  <div className="hidden xs:flex flex-col items-end border-l border-[var(--phos-color)]/20 pl-3 sm:pl-4">
                    <div className="flex items-center gap-1.5 text-red-500">
                      <Heart size={14} />
                      <span className="text-sm sm:text-base font-bold font-mono">+{reputation.positive}</span>
                    </div>
                    <div className="text-[7px] uppercase tracking-tighter opacity-50 font-mono">MESH_REPUTATION</div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-1 sm:gap-2 border-l border-[var(--phos-color)]/20 pl-3 sm:pl-4">
                <button onClick={toggleAudioMute} className="p-1 hover:bg-[var(--phos-color)]/10 rounded transition-colors text-[var(--phos-color)] opacity-70 hover:opacity-100">
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button onClick={toggleTheme} className="p-1 hover:bg-[var(--phos-color)]/10 rounded transition-colors text-[var(--phos-color)] opacity-70 hover:opacity-100">
                  <Monitor size={16} />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {appState === 'START' && (
                 <motion.div key="start" exit={{ opacity: 0 }} className="flex h-full items-center justify-center cursor-pointer text-center px-4" onClick={() => { audioService.init(); if (!isMuted) audioService.playKeystroke(); if (!isMuted) audioService.startBGM(); setAppState('BOOT'); }}>
                   <span className="phosphor-glow animate-pulse text-xs sm:text-lg uppercase tracking-widest">&gt; INITIALIZE TERMINAL</span>
                 </motion.div>
              )}

              {appState === 'BOOT' && <BootSequence key="boot" onComplete={() => setAppState('PROFILE')} />}
              
              {appState === 'PROFILE' && <ProfileSetupScreen key="profile" onComplete={(p) => { setProfile(p); setAppState('DASHBOARD'); }} />}

              {appState === 'DASHBOARD' && (
                <DashboardScreen key="dashboard" onFindConnection={() => setAppState('MOOD')} onOpenOracle={() => setAppState('ORACLE')} onOpenBroker={() => setAppState('DATA_BROKER')} reputation={reputation} clearance={clearance} voidMessages={voidMessages} atmosphere={atmosphere} />
              )}

              {appState === 'DATA_BROKER' && <DataBrokerScreen key="broker" onBack={() => setAppState('DASHBOARD')} points={points} clearance={clearance} />}

              {appState === 'ORACLE' && <OracleScreen key="oracle" onBack={() => setAppState('DASHBOARD')} clearance={clearance} nodeId={nodeId} points={points} />}

              {appState === 'MOOD' && (
                <SelectionScreen key="mood" title="SYS > HOW_ARE_YOU_FEELING?" subtitle="Select current emotional parameter." options={['lonely', 'happy', 'curious', 'bored', 'anxious', 'thoughtful', 'energetic']} onSelect={(m) => { audioService.playKeystroke(); setMood(m); setAppState('INTENT'); }} />
              )}

              {appState === 'INTENT' && (
                <SelectionScreen key="intent" title="SYS > WHAT_ARE_YOU_SEEKING?" subtitle="Calibrate matching engine intent." options={['deep conversation', 'random fun', 'advice', 'listening', 'debate', 'storytelling']} onSelect={handleJoinPool} />
              )}

              {appState === 'MATCHING' && <MatchingScreen key="matching" onCancel={() => { socketService.emit('leave_pool', {}); setAppState('DASHBOARD'); }} />}
              
              {appState === 'CHAT_BOOT' && <ChatBootSequence key="chatboot" onComplete={() => setAppState('CHAT')} />}

              {appState === 'CHAT' && (
                <ChatScreen key="chat" topic={topic || ""} roomId={roomId!} points={points} nodeId={nodeId} onPointsSpent={(cost, type) => { audioService.playKeystroke(); socketService.emit('propose_reveal', { cost, type: type.toLowerCase() }); }} />
              )}

              {appState === 'CHAT_STATS' && <ConversationStatsScreen key="stats" stats={chatStats} onNext={() => setAppState('RATING')} />}

              {appState === 'RATING' && <RatingScreen key="rating" onComplete={() => setAppState('DASHBOARD')} />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
