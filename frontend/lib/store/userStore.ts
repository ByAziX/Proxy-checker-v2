import { create } from "zustand";

type User = {
  id?: number;
  name?: string;
  email?: string;
} | null;

export const useUserStore = create((set) => ({
  user: null as User,
  setUser: (u: User) => set({ user: u }),
}));
