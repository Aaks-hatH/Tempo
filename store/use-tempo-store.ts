"use client";

import { create } from "zustand";

type ViewMode = "list" | "kanban";

type TempoState = {
  commandOpen: boolean;
  focusMinutes: number;
  viewMode: ViewMode;
  activeCallRoomId: string | null;
  toggleCommand: () => void;
  setCommandOpen: (open: boolean) => void;
  setFocusMinutes: (minutes: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveCallRoomId: (roomId: string | null) => void;
};

export const useTempoStore = create<TempoState>((set) => ({
  commandOpen: false,
  focusMinutes: 25,
  viewMode: "kanban",
  activeCallRoomId: null,
  toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setFocusMinutes: (focusMinutes) => set({ focusMinutes }),
  setViewMode: (viewMode) => set({ viewMode }),
  setActiveCallRoomId: (activeCallRoomId) => set({ activeCallRoomId }),
}));
