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

  // State
  let queue: any[] = [];
  const activeChats = new Map<string, any>();
  const users = new Map<string, any>();
  
  // Oracle State
  const oracleThreads: Array<{id: string, question: string, authorId: string, answers: Array<{id: string, authorId: string, text: string, timestamp: number}>, timestamp: number}> = [
    { id: 't1', question: "What made you emotionally mature?", authorId: 'sys', answers: [], timestamp: Date.now() - 100000 },
    { id: 't2', question: "What is a regret you carry every day?", authorId: 'sys', answers: [], timestamp: Date.now() - 50000 }
  ];

  // Atmosphere State
  const globalMoods = {
    lonely: 10, curious: 15, bored: 5, anxious: 20, thoughtful: 30, energetic: 2, happy: 8
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
  const findMatch = (userId: string, prefs: any) => {
    const matchIndex = queue.findIndex(u => u.id !== userId);
    if (matchIndex > -1) {
      const partner = queue[matchIndex];
      queue.splice(matchIndex, 1);
      return partner;
    }
    return null;
  };

  const syncUserState = (userId: string) => {
    const user = users.get(userId);
    if (user) {
        io.to(userId).emit('user_state_sync', {
            points: user.points,
            clearance: user.clearance,
            reputation: user.reputation
        });
        io.to(userId).emit('points_updated', { points: user.points });
    }
  };

  io.on('connection', (socket) => {
    console.log('[DEBUG] User connected', socket.id);
    const uID = socket.id;

    const terminateChat = (roomId: string, leaverId: string) => {
      const room = activeChats.get(roomId);
      if (!room) return;

      const durationSec = Math.floor((Date.now() - room.createdAt) / 1000);
      
      // Simulated ranking logic
      let rank = "Top 50%";
      if (durationSec > 600) rank = "Top 1%"; // 10 mins
      else if (durationSec > 300) rank = "Top 5%"; // 5 mins
      else if (durationSec > 120) rank = "Top 15%"; // 2 mins
      else if (durationSec > 60) rank = "Top 30%"; // 1 min

      const stats = {
        duration: durationSec,
        rank: rank,
        messageCount: room.messageCount || 0
      };

      room.users.forEach((id: string) => {
        io.to(id).emit('chat_terminated', stats);
        const u = users.get(id);
        if (u) u.currentRoom = null;
      });

      activeChats.delete(roomId);
    };

    socket.on('disconnect', () => {
      console.log('[DEBUG] User disconnected', uID);
      queue = queue.filter(u => u.id !== uID);
      const user = users.get(uID);
      
      if (user?.currentRoom) {
        terminateChat(user.currentRoom, uID);
      }
      users.delete(uID);
    });

    socket.on('leave_pool', () => {
      console.log('[DEBUG] User left pool', uID);
      queue = queue.filter(u => u.id !== uID);
      const user = users.get(uID);
      
      if (user?.currentRoom) {
        terminateChat(user.currentRoom, uID);
      }
    });

    socket.on('spend_points', (data) => {
       const user = users.get(uID);
       if (user && user.points >= data.amount) {
           user.points -= data.amount;
           syncUserState(uID);
       }
    });

    socket.on('buy_clearance', () => {
       const user = users.get(uID);
       if (user && user.points >= 500 && user.clearance === 1) {
           user.points -= 500;
           user.clearance = 2;
           syncUserState(uID);
           console.log(`[BROKER] User ${uID} upgraded to clearance 2`);
       }
    });

    socket.on('rate_partner', (data) => {
       const user = users.get(uID);
       if (!user || !user.lastPartnerId) return;
       const partner = users.get(user.lastPartnerId);
       
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
          
          syncUserState(partner.id);
          console.log(`[REPUTATION] User ${user.lastPartnerId} got rep update: +${newPos} -${newNeg}`);
       }
    });

    socket.on('request_atmosphere', () => {
       socket.emit('atmosphere_data', { moods: globalMoods, online: users.size }); 
    });

    socket.on('request_oracle', () => {
       socket.emit('oracle_data', oracleThreads.map(t => ({
          id: t.id,
          question: t.question,
          answersCount: t.answers.length,
          answers: t.answers,
          timestamp: t.timestamp,
          isPremium: (t as any).isPremium || false
       })));
    });

    socket.on('post_oracle_thread', (data) => {
       const u = users.get(uID) || { id: uID, clearance: 1 };
       const newThread = {
          id: 't' + Date.now(),
          question: data.question,
          authorId: uID,
          answers: [],
          timestamp: Date.now(),
          isPremium: (u.clearance || 1) > 1
       };
       oracleThreads.unshift(newThread);
       if (oracleThreads.length > 50) oracleThreads.pop();
       io.emit('oracle_updated');
    });

    socket.on('post_oracle_answer', (data) => {
       const thread = oracleThreads.find(t => t.id === data.threadId);
       if (thread) {
          thread.answers.push({
             id: 'a' + Date.now(),
             authorId: uID,
             text: data.text,
             timestamp: Date.now()
          });
          io.emit('oracle_updated');
       }
    });

    socket.on('join_pool', (data) => {
      // Update global moods tally
      if (data.mood && globalMoods[data.mood as keyof typeof globalMoods] !== undefined) {
         globalMoods[data.mood as keyof typeof globalMoods]++;
         io.emit('atmosphere_updated', { moods: globalMoods, online: users.size + 1 });
      }

      users.set(uID, { 
         id: uID, 
         mood: data.mood, 
         intent: data.intent, 
         profile: data.profile, 
         points: 1000, 
         clearance: 1,
         reputation: { positive: 0, negative: 0 },
         currentRoom: null 
      });
      syncUserState(uID);
      
      const partner = findMatch(uID, data);
      if (partner) {
        const roomId = `room_${uID}_${partner.id}`;
        
        socket.join(roomId);
        io.sockets.sockets.get(partner.id)?.join(roomId);
        
        activeChats.set(roomId, { 
           users: [uID, partner.id],
           topic: data.intent === partner.intent ? data.intent : 'Life choices',
           createdAt: Date.now(),
           lastActivityAt: Date.now(),
           pendingReveals: {},
           promptInjected: false,
           milestones: { '1': false, '5': false }
        });
        
        const userState = users.get(uID);
        const partnerState = users.get(partner.id);
        if (userState) { userState.currentRoom = roomId; userState.lastPartnerId = partner.id; }
        if (partnerState) { partnerState.currentRoom = roomId; partnerState.lastPartnerId = uID; }

        io.to(roomId).emit('match_found', { 
          roomId, 
          topic: activeChats.get(roomId).topic 
        });
        
        console.log(`[DEBUG] Match formed: ${roomId}`);
      } else {
        queue.push({ id: uID, ...data });
        console.log(`[DEBUG] User added to queue: ${uID}`);
      }
    });

    socket.on('send_message', (data) => {
      const user = users.get(uID);
      if (user && user.currentRoom) {
        if (data.text.startsWith('/void ')) {
           const voidMsg = data.text.replace('/void ', '');
           io.emit('void_broadcast', { text: voidMsg, timestamp: Date.now() });
           socket.emit('system_message', { text: ">>> Message cast into the void. It is now part of the global noise. <<<" });
           return;
        }

        socket.to(user.currentRoom).emit('receive_message', {
          id: Date.now().toString(),
          sender: uID,
          text: data.text,
          timestamp: Date.now()
        });
        
        const room = activeChats.get(user.currentRoom);
        if (room) {
          room.lastActivityAt = Date.now();
          room.promptInjected = false;
          room.messageCount = (room.messageCount || 0) + 1;
        }

        // Reward points
        user.points += 5;
        socket.emit('points_updated', { points: user.points, reason: '+5 msg' });
      }
    });

    socket.on('trigger_activity', () => {
      const user = users.get(uID);
      if (!user || !user.currentRoom) return;
      const room = activeChats.get(user.currentRoom);
      if (room) {
        const randomActivity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
        io.to(user.currentRoom).emit('system_message', {
           text: `[MINI-GAME] SYSTEM_INJECT: ${randomActivity}`
        });
        room.lastActivityAt = Date.now();
      }
    });

    // Handle mutual reveals
    socket.on('propose_reveal', (data) => {
      const user = users.get(uID);
      if (!user || !user.currentRoom) return;

      const room = activeChats.get(user.currentRoom);
      if (!room) return;

      if (user.points < data.cost) {
         socket.emit('system_message', { text: `Insufficient points to propose ${data.type} reveal.` });
         return;
      }

      // Mark as pending
      room.pendingReveals[data.type] = {
         proposedBy: uID,
         cost: data.cost
      };

      // Notify the room
      io.to(user.currentRoom).emit('system_message', {
         text: `>>> MUTUAL REVEAL PROPOSED: ${data.type.toUpperCase()} (${data.cost} pts). Type /accept ${data.type} to unlock. <<<`,
         revealProposal: data.type
      });
    });

    socket.on('accept_reveal', (data) => {
       const user = users.get(uID);
       if (!user || !user.currentRoom) return;

       const room = activeChats.get(user.currentRoom);
       if (!room) return;

       const pending = room.pendingReveals[data.type];
       if (!pending || pending.proposedBy === uID) return; // Cant accept own request

       if (user.points < pending.cost) {
          socket.emit('system_message', { text: `Insufficient points to accept ${data.type} reveal.` });
          return;
       }

       const proposerID = pending.proposedBy;
       const proposer = users.get(proposerID);

       // Deduct points
       user.points -= pending.cost;
       proposer.points -= pending.cost;

       io.to(uID).emit('points_updated', { points: user.points });
       io.to(proposerID).emit('points_updated', { points: proposer.points });

       // Broadcast the actual profile data!
       io.to(uID).emit('system_message', { text: `[REVEALED] Partner's ${data.type}: ${proposer.profile[data.type] || 'Unknown'}`});
       io.to(proposerID).emit('system_message', { text: `[REVEALED] Partner's ${data.type}: ${user.profile[data.type] || 'Unknown'}`});
       
       delete room.pendingReveals[data.type];
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite middleware for development");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static dist for production");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of activeChats.entries()) {
      // Momentum: 30 seconds of silence for demonstration
      if (now - room.lastActivityAt > 30000 && !room.promptInjected) {
         const randomPrompt = DEEP_PROMPTS[Math.floor(Math.random() * DEEP_PROMPTS.length)];
         io.to(roomId).emit('system_message', {
            text: `[SILENCE_DETECTED] > Injecting momentum prompt: "${randomPrompt}"`
         });
         room.lastActivityAt = now; 
         room.promptInjected = true;
      }

      // Milestone: 1 minute (60s)
      if (now - room.createdAt > 60000 && !room.milestones['1']) {
          io.to(roomId).emit('system_message', {
             text: `[MILESTONE_UNLOCKED] > You've survived 1 minute together. Longer than 40% of connections.`
          });
          room.milestones['1'] = true;
      }
      // Milestone: 5 minute (300s)
      if (now - room.createdAt > 300000 && !room.milestones['5']) {
          io.to(roomId).emit('system_message', {
             text: `[MILESTONE_UNLOCKED] > 5 minutes. You've talked longer than 82% of conversations. Connection deepening.`
          });
          room.milestones['5'] = true;
      }
    }
  }, 5000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
