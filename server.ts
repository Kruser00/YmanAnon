import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // --- IN-MEMORY RAM STORAGE (NON-PERSISTENT) ---
  // When the server restarts, everything is purged.
  
  // Local Matchmaking State
  let queue: any[] = [];
  let activeChats = new Map<string, any>();
  let socketToUser = new Map<string, any>(); // Map socket.id to user data in memory
  let nodeToUser = new Map<string, any>();   // Map nodeId to user data (persists until purge)

  setInterval(() => {
    // Random Global Glitch Event (0.5% chance per second)
    if (Math.random() < 0.005) {
       const glitches = ['SIGNAL_SPIKE', 'MEM_LEAK_DETECTED', 'NODE_COLLISION', 'CORRUPT_FRAME'];
       const event = glitches[Math.floor(Math.random() * glitches.length)];
       io.emit('global_glitch', { type: event, duration: 2000 + Math.random() * 3000 });
    }
  }, 1000);
  
  const getActualFreqs = () => {
    const freqs: Record<string, number> = { '88.0': 0, '90.2': 0, '101.5': 0, '104.4': 0, '108.0': 0 };
    let hasData = false;
    for (const user of socketToUser.values()) {
      if (user.freq && freqs[user.freq] !== undefined) {
        freqs[user.freq]++;
        hasData = true;
      }
    }
    return freqs;
  };

  const syncAtmosphere = () => {
    io.emit('atmosphere_updated', { freqs: getActualFreqs(), online: io.engine.clientsCount, activeChats: activeChats.size });
  };

  const DEEP_PROMPTS = [
    "What is something you've never told anyone?",
    "If you could erase one memory, what would it be?",
    "What did you want to be when you were a child?",
    "What's your biggest irrational fear?",
    "When was the last time you felt truly understood?",
    "What's a belief you hold that most people disagree with?",
    "If today was your last day, what would you regret not doing?"
  ];

  const ACTIVITIES = [
    "Let's play 2 Truths and 1 Lie. I'll go first.",
    "Scenario: You find a briefcase with $1M but you can never see your best friend again. Do you take it?",
    "Describe your current mood using only a movie title.",
    "What is your most controversial food opinion?"
  ];

  // Helper matching logic
  const findMatch = (userId: string, freq: string) => {
    // Exact match on freq
    let matchIndex = queue.findIndex(u => u.socketId !== userId && u.freq === freq);
    
    // Ultimate Fallback: match any
    if (matchIndex === -1) {
       matchIndex = queue.findIndex(u => u.socketId !== userId);
    }

    if (matchIndex > -1) {
      const partner = queue[matchIndex];
      queue.splice(matchIndex, 1);
      return partner;
    }
    return null;
  };

  const syncUserState = (socketId: string) => {
    const user = socketToUser.get(socketId);
    if (user) {
        io.to(socketId).emit('user_state_sync', {
            points: user.points,
            reputation: user.reputation
        });
        io.to(socketId).emit('points_updated', { points: user.points });
    }
  };

  const terminateChat = (roomId: string) => {
    const room = activeChats.get(roomId);
    if (!room) return;

    const durationSec = Math.floor((Date.now() - room.createdAt) / 1000);
    let rank = "Top 50%";
    if (durationSec > 600) rank = "Top 1%";
    else if (durationSec > 300) rank = "Top 5%";
    else if (durationSec > 120) rank = "Top 15%";
    else if (durationSec > 60) rank = "Top 30%";

    const stats = {
      duration: durationSec,
      rank: rank,
      messageCount: room.messageCount || 0
    };

    room.users.forEach((id: string) => {
      io.to(id).emit('chat_terminated', stats);
      const u = socketToUser.get(id);
      if (u) u.currentRoom = null;
    });

    activeChats.delete(roomId);
  };

  const registerUser = (socketId: string, data: any) => {
    const nodeId = data.nodeId || `NODE_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    let user = nodeToUser.get(nodeId);
    if (!user) {
        console.log(`[CORE_SYNC] Initializing identity matrix for node: ${nodeId}`);
        user = {
            nodeId,
            points: 200, // Reduced for lore/difficulty
            reputation: { positive: 0, negative: 0 },
            profile: data.profile || {},
            freq: data.freq || null,
            currentRoom: null,
            lastPartnerId: null,
            lastAdClaimedAt: 0
        };
        nodeToUser.set(nodeId, user);
    } else {
        console.log(`[CORE_SYNC] Node re-linked: ${nodeId} | Balance: ${user.points}`);
        // Update profile if provided
        if (data.profile) user.profile = { ...user.profile, ...data.profile };
    }

    // Link current socket
    user.socketId = socketId;
    socketToUser.set(socketId, user);
    return user;
  };

  io.on('connection', (socket) => {
    console.log('[RAM_STORAGE] Terminal connect:', socket.id);
    const sId = socket.id;

    syncAtmosphere();

    socket.on('register_node', (data) => {
      registerUser(sId, data);
      syncUserState(sId);
    });

    socket.on('disconnect', () => {
      queue = queue.filter(u => u.socketId !== sId);
      const user = socketToUser.get(sId);
      if (user?.currentRoom) terminateChat(user.currentRoom);
      socketToUser.delete(sId);
      syncAtmosphere();
    });

    socket.on('leave_pool', () => {
      queue = queue.filter(u => u.socketId !== sId);
      const user = socketToUser.get(sId);
      if (user?.currentRoom) terminateChat(user.currentRoom);
    });

    socket.on('spend_points', (data) => {
       const user = socketToUser.get(sId);
       if (user && user.points >= data.amount) {
           user.points -= data.amount;
           syncUserState(sId);
       }
    });

    socket.on('rate_partner', (data) => {
       const user = socketToUser.get(sId);
       if (!user || !user.lastPartnerId) return;
       const partner = socketToUser.get(user.lastPartnerId);
       
       if (partner) {
          const positiveTags = ['thoughtful', 'respectful', 'funny', 'comforting', 'intelligent'];
          let newPos = 0; let newNeg = 0;
          (data.tags as string[]).forEach(tag => {
              if (positiveTags.includes(tag)) newPos++;
              else newNeg++;
          });
          partner.reputation.positive += newPos;
          partner.reputation.negative += newNeg;
          if (newPos > 0) partner.points += Math.floor(Math.random() * 20) + 10;
          syncUserState(partner.socketId);
       }
    });

    socket.on('request_atmosphere', () => {
       socket.emit('atmosphere_data', { freqs: getActualFreqs(), online: io.engine.clientsCount, activeChats: activeChats.size }); 
    });

    socket.on('join_pool', (data) => {
      const userData = registerUser(sId, data);
      userData.freq = data.freq;

      syncUserState(sId);

      syncAtmosphere();
      
      const partner = findMatch(sId, data.freq);
      if (partner) {
        const roomId = `room_${sId}_${partner.socketId}`;
        socket.join(roomId);
        io.sockets.sockets.get(partner.socketId)?.join(roomId);
        
        activeChats.set(roomId, { 
           users: [sId, partner.socketId],
           topic: `FREQUENCY ${data.freq}`,
           createdAt: Date.now(),
           expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute chat timer
           lastActivityAt: Date.now(),
           pendingReveals: {},
           promptInjected: false,
           milestones: { '1': false, '5': false },
           messageCount: 0
        });
        
        userData.currentRoom = roomId;
        userData.lastPartnerId = partner.socketId;
        const partnerState = socketToUser.get(partner.socketId);
        if (partnerState) {
          partnerState.currentRoom = roomId;
          partnerState.lastPartnerId = sId;
        }

        io.to(roomId).emit('match_found', { roomId, topic: activeChats.get(roomId).topic });
      } else {
        queue.push({ socketId: sId, ...data });
      }
    });

    socket.on('send_message', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        if (data.text.startsWith('/void ')) {
           const voidMsg = data.text.replace('/void ', '');
           io.emit('void_broadcast', { text: voidMsg, timestamp: Date.now() });
           socket.emit('system_message', { text: ">>> Message cast into the void. It is now part of the global noise. <<<" });
           return;
        }

        const messageId = data.id || Date.now().toString();

        socket.to(user.currentRoom).emit('receive_message', {
          id: messageId,
          sender: sId,
          text: data.text,
          timestamp: Date.now()
        });

        // Confirm delivery to sender
        socket.emit('message_delivered', { id: messageId });
        
        const room = activeChats.get(user.currentRoom);
        if (room) {
          room.lastActivityAt = Date.now();
          room.messageCount++;
        }
        user.points += 2;
        socket.emit('points_updated', { points: user.points, reason: '+2 msg' });
      }
    });

    socket.on('mark_read', (data) => {
       const user = socketToUser.get(sId);
       if (user && user.currentRoom) {
          socket.to(user.currentRoom).emit('message_read', { id: data.id });
       }
    });

    socket.on('send_reaction', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        socket.to(user.currentRoom).emit('receive_reaction', {
          messageId: data.messageId,
          emoji: data.emoji,
          sender: sId
        });
      }
    });

     socket.on('extend_chat_timer', (data) => {
       const user = socketToUser.get(sId);
       if (!user || !user.currentRoom) return;
       const room = activeChats.get(user.currentRoom);
       if (!room) return;

       const cost = 400;
       if (user.points >= cost) {
          user.points -= cost;
          room.expiresAt += 2 * 60 * 1000;
          syncUserState(sId);
          io.to(user.currentRoom).emit('system_message', { text: `[PROTOCOL_OVERRIDE] > Memory decay delayed by node contribution (+2m)` });
          io.to(user.currentRoom).emit('timer_extended', { expiresAt: room.expiresAt });
       }
    });

    socket.on('typing', (data) => {
       const user = socketToUser.get(sId);
       if (user && user.currentRoom) {
         socket.to(user.currentRoom).emit('partner_typing', { isTyping: data.isTyping });
       }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of activeChats.entries()) {
      if (now - room.lastActivityAt > 45000 && !room.promptInjected) {
         const randomPrompt = DEEP_PROMPTS[Math.floor(Math.random() * DEEP_PROMPTS.length)];
         io.to(roomId).emit('system_message', { text: `[SILENCE_DETECTED] > Injecting momentum: "${randomPrompt}"` });
         room.lastActivityAt = now; room.promptInjected = true;
      }
      io.to(roomId).emit('chat_timer_sync', { expiresAt: room.expiresAt });
      if (now >= room.expiresAt) {
         io.to(roomId).emit('system_message', { text: "!! MEMORY_DECAY_COMPLETE. TERMINATING CONNECTION. !!" });
         terminateChat(roomId);
      }
    }
  }, 5000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Ephemeral Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
