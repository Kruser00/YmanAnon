import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database('phos_sqlite.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    points INTEGER DEFAULT 200,
    reputation_positive INTEGER DEFAULT 0,
    reputation_negative INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
  logger.warn("JWT_SECRET environment variable not set. Using random ephemeral key.");
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json()); // Add support for JSON bodies
  app.use('/api/', apiLimiter); // Apply rate limiting to all /api/ routes

  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    maxHttpBufferSize: 1e8 // 100 MB
  });

  // --- IN-MEMORY RAM STORAGE (NON-PERSISTENT) ---
  // When the server restarts, everything is purged.
  
  // Authentication Endpoints
  
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
       return res.status(400).json({ error: 'Username must be 3-20 characters long and contain only alphanumeric characters, underscores, or hyphens.' });
    }
    
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 100) {
       return res.status(400).json({ error: 'Password must be between 6 and 100 characters.' });
    }
    
    try {
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUser) return res.status(409).json({ error: 'Username already exists' });

      const hash = bcrypt.hashSync(password, 10);
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, username, hash);
      
      const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, id, username, points: 200, reputation: { positive: 0, negative: 0 } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password required' });
    }

    try {
      const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ 
        token, 
        id: user.id, 
        username: user.username, 
        points: user.points, 
        reputation: { positive: user.reputation_positive, negative: user.reputation_negative } 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/me', authenticateToken, (req: any, res: any) => {
    try {
      const user: any = db.prepare('SELECT id, username, points, reputation_positive, reputation_negative FROM users WHERE id = ?').get(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        points: user.points, 
        reputation: { positive: user.reputation_positive, negative: user.reputation_negative } 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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
    let token = data.token;
    let userId = data.nodeId || `ANON_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    let isGuest = true;
    let dbUser: any = null;

    if (token) {
       try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          userId = decoded.id;
          isGuest = false;
          dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
       } catch (e) {
          // invalid token
       }
    }

    const nodeId = userId;
    
    let user = nodeToUser.get(nodeId);
    if (!user) {
        logger.info(`[CORE_SYNC] Initializing identity matrix for node: ${nodeId}`);
        user = {
            nodeId,
            points: isGuest ? 200 : (dbUser ? dbUser.points : 200),
            reputation: isGuest ? { positive: 0, negative: 0 } : (dbUser ? { positive: dbUser.reputation_positive, negative: dbUser.reputation_negative } : { positive: 0, negative: 0 }),
            profile: data.profile || {},
            freq: data.freq || null,
            currentRoom: null,
            lastPartnerId: null,
            lastAdClaimedAt: 0,
            lastMessageAt: 0,
            isGuest
        };
        nodeToUser.set(nodeId, user);
    } else {
        logger.info(`[CORE_SYNC] Node re-linked: ${nodeId} | Balance: ${user.points}`);
        // If they had logged in from elsewhere or reconnect, sync DB points just in case
        if (!isGuest && dbUser) {
            user.points = dbUser.points;
            user.reputation = { positive: dbUser.reputation_positive, negative: dbUser.reputation_negative };
        }
        if (data.profile) user.profile = { ...user.profile, ...data.profile };
    }

    // Link current socket
    user.lastSocketId = user.socketId;
    user.socketId = socketId;
    socketToUser.set(socketId, user);
    return user;
  };

  io.on('connection', (socket) => {
    logger.info(`[RAM_STORAGE] Terminal connect: ${socket.id}`);
    const sId = socket.id;

    syncAtmosphere();

    socket.on('register_node', (data) => {
      const user = registerUser(sId, data);
      syncUserState(sId);
      
      if (user.currentRoom) {
         const room = activeChats.get(user.currentRoom);
         if (room) {
            socket.join(user.currentRoom);
            // Replace the old socketId in the room.users array with the new one
            room.users = room.users.map((id: string) => id === user.lastSocketId ? sId : id);
            
            // Inform the partner that they returned
            const partnerId = room.users.find((id: string) => id !== sId);
            if (partnerId) {
                io.to(partnerId).emit('system_message', { text: `[INFO] Partner node connection restored. / اتصال کاربر مقابل بازیابی شد.` });
                
                // Update their target to the new socket id
                const partnerState = socketToUser.get(partnerId);
                if (partnerState && partnerState.lastPartnerId === user.lastSocketId) {
                   partnerState.lastPartnerId = sId;
                }
            }
            
            user.lastPartnerId = partnerId;
            
            socket.emit('rejoined_room', { 
               roomId: user.currentRoom,
               topic: room.topic
            });
         } else {
            user.currentRoom = null;
         }
      }
    });

    socket.on('disconnect', () => {
      queue = queue.filter(u => u.socketId !== sId);
      const user = socketToUser.get(sId);
      socketToUser.delete(sId);
      
      if (user && user.socketId === sId) {
        if (user.currentRoom) {
           const room = activeChats.get(user.currentRoom);
           if (room) {
              const partnerId = room.users.find((id: string) => id !== sId);
              if (partnerId) {
                  io.to(partnerId).emit('system_message', { text: `[WARNING] Partner node lost connection. Waiting for reconnect... / هشدار: اتصال کاربر مقابل قطع شد. در انتظار اتصال مجدد...` });
              }
              // Set a timeout to terminate if they don't reconnect
              setTimeout(() => {
                 const currentUserState = nodeToUser.get(user.nodeId);
                 if (currentUserState && currentUserState.currentRoom === user.currentRoom && !socketToUser.has(currentUserState.socketId)) {
                     terminateChat(user.currentRoom);
                 }
              }, 30000); // 30 seconds grace period
           }
        }
      }
      syncAtmosphere();
    });

    socket.on('leave_pool', () => {
      queue = queue.filter(u => u.socketId !== sId);
      const user = socketToUser.get(sId);
      if (user?.currentRoom && user.socketId === sId) terminateChat(user.currentRoom);
    });

    socket.on('spend_points', (data) => {
       const user = socketToUser.get(sId);
       if (user && user.points >= data.amount) {
           user.points -= data.amount;
           if (!user.isGuest) {
               db.prepare('UPDATE users SET points = ? WHERE id = ?').run(user.points, user.nodeId);
           }
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
          
          if (!partner.isGuest) {
             db.prepare('UPDATE users SET points = ?, reputation_positive = ?, reputation_negative = ? WHERE id = ?').run(partner.points, partner.reputation.positive, partner.reputation.negative, partner.nodeId);
          }
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
        const now = Date.now();
        if (now - user.lastMessageAt < 500) {
           return; // Rate limit: max 2 messages per second
        }
        user.lastMessageAt = now;

        if (typeof data.text !== 'string' || data.text.length > 2000) return;
        if (data.image && (typeof data.image !== 'string' || data.image.length > 5000000)) {
           socket.emit('system_message', { text: 'SYS_ERR: Image payload too large. Max 3MB.' });
           return;
        }

        if (data.text.startsWith('/void ')) {
           const voidMsg = data.text.replace('/void ', '');
           io.emit('void_broadcast', { text: voidMsg.substring(0, 500), timestamp: now });
           socket.emit('system_message', { text: ">>> Message cast into the void. It is now part of the global noise. <<<" });
           return;
        }

        const messageId = data.id || now.toString();

        socket.to(user.currentRoom).emit('receive_message', {
          id: messageId,
          sender: sId,
          text: data.text,
          image: data.image,
          timestamp: now
        });

        // Confirm delivery to sender
        socket.emit('message_delivered', { id: messageId });
        
        if (data.image) {
           setTimeout(() => {
              io.to(user.currentRoom).emit('message_updated', { messageId, updates: { image: null, text: data.text ? data.text + '\n[ENCRYPTED PAYLOAD DESTRUCTED]' : '[ENCRYPTED PAYLOAD DESTRUCTED]' }});
           }, 30000);
        }

        const room = activeChats.get(user.currentRoom);
        if (room) {
          room.lastActivityAt = Date.now();
          room.messageCount++;
        }
        user.points += 2;
        if (!user.isGuest) {
           db.prepare('UPDATE users SET points = ? WHERE id = ?').run(user.points, user.nodeId);
        }
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

       const cost = 200;
       if (user.points >= cost) {
          user.points -= cost;
          if (!user.isGuest) {
             db.prepare('UPDATE users SET points = ? WHERE id = ?').run(user.points, user.nodeId);
          }
          room.expiresAt += 2 * 60 * 1000;
          syncUserState(sId);
          io.to(user.currentRoom).emit('system_message', { text: `[PROTOCOL_OVERRIDE] > Memory decay delayed by node contribution (+2m)` });
          io.to(user.currentRoom).emit('chat_timer_sync', { expiresAt: room.expiresAt });
          io.to(user.currentRoom).emit('timer_extended', { expiresAt: room.expiresAt });
       }
    });

    socket.on('typing', (data) => {
       const user = socketToUser.get(sId);
       if (user && user.currentRoom) {
         socket.to(user.currentRoom).emit('partner_typing', { isTyping: data.isTyping });
       }
    });

    socket.on('webrtc_offer', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        socket.to(user.currentRoom).emit('webrtc_offer', data);
      }
    });

    socket.on('webrtc_answer', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        socket.to(user.currentRoom).emit('webrtc_answer', data);
      }
    });

    socket.on('webrtc_ice_candidate', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        socket.to(user.currentRoom).emit('webrtc_ice_candidate', data);
      }
    });

    socket.on('unlock_feature', (data) => {
      const user = socketToUser.get(sId);
      if (user && user.currentRoom) {
        socket.to(user.currentRoom).emit('partner_unlocked_feature', data);
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
    logger.info(`Ephemeral Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => logger.error(`Fatal server error: ${err}`));
