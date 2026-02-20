import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

// In-memory state for active rooms
const roomState = new Map();

export function initWatchPartySocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
    path: '/ws/watchparty',
  });

  // Auth middleware — verify JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyToken(token);
      const db = getDb();
      const user = db.prepare('SELECT id, username, avatar, role FROM users WHERE id = ? AND is_banned = 0').get(payload.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] ${socket.user.username} connected`);

    // Join a watch party room
    socket.on('join-room', (roomCode) => {
      const db = getDb();
      const room = db.prepare(`
        SELECT wr.* FROM watch_rooms wr WHERE wr.code = ? AND wr.is_active = 1
      `).get(roomCode);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.roomId = room.id;

      // Initialize room state if not exists
      if (!roomState.has(roomCode)) {
        roomState.set(roomCode, {
          currentTime: room.current_time || 0,
          isPlaying: !!room.is_playing,
          viewers: new Map(),
        });
      }

      const state = roomState.get(roomCode);
      state.viewers.set(socket.user.id, {
        id: socket.user.id,
        username: socket.user.username,
        avatar: socket.user.avatar,
        socketId: socket.id,
      });

      // Send current state to the joining user
      socket.emit('room-state', {
        currentTime: state.currentTime,
        isPlaying: state.isPlaying,
        viewers: Array.from(state.viewers.values()),
        isHost: room.host_id === socket.user.id,
      });

      // Notify others
      socket.to(roomCode).emit('viewer-joined', {
        id: socket.user.id,
        username: socket.user.username,
        avatar: socket.user.avatar,
        viewerCount: state.viewers.size,
      });

      console.log(`[WS] ${socket.user.username} joined room ${roomCode} (${state.viewers.size} viewers)`);
    });

    // Host controls — play/pause sync
    socket.on('sync-playback', (data) => {
      const { roomCode } = socket;
      if (!roomCode) return;

      const db = getDb();
      const room = db.prepare('SELECT host_id FROM watch_rooms WHERE code = ?').get(roomCode);

      // Only host can control playback
      if (!room || room.host_id !== socket.user.id) {
        socket.emit('error', { message: 'Only the host can control playback' });
        return;
      }

      const state = roomState.get(roomCode);
      if (!state) return;

      state.currentTime = data.currentTime;
      state.isPlaying = data.isPlaying;

      // Persist state to DB periodically
      db.prepare('UPDATE watch_rooms SET current_time = ?, is_playing = ? WHERE code = ?')
        .run(data.currentTime, data.isPlaying ? 1 : 0, roomCode);

      // Broadcast to all viewers except sender
      socket.to(roomCode).emit('playback-update', {
        currentTime: data.currentTime,
        isPlaying: data.isPlaying,
        from: socket.user.username,
      });
    });

    // Seek event from host
    socket.on('sync-seek', (data) => {
      const { roomCode } = socket;
      if (!roomCode) return;

      const db = getDb();
      const room = db.prepare('SELECT host_id FROM watch_rooms WHERE code = ?').get(roomCode);
      if (!room || room.host_id !== socket.user.id) return;

      const state = roomState.get(roomCode);
      if (state) state.currentTime = data.currentTime;

      socket.to(roomCode).emit('seek-update', {
        currentTime: data.currentTime,
        from: socket.user.username,
      });
    });

    // Chat messages in watch party
    socket.on('chat-message', (data) => {
      const { roomCode } = socket;
      if (!roomCode || !data.message?.trim()) return;

      const msg = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        userId: socket.user.id,
        username: socket.user.username,
        message: data.message.slice(0, 500),
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all in room including sender
      io.to(roomCode).emit('chat-message', msg);
    });

    // Reaction emojis
    socket.on('reaction', (data) => {
      const { roomCode } = socket;
      if (!roomCode) return;

      io.to(roomCode).emit('reaction', {
        userId: socket.user.id,
        username: socket.user.username,
        emoji: data.emoji,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const { roomCode } = socket;
      if (roomCode) {
        const state = roomState.get(roomCode);
        if (state) {
          state.viewers.delete(socket.user.id);

          socket.to(roomCode).emit('viewer-left', {
            id: socket.user.id,
            username: socket.user.username,
            viewerCount: state.viewers.size,
          });

          // Clean up empty rooms
          if (state.viewers.size === 0) {
            roomState.delete(roomCode);
          }
        }
      }
      console.log(`[WS] ${socket.user.username} disconnected`);
    });
  });

  return io;
}
