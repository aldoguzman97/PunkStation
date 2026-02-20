import { create } from 'zustand';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useAdminStore = create((set) => ({
  stats: null,
  users: [],
  media: [],
  reports: [],
  auditLogs: [],
  loading: false,

  fetchStats: async () => {
    set({ loading: true });
    const { data } = await axios.get(`${API}/admin/stats`);
    set({ stats: data, loading: false });
    return data;
  },

  fetchUsers: async (params = {}) => {
    set({ loading: true });
    const { data } = await axios.get(`${API}/admin/users`, { params });
    set({ users: data.users, loading: false });
    return data;
  },

  banUser: async (id) => {
    await axios.put(`${API}/admin/users/${id}/ban`);
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, is_banned: 1 } : u)) }));
  },

  unbanUser: async (id) => {
    await axios.put(`${API}/admin/users/${id}/unban`);
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, is_banned: 0 } : u)) }));
  },

  changeRole: async (id, role) => {
    await axios.put(`${API}/admin/users/${id}/role`, { role });
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) }));
  },

  deleteUser: async (id) => {
    await axios.delete(`${API}/admin/users/${id}`);
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
  },

  fetchMedia: async (params = {}) => {
    set({ loading: true });
    const { data } = await axios.get(`${API}/admin/media`, { params });
    set({ media: data.items, loading: false });
    return data;
  },

  changeMediaStatus: async (id, status) => {
    await axios.put(`${API}/admin/media/${id}/status`, { status });
    set((s) => ({ media: s.media.map((m) => (m.id === id ? { ...m, status } : m)) }));
  },

  fetchReports: async (status = 'pending') => {
    set({ loading: true });
    const { data } = await axios.get(`${API}/admin/reports`, { params: { status } });
    set({ reports: data.reports, loading: false });
    return data;
  },

  resolveReport: async (id, status) => {
    await axios.put(`${API}/admin/reports/${id}`, { status });
    set((s) => ({ reports: s.reports.filter((r) => r.id !== id) }));
  },

  fetchAudit: async (params = {}) => {
    set({ loading: true });
    const { data } = await axios.get(`${API}/admin/audit`, { params });
    set({ auditLogs: data.logs, loading: false });
    return data;
  },
}));
