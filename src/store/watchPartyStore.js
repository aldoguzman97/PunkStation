import { create } from 'zustand';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';

let socket = null;

export const useWatchPartyStore = create((set, get) => ({
  room: null,
  viewers: [],
  messages: [],
  isConnected: false,
  isHost: false,
  syncTime: undefined,
  syncPlaying: undefined,
  loading: false,
  error: null,

  // Create a new watch party
  createRoom: async (mediaId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axios.post(`${API}/watchparty`, { mediaId });
      set({ room: data, isHost: true, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to create room', loading: false });
      throw err;
    }
  },

  // Join existing room by code
  joinRoom: async (code) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axios.get(`${API}/watchparty/join/${code}`);
      set({ room: data, viewers: data.members || [], loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to join room', loading: false });
      throw err;
    }
  },

  // Fetch room details
  fetchRoom: async (roomId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axios.get(`${API}/watchparty/${roomId}`);
      set({ room: data, viewers: data.members || [], loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Room not found', loading: false });
      throw err;
    }
  },

  // List my active rooms
  fetchMyRooms: async () => {
    try {
      const { data } = await axios.get(`${API}/watchparty`);
      return data;
    } catch {
      return [];
    }
  },

  // Connect to WebSocket
  connectSocket: (roomCode, token) => {
    if (socket?.connected) {
      socket.disconnect();
    }

    socket = io(WS_URL, {
      path: '/ws/watchparty',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('join-room', roomCode);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('room-state', (state) => {
      set({
        syncTime: state.currentTime,
        syncPlaying: state.isPlaying,
        viewers: state.viewers,
        isHost: state.isHost,
      });
    });

    socket.on('playback-update', (data) => {
      set({
        syncTime: data.currentTime,
        syncPlaying: data.isPlaying,
      });
    });

    socket.on('seek-update', (data) => {
      set({ syncTime: data.currentTime });
    });

    socket.on('viewer-joined', (viewer) => {
      set((state) => ({
        viewers: [...state.viewers.filter(v => v.id !== viewer.id), viewer],
      }));
    });

    socket.on('viewer-left', (viewer) => {
      set((state) => ({
        viewers: state.viewers.filter(v => v.id !== viewer.id),
      }));
    });

    socket.on('chat-message', (msg) => {
      set((state) => ({
        messages: [...state.messages, msg].slice(-200), // Keep last 200 messages
      }));
    });

    socket.on('reaction', (data) => {
      // Dispatch a custom event for the UI to handle
      window.dispatchEvent(new CustomEvent('watchparty-reaction', { detail: data }));
    });

    socket.on('error', (data) => {
      set({ error: data.message });
    });
  },

  // Send playback sync (host only)
  syncPlayback: (currentTime, isPlaying) => {
    if (socket?.connected) {
      socket.emit('sync-playback', { currentTime, isPlaying });
    }
  },

  // Send seek event (host only)
  syncSeek: (currentTime) => {
    if (socket?.connected) {
      socket.emit('sync-seek', { currentTime });
    }
  },

  // Send chat message
  sendMessage: (message) => {
    if (socket?.connected) {
      socket.emit('chat-message', { message });
    }
  },

  // Send reaction
  sendReaction: (emoji) => {
    if (socket?.connected) {
      socket.emit('reaction', { emoji });
    }
  },

  // End watch party
  endRoom: async (roomId) => {
    try {
      await axios.delete(`${API}/watchparty/${roomId}`);
      get().disconnect();
      set({ room: null, viewers: [], messages: [], isHost: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to end party' });
    }
  },

  // Disconnect socket
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    set({ isConnected: false, syncTime: undefined, syncPlaying: undefined });
  },

  // Reset state
  reset: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    set({
      room: null, viewers: [], messages: [], isConnected: false,
      isHost: false, syncTime: undefined, syncPlaying: undefined,
      loading: false, error: null,
    });
  },
}));
