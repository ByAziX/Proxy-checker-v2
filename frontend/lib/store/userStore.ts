import { create } from "zustand";

type User = {
  id?: number;
  name?: string | null;
  email?: string;
} | null;

type UserState = {
  user: User;
  token: string | null;
  setUser: (u: User) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: null,
  setUser: (u) => set({ user: u }),
  setToken: (token) => set({ token }),
  logout: () => set({ user: null, token: null }),
}));
