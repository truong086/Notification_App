import { create } from "zustand";

export const useUserStore = create((set) => ({
  user: "https://abmom.site",

  setUser: (data) =>
    set({
      user: data,
    }),

  clearUser: () =>
    set({
      user: null,
    }),
}));