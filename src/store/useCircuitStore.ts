import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GateTemplate = { id: string, label: string, icon: string, short: string, isControl?: boolean };
export type GateInstance = GateTemplate & { instanceId: string };

export interface SavedCircuit {
  id: string;
  name: string;
  wireMap: { [key: string]: GateInstance[] };
  timestamp: number;
}

interface CircuitState {
  wireMap: { [key: string]: GateInstance[] };
  setWireMap: (wireMap: { [key: string]: GateInstance[] }) => void;
  savedCircuits: SavedCircuit[];
  saveCircuit: (name: string) => void;
  loadCircuit: (wireMap: { [key: string]: GateInstance[] }) => void;
  deleteSavedCircuit: (id: string) => void;
  clearCircuit: () => void;
}

const emptyMap = { q0: [], q1: [], q2: [] };

export const availableGatesMaster: GateTemplate[] = [
  { id: "pauli-x", label: "Pauli-X", icon: "change_history", short: "X" },
  { id: "pauli-y", label: "Pauli-Y", icon: "pentagon", short: "Y" },
  { id: "pauli-z", label: "Pauli-Z", icon: "square", short: "Z" },
  { id: "hadamard", label: "Hadamard", icon: "hdr_strong", short: "H" },
  { id: "measure", label: "Evaluate", icon: "speed", short: "M" },
  { id: "cnot", label: "CNOT", icon: "mediation", short: "C", isControl: true },
];

export const useCircuitStore = create<CircuitState>()(
  persist(
    (set, get) => ({
      wireMap: emptyMap,
      
      setWireMap: (wireMap) => set({ wireMap }),
      
      savedCircuits: [],
      
      saveCircuit: (name) => {
        const { wireMap, savedCircuits } = get();
        const newCircuit: SavedCircuit = {
          id: Date.now().toString(),
          name,
          wireMap: JSON.parse(JSON.stringify(wireMap)), // Deep copy to detach from current refs
          timestamp: Date.now(),
        };
        set({ savedCircuits: [newCircuit, ...savedCircuits] });
      },
      
      loadCircuit: (wireMap) => set({ wireMap: JSON.parse(JSON.stringify(wireMap)) }),
      
      deleteSavedCircuit: (id) => {
        const { savedCircuits } = get();
        set({ savedCircuits: savedCircuits.filter(c => c.id !== id) });
      },
      
      clearCircuit: () => set({ wireMap: emptyMap })
    }),
    {
      name: 'quantum-sandbox-storage', // specific key in local storage
    }
  )
);
