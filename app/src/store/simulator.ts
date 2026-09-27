import { create } from 'zustand';
import { getDef, isTrigger } from '../nodes/registry';
import type { SimInputs, SimValue } from '../nodes/types';
import { runSimulation, triggerInputs, type SimRun } from '../sim/run';
import { useIssues } from './issues';
import { useProject } from './project';

interface SimulatorState {
  triggerId: string | null;
  /** What the user typed per trigger; defaults fill the rest. */
  typed: Record<string, SimInputs>;
  run: SimRun | null;
  /** Flow revision the run was made against, to flag stale results. */
  runRev: number;
  /** Index of the highlighted step. */
  active: number | null;
  /** Kept between runs: stored data and cooldowns. Session only. */
  data: Map<string, SimValue>;
  dataSize: number;
  setTrigger: (id: string) => void;
  setInput: (key: string, value: string | number | boolean) => void;
  runNow: () => void;
  resetData: () => void;
  setActive: (i: number | null) => void;
}

export const firstTriggerId = () =>
  useProject
    .getState()
    .nodes.filter((n) => isTrigger(getDef(n.data.type)))
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))[0]?.id ?? null;

export const useSimulator = create<SimulatorState>((set, get) => ({
  triggerId: null,
  typed: {},
  run: null,
  runRev: 0,
  active: null,
  data: new Map(),
  dataSize: 0,

  setTrigger: (triggerId) => set({ triggerId }),

  setInput: (key, value) => {
    const id = get().triggerId ?? firstTriggerId();
    if (!id) return;
    set((s) => ({ triggerId: id, typed: { ...s.typed, [id]: { ...s.typed[id], [key]: value } } }));
  },

  runNow: () => {
    const { nodes, edges } = useProject.getState();
    const id = get().triggerId ?? firstTriggerId();
    const trigger = nodes.find((n) => n.id === id);
    if (!id || !trigger) return;
    const { data, typed } = get();
    const run = runSimulation(nodes, edges, id, triggerInputs(trigger, nodes, edges, typed[id]), data);
    set({ triggerId: id, run, runRev: useIssues.getState().rev, active: null, dataSize: data.size });
  },

  resetData: () => {
    get().data.clear();
    set({ dataSize: 0 });
  },

  setActive: (active) => set({ active }),
}));
