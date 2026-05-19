import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from './socket';
import { audioService } from './audio';
import { Terminal, Cpu, Heart, Coins, Volume2, VolumeX, Monitor } from 'lucide-react';
import { 
  BackgroundCode, 
  BootSequence, 
  ProfileSetupScreen, 
  DashboardScreen, 
  MatchingScreen, 
  ChatBootSequence, 
  ChatScreen, 
  ConversationStatsScreen, 
  RatingScreen,
  FrequencyTunerScreen,
  AuthScreen,
  DataMineScreen
} from './components';

type AppState = 'START' | 'BOOT' | 'AUTH' | 'PROFILE' | 'DASHBOARD' | 'MOOD' | 'INTENT' | 'FREQUENCY' | 'MATCHING' | 'CHAT_BOOT' | 'CHAT' | 'RATING' | 'CHAT_STATS' | 'DATA_MINE';
type Theme = 'green' | 'amber' | 'ghost';

export default function App() {
  const [appState, setAppState] = useState<AppState>('START');
  const [profile, setProfile] = useState<{ name: string, age: string, gender: string, city: string, music: string, hobby: string, mbti: string }>({ name: '', age: '', gender: '', city: '', music: '', hobby: '', mbti: ''});
  const [mood, setMood] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>('88.0');
  const [points, setPoints] = useState<number>(0);
  const [reputation, setReputation] = useState<{ positive: number, negative: number }>({ positive: 0, negative: 0 });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [chatStats, setChatStats] = useState<{ duration: number, rank: string, messageCount: number } | null>(null);
  const [atmosphere, setAtmosphere] = useState<{ freqs?: Record<string, number>, online: number }>({ freqs: {}, online: 0 });
  const [isConnected, setIsConnected] = useState(true);
  const [theme, setTheme] = useState<Theme>('green');
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const [voidMessages, setVoidMessages] = useState<any[]>([]);

  useEffect(() => {
    let savedId = localStorage.getItem('terminal_node_id');
    if (!savedId) {
      savedId = `NODE_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      localStorage.setItem('terminal_node_id', savedId);
    }
    setNodeId(savedId);

    const savedToken = localStorage.getItem('phos_token');
    if (savedToken) {
      setToken(savedToken);
      const savedUsername = localStorage.getItem('phos_username');
      if (savedUsername) setNodeId(savedUsername);
    }

    const savedProfile = localStorage.getItem(`profile_${savedId}`);
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    socketService.connect();

    const handleConnectState = () => setIsConnected(true);
    const handleDisconnectState = () => setIsConnected(false);

    socketService.on('connect', handleConnectState);
    socketService.on('disconnect', handleDisconnectState);

    socketService.on('match_found', (data: any) => {
      setRoomId(data.roomId);
      setTopic(data.topic);
      if (!isMuted) audioService.playMatchFound();
      setAppState('CHAT_BOOT');
    });

    socketService.on('rejoined_room', (data: any) => {
      setRoomId(data.roomId);
      setTopic(data.topic);
      setAppState('CHAT');
    });

    socketService.on('chat_terminated', (data: any) => {
      setChatStats(data);
      setAppState('CHAT_STATS');
    });

    socketService.on('void_broadcast', (data: any) => {
      setVoidMessages(prev => [...prev, data].slice(-100)); // keep last 100 msgs, newest at bottom
    });

    socketService.on('atmosphere_updated', (data: any) => {
      setAtmosphere(data);
    });

    socketService.on('points_updated', (data: any) => {
      setPoints(data.points);
    });

    socketService.on('user_state_sync', (data: any) => {
      if (data.points !== undefined) setPoints(data.points);
      if (data.reputation !== undefined) setReputation(data.reputation);
    });
    
    socketService.on('global_glitch', (data: any) => {
      setIsGlitching(true);
      if (!isMuted) {
        audioService.playGlitch();
        setTimeout(() => audioService.playGlitch(), data.duration / 2);
      }
      setTimeout(() => setIsGlitching(false), data.duration);
    });

    return () => {
      socketService.off('connect', handleConnectState);
      socketService.off('disconnect', handleDisconnectState);
      socketService.off('match_found');
      socketService.off('rejoined_room');
      socketService.off('chat_terminated');
      socketService.off('void_broadcast');
      socketService.off('atmosphere_updated');
      socketService.off('points_updated');
      socketService.off('user_state_sync');
      socketService.off('global_glitch');
    };
  }, []); // Only register once

  useEffect(() => {
    const handleConnect = () => {
       if (nodeId && (appState === 'DASHBOARD' || appState === 'FREQUENCY' || appState === 'MATCHING' || appState === 'CHAT_BOOT' || appState === 'CHAT')) {
          socketService.emit('register_node', { nodeId, profile, token });
       }
    };
    socketService.on('connect', handleConnect);
    return () => socketService.off('connect', handleConnect);
  }, [nodeId, profile, token, appState]);

  useEffect(() => {
    if (appState === 'DASHBOARD' && nodeId) {
      socketService.emit('register_node', { nodeId, profile, token });
    }
  }, [appState, nodeId, profile, token]);

  const handleJoinPool = (selectedFreq: string) => {
    if (!isMuted) audioService.playKeystroke();
    setFrequency(selectedFreq);
    setAppState('MATCHING');
    socketService.emit('join_pool', { freq: selectedFreq, profile, nodeId, token });
  };

  const onBootComplete = useCallback(() => {
    if (token) {
       // if we have a token, we could assume they are authed. Should check if profile is set.
       if (profile.name && profile.age && profile.gender) {
          setAppState('DASHBOARD');
       } else {
          setAppState('PROFILE');
       }
    } else {
       setAppState('AUTH');
    }
  }, [token, profile]);

  const onAuthComplete = useCallback((newToken?: string) => {
    if (newToken) {
       setToken(newToken);
       const savedUsername = localStorage.getItem('phos_username');
       if (savedUsername) setNodeId(savedUsername);
    }
    if (profile.name && profile.age && profile.gender) {
      setAppState('DASHBOARD');
    } else {
      setAppState('PROFILE');
    }
  }, [profile]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'green') return 'amber';
      if (prev === 'amber') return 'ghost';
      return 'green';
    });
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
    <div className={`crt-screen h-screen w-screen overflow-hidden bg-[var(--bg-color)] text-[var(--phos-color)] selection:bg-[var(--phos-color)] selection:text-[var(--bg-color)] ${isGlitching ? 'fx-aberration' : ''}`}>
      <div className="crt-scanline-bar" />
      <div className="crt-overlay" />
      <div className="crt-bottom-fade" />
      <div className="crt-curve h-full w-full relative flex flex-col">
        <BackgroundCode mood={mood} />
        
        {!isConnected && (
          <div className="absolute top-0 left-0 w-full bg-red-600/80 text-white font-mono text-center py-2 z-50 text-xs sm:text-sm animate-pulse flex flex-col items-center justify-center border-b border-red-500">
             <span className="font-bold tracking-widest">CONNECTION LOST / قطعی ارتباط</span>
             <span className="text-[10px] opacity-80 mt-1">Re-establishing neural link... / در حال برقراری مجدد ارتباط...</span>
          </div>
        )}

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

              {appState === 'BOOT' && (
                <motion.div key="boot" exit={{ opacity: 0 }} className="h-full">
                  <BootSequence onComplete={onBootComplete} />
                </motion.div>
              )}

              {appState === 'AUTH' && (
                <motion.div key="auth" exit={{ opacity: 0 }} className="h-full">
                  <AuthScreen onComplete={onAuthComplete} />
                </motion.div>
              )}
              
              {appState === 'PROFILE' && (
                <motion.div key="profile" exit={{ opacity: 0 }} className="h-full">
                  <ProfileSetupScreen 
                    initialProfile={profile}
                    onComplete={(p) => { 
                      setProfile(p); 
                      localStorage.setItem(`profile_${nodeId}`, JSON.stringify(p));
                      setAppState('DASHBOARD'); 
                    }} 
                  />
                </motion.div>
              )}

              {appState === 'DASHBOARD' && (
                <motion.div key="dashboard" exit={{ opacity: 0 }} className="h-full">
                  <DashboardScreen 
                    onFindConnection={() => setAppState('FREQUENCY')} 
                    onDataMine={() => setAppState('DATA_MINE')}
                    reputation={reputation} 
                    atmosphere={atmosphere} 
                    voidMessages={voidMessages}
                  />
                </motion.div>
              )}

              {appState === 'DATA_MINE' && (
                <motion.div key="datamine" exit={{ opacity: 0 }} className="h-full">
                  <DataMineScreen onBack={() => setAppState('DASHBOARD')} />
                </motion.div>
              )}

              {appState === 'FREQUENCY' && (
                <motion.div key="frequency" exit={{ opacity: 0 }} className="h-full">
                  <FrequencyTunerScreen onTune={(freq) => { handleJoinPool(freq.toString()); }} />
                </motion.div>
              )}

              {appState === 'MATCHING' && (
                <motion.div key="matching" exit={{ opacity: 0 }} className="h-full">
                  <MatchingScreen onCancel={() => { socketService.emit('leave_pool', {}); setAppState('DASHBOARD'); }} atmosphere={atmosphere} freq={frequency} />
                </motion.div>
              )}
              
              {appState === 'CHAT_BOOT' && (
                <motion.div key="chatboot" exit={{ opacity: 0 }} className="h-full">
                  <ChatBootSequence onComplete={() => setAppState('CHAT')} />
                </motion.div>
              )}

              {appState === 'CHAT' && (
                <motion.div key="chat" exit={{ opacity: 0 }} className="h-full">
                  <ChatScreen topic={topic || ""} roomId={roomId!} points={points} nodeId={nodeId || ""} onPointsSpent={(cost, type) => { audioService.playKeystroke(); socketService.emit('propose_reveal', { cost, type: type.toLowerCase() }); }} />
                </motion.div>
              )}

              {appState === 'CHAT_STATS' && (
                <motion.div key="stats" exit={{ opacity: 0 }} className="h-full">
                  <ConversationStatsScreen stats={chatStats} onNext={() => setAppState('RATING')} />
                </motion.div>
              )}

              {appState === 'RATING' && (
                <motion.div key="rating" exit={{ opacity: 0 }} className="h-full">
                  <RatingScreen onComplete={() => setAppState('DASHBOARD')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
