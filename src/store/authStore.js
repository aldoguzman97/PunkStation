import { create } from 'zustand';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Attach token to every request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('punk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Extract the most useful error message from an axios error
function extractErrorMessage(err, fallback) {
  if (!err.response) {
    return 'Network error — is the server running?';
  }
  const data = err.response.data;
  // Server sends { error: "..." } for most errors
  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }
  // Validation errors include a details array
  if (data?.details?.length > 0) {
    return data.details[0].message;
  }
  return fallback;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('punk_token'),
  loading: true,
  error: null,

  // Initialize — check stored token
  init: async () => {
    const token = localStorage.getItem('punk_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const { data } = await axios.get(`${API}/auth/me`);
      set({ user: data.user, loading: false, error: null });
    } catch {
      localStorage.removeItem('punk_token');
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (login, password) => {
    set({ error: null });
    try {
      const { data } = await axios.post(`${API}/auth/login`, { login, password });
      localStorage.setItem('punk_token', data.token);
      set({ user: data.user, token: data.token, error: null });
      return data.user;
    } catch (err) {
      const msg = extractErrorMessage(err, 'Login failed');
      set({ error: msg });
      throw new Error(msg);
    }
  },

  register: async (username, email, password) => {
    set({ error: null });
    try {
      const { data } = await axios.post(`${API}/auth/register`, { username, email, password });
      localStorage.setItem('punk_token', data.token);
      set({ user: data.user, token: data.token, error: null });
      return data.user;
    } catch (err) {
      const msg = extractErrorMessage(err, 'Registration failed');
      set({ error: msg });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('punk_token');
    set({ user: null, token: null });
  },

  updateProfile: async (updates) => {
    const { data } = await axios.put(`${API}/auth/profile`, updates);
    set({ user: data.user });
    return data.user;
  },

  changePassword: async (currentPassword, newPassword) => {
    await axios.put(`${API}/auth/password`, { currentPassword, newPassword });
  },

  isAdmin: () => get().user?.role === 'admin',
}));
