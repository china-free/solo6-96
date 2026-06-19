import { create } from "zustand";
import { SimParams, DEFAULT_PARAMS, SimStats, Food } from "@/types";

interface SimState {
  params: SimParams;
  stats: SimStats;
  foods: Food[];
  isPaused: boolean;
  showTrails: boolean;
  showAttractant: boolean;
  resetId: number;
  setParam: <K extends keyof SimParams>(key: K, value: SimParams[K]) => void;
  setStats: (stats: SimStats) => void;
  setFoods: (foods: Food[]) => void;
  addFood: (food: Food) => void;
  togglePause: () => void;
  toggleTrails: () => void;
  toggleAttractant: () => void;
  resetParams: () => void;
  resetSimulation: () => void;
}

let foodIdCounter = 0;
export const createFood = (x: number, y: number): Food => ({
  id: ++foodIdCounter,
  x,
  y,
  radius: 14,
  energy: 100,
  maxEnergy: 100,
  emissionRate: 1.5,
  pulsePhase: Math.random() * Math.PI * 2,
});

export const useSimStore = create<SimState>((set) => ({
  params: { ...DEFAULT_PARAMS },
  stats: { foodCollected: 0, activeParticles: 0, trunkCount: 0, avgPheromone: 0 },
  foods: [],
  isPaused: false,
  showTrails: true,
  showAttractant: false,
  resetId: 0,

  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  setStats: (stats) => set({ stats }),

  setFoods: (foods) => set({ foods }),

  addFood: (food) => set((state) => ({ foods: [...state.foods, food] })),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  toggleTrails: () => set((state) => ({ showTrails: !state.showTrails })),

  toggleAttractant: () => set((state) => ({ showAttractant: !state.showAttractant })),

  resetParams: () => set({ params: { ...DEFAULT_PARAMS } }),

  resetSimulation: () => {
    foodIdCounter = 0;
    set((state) => ({
      foods: [],
      stats: { foodCollected: 0, activeParticles: 0, trunkCount: 0, avgPheromone: 0 },
      resetId: state.resetId + 1,
    }));
  },
}));
