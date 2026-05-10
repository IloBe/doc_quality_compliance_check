import { create } from 'zustand';

type MockState = {
  isOperationsRunning: boolean;
  setOperationsRunning: (isRunning: boolean) => void;
};

export const useMockStore = create<MockState>((set) => ({
  isOperationsRunning: false,
  setOperationsRunning: (isRunning) => set({ isOperationsRunning: isRunning }),
}));
