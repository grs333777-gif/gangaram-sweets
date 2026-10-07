import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  ready: false,

  load: async () => {
    try {
      const data = await api.me();
      set({ user: data.data, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  signup: async (payload) => {
    const data = await api.signup(payload);
    set({ user: data.data, ready: true });
    return data.data;
  },

  login: async (payload) => {
    const data = await api.login(payload);
    set({ user: data.data, ready: true });
    return data.data;
  },

  logout: async () => {
    await api.logout();
    set({ user: null });
  },
}));
