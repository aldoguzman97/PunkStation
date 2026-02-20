import { create } from 'zustand';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useMediaStore = create((set, get) => ({
  items: [],
  currentItem: null,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  loading: false,
  error: null,

  fetchMedia: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axios.get(`${API}/media`, { params });
      set({ items: data.items, pagination: data.pagination, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to fetch', loading: false });
    }
  },

  fetchOne: async (id) => {
    set({ loading: true, error: null, currentItem: null });
    try {
      const { data } = await axios.get(`${API}/media/${id}`);
      set({ currentItem: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Not found', loading: false });
    }
  },

  upload: async (file, metadata, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const { data } = await axios.post(`${API}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data;
  },

  updateMedia: async (id, updates) => {
    const { data } = await axios.put(`${API}/media/${id}`, updates);
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }));
    return data;
  },

  deleteMedia: async (id) => {
    await axios.delete(`${API}/media/${id}`);
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }));
  },

  toggleLike: async (id) => {
    const { data } = await axios.post(`${API}/media/${id}/like`);
    return data.liked;
  },

  addComment: async (mediaId, content) => {
    const { data } = await axios.post(`${API}/media/${mediaId}/comments`, { content });
    return data;
  },

  reportMedia: async (mediaId, reason) => {
    await axios.post(`${API}/media/${mediaId}/report`, { reason });
  },
}));
