"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from '@dnd-kit/core';

const BlochSphere3D = dynamic(() => import('@/components/BlochSphere3D'), { ssr: false });

import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

// --- Types ---
import { useCircuitStore, GateTemplate, GateInstance } from '@/store/useCircuitStore';
import { applyGate, applyCnot, getBlochVector, getProbabilities, getInitialState } from '@/lib/quantumEngine';

// --- Constants ---
const availableGates: GateTemplate[] = [
  { id: "pauli-x", label: "Pauli-X", icon: "change_history", short: "X" },
  { id: "pauli-y", label: "Pauli-Y", icon: "pentagon", short: "Y" },
  { id: "pauli-z", label: "Pauli-Z", icon: "square", short: "Z" },
  { id: "hadamard", label: "Hadamard", icon: "hdr_strong", short: "H" },
  { id: "cnot", label: "CNOT", icon: "mediation", short: "C", isControl: true },
];

const gateTheoryById: Record<string, { basics: string; action: string }> = {
  "pauli-x": {
    basics: "Bit-flip gate. It swaps |0⟩ and |1⟩.",
    action: "Acts like a quantum NOT on the selected qubit.",
  },
  "pauli-y": {
    basics: "Bit and phase flip gate with complex amplitudes.",
    action: "Rotates the state around the Y-axis by pi on the Bloch sphere.",
  },
  "pauli-z": {
    basics: "Phase-flip gate. It keeps basis-state probabilities unchanged.",
    action: "Adds a minus phase to the |1⟩ component.",
  },
  hadamard: {
    basics: "Creates or removes superposition.",
    action: "Maps basis states into equal-weight combinations and enables interference.",
  },
  cnot: {
    basics: "Two-qubit controlled NOT operation.",
    action: "Flips a target qubit only when the control qubit is |1⟩.",
  },
};

const getDominantState = (probs: number[]) => {
  let maxIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[maxIdx]) maxIdx = i;
  }
  return maxIdx.toString(2).padStart(3, "0");
};

const getOutputReason = (gateId: string, wireId: string) => {
  const qubit = wireId.toUpperCase();
  switch (gateId) {
    case "pauli-x":
      return `X on ${qubit} swaps amplitudes with ${qubit}=0 and ${qubit}=1, changing output probabilities.`;
    case "pauli-y":
      return `Y on ${qubit} flips the qubit and adds a phase shift, so interference and outputs both change.`;
    case "pauli-z":
      return `Z on ${qubit} mainly changes phase, so the output changes through interference in later gates.`;
    case "hadamard":
      return `H on ${qubit} spreads amplitude across 0 and 1, producing superposition and interference.`;
    case "cnot":
      return `CNOT links two qubits conditionally, and this correlation can shift probability toward entangled outcomes.`;
    default:
      return "Gate application changed the amplitude distribution, which changed the output profile.";
  }
};

const getGateMatrixLaTeX = (gateId: string) => {
  switch (gateId) {
    case 'pauli-x': return "\\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}";
    case 'pauli-y': return "\\begin{pmatrix} 0 & -i \\\\ i & 0 \\end{pmatrix}";
    case 'pauli-z': return "\\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}";
    case 'hadamard': return "\\frac{1}{\\sqrt{2}} \\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}";
    case 'cnot': return "\\begin{pmatrix} 1 & 0 & 0 & 0 \\\\ 0 & 1 & 0 & 0 \\\\ 0 & 0 & 0 & 1 \\\\ 0 & 0 & 1 & 0 \\end{pmatrix}";
    default: return "";
  }
};

// --- Components ---

function DraggableGate({ gate }: { gate: GateTemplate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${gate.id}`,
    data: { gate },
  });

  const gateStyle = gate.id === 'pauli-x'
    ? 'text-[#ffb3b3] bg-[#2b0f10]/80 border-[#ff5c5c]/25 shadow-[0_0_14px_rgba(255,92,92,0.28)] group-hover:border-[#ff5c5c]/40 group-hover:shadow-[0_0_22px_rgba(255,92,92,0.35)]'
    : gate.id === 'pauli-y'
      ? 'text-[#c8ffdb] bg-[#0d1610]/80 border-[#50ff7c]/25 shadow-[0_0_14px_rgba(80,255,124,0.28)] group-hover:border-[#50ff7c]/40 group-hover:shadow-[0_0_22px_rgba(80,255,124,0.35)]'
      : gate.id === 'pauli-z'
        ? 'text-[#c8e8ff] bg-[#0b1220]/80 border-[#5b8cff]/25 shadow-[0_0_14px_rgba(91,140,255,0.28)] group-hover:border-[#5b8cff]/40 group-hover:shadow-[0_0_22px_rgba(91,140,255,0.35)]'
        : gate.id === 'hadamard'
          ? 'text-[#d8fdff] bg-[#08161b]/80 border-[#00d4ff]/25 shadow-[0_0_14px_rgba(0,212,255,0.35)] group-hover:border-[#00d4ff]/40 group-hover:shadow-[0_0_26px_rgba(0,212,255,0.45)]'
          : 'text-[#e5d4ff] bg-[#141025]/80 border-[#7c3aed]/25 shadow-[0_0_14px_rgba(124,58,237,0.28)] group-hover:border-[#7c3aed]/40 group-hover:shadow-[0_0_26px_rgba(124,58,237,0.45)]';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-3xl bg-[#1a2744] border border-[#2a4070] shadow-[0_0_20px_rgba(0,200,255,0.05)] backdrop-blur-xl group font-space font-bold cursor-grab active:cursor-grabbing transition-all relative ${
        isDragging ? 'opacity-30' : 'hover:bg-[#1f2f56]'
      }`}
    >
      <div className={`w-8 h-8 flex items-center justify-center rounded-2xl border border-[#2a4070] text-[#00d4ff] text-base transition-all ${gateStyle}`}>
        {gate.short}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-widest text-[#e2e8f0]/80 group-hover:text-[#e2e8f0] transition-colors">{gate.label}</span>
    </div>
  );
}

function DroppableWire({ wireId, label, gates, onDelete }: { wireId: string, label: string, gates: GateInstance[], onDelete: (id: string, wireId: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: wireId });

  return (
    <div className="flex items-center gap-4 group qubit-row">
      <span className="font-mono text-primary-fixed-dim text-sm w-4">{label}</span>
      <div
        ref={setNodeRef}
className={`h-10 flex-1 relative flex items-center transition-all ${isOver ? 'bg-[rgba(0,212,255,0.05)] outline outline-2 outline-dashed outline-[rgba(0,212,255,0.2)]' : ''}`}
        >
        <div className="absolute inset-y-[19px] left-0 right-0 h-[2px] bg-[rgba(0,212,255,0.2)] pointer-events-none"></div>

        <div className="flex items-center gap-4 h-full w-full pl-4 z-10">
          {gates.map((g) => {
            const isSpecialC = g.id === 'cnot';
            const glowStyle = g.id === 'pauli-x'
              ? 'border-[#ff5c5c]/25 text-[#ffd8d8] shadow-[0_0_18px_rgba(255,92,92,0.35)]'
              : g.id === 'pauli-y'
                ? 'border-[#50ff7c]/25 text-[#cfffe7] shadow-[0_0_18px_rgba(80,255,124,0.35)]'
                : g.id === 'pauli-z'
                  ? 'border-[#5b8cff]/25 text-[#d2e7ff] shadow-[0_0_18px_rgba(91,140,255,0.35)]'
                  : g.id === 'hadamard'
                    ? 'border-[#00d4ff]/20 text-[#d7fcff] shadow-[0_0_18px_rgba(0,212,255,0.35)]'
                    : 'border-[#7c3aed]/25 text-[#e6d8ff] shadow-[0_0_18px_rgba(124,58,237,0.35)]';

            return (
              <div
                key={g.instanceId}
                className={`relative w-10 h-10 flex items-center justify-center rounded-2xl border bg-white/5 backdrop-blur-xl text-lg cursor-default group/gate transition-all gate-placed ${glowStyle}`}
              >
                {/* Dynamically adjust line height mapping across 24px gaps and 40px blocks (64px offset per lane) */}
                {isSpecialC && (
                  <div className="absolute left-1/2 w-[2px] bg-secondary shadow-[0_0_8px_rgba(223,183,255,0.6)] z-[-1] pointer-events-none"
                       style={{
                         top: wireId === 'q2' ? '-108px' : '20px',
                         height: wireId === 'q2' ? '128px' : '64px',
                         transform: 'translateX(-50%)'
                       }}>
                     <div className={`absolute left-1/2 w-4 h-4 rounded-full border-[2px] border-secondary bg-[#050810] translate-x-[-50%] z-10 flex items-center justify-center ${wireId === 'q2' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-[40%]'}`}>
                       <span className="text-[12px] text-secondary leading-none">+</span>
                     </div>
                  </div>
                )}

                {g.short}

                {/* LaTeX Matrix Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max px-4 py-2 bg-[#08101a] border border-[#00d4ff]/30 rounded-lg shadow-[0_15px_30px_rgba(0,0,0,0.8)] opacity-0 group-hover/gate:opacity-100 transition-all pointer-events-none z-[100] transform scale-95 origin-bottom group-hover/gate:scale-100 flex flex-col items-center backdrop-blur-xl">
                  <span className="text-[9px] font-space text-[#00d4ff] uppercase tracking-[0.3em] opacity-80 mb-2">{g.label} Opr</span>
                  <div className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] text-sm">
                    <InlineMath math={getGateMatrixLaTeX(g.id)} />
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#00d4ff]/30"></div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => onDelete(g.instanceId, wireId)}
                  className="absolute -top-2 -right-2 bg-error text-on-error w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover/gate:opacity-100 transition-opacity z-50 text-[10px]"
                >
                  <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  
  const [activeGate, setActiveGate] = useState<GateTemplate | null>(null);
  const { wireMap, setWireMap, saveCircuit, clearCircuit } = useCircuitStore();

  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [simState, setSimState] = useState({
    probs: [100, 0, 0, 0, 0, 0, 0, 0],
    bloch: [
      {x: 0, y: 0, z: 1},
      {x: 0, y: 0, z: 1},
      {x: 0, y: 0, z: 1}
    ],
    status: 'Ready', telemetry: 'Initial state |000⟩ detected. System stable.', isExecuting: false
  });
  const [insight, setInsight] = useState({
    before: [100, 0, 0, 0, 0, 0, 0, 0] as number[],
    after: [100, 0, 0, 0, 0, 0, 0, 0] as number[],
    reason: "Place a gate to see before/after output and a short explanation.",
    lastAction: "Waiting for circuit update",
  });

  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const calculateState = useCallback((currentWires: typeof wireMap) => {
    let state = getInitialState();
    const totalGates = Object.values(currentWires).flat().length;
    let gateDepth = 0;

    const maxLen = Math.max(currentWires.q0.length, currentWires.q1.length, currentWires.q2.length);
    gateDepth = maxLen;

    for (let t = 0; t < maxLen; t++) {
      const g0 = currentWires.q0[t];
      const g1 = currentWires.q1[t];
      const g2 = currentWires.q2[t];

      const processGate = (g: GateInstance | undefined, q: number) => {
        if (!g) return;
        if (g.id === 'cnot') {
          const target = q < 2 ? q + 1 : 0;
          state = applyCnot(state, q, target);
        } else {
          state = applyGate(state, g.id, q);
        }
      }

      processGate(g0, 0);
      processGate(g1, 1);
      processGate(g2, 2);
    }

    const probs = getProbabilities(state).map(v => v * 100);
    const bloch = [
      getBlochVector(state, 0),
      getBlochVector(state, 1),
      getBlochVector(state, 2)
    ];

    let tMsg = totalGates > 0
      ? `Circuit depth: ${gateDepth}. Total Gates: ${totalGates}.`
      : "Initial state |000⟩ detected. System stable.";

    if (totalGates > 0 && Object.values(currentWires).flat().some(g => g.id === 'cnot')) {
      tMsg += " Entanglement matrix applied.";
    }

    return {
      probs,
      bloch,
      status: totalGates > 0 ? "Analyzed" : "Ready",
      telemetry: tMsg
    };
  }, []);

  const updateSim = useCallback((newWires: typeof wireMap) => {
    // Clear any existing timeout to prevent flickering
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    const totalGates = Object.values(newWires).flat().length;
    if (totalGates > 0) {
      setSimState(prev => ({ ...prev, status: "Processing...", telemetry: prev.telemetry }));
      processingTimeoutRef.current = setTimeout(() => {
        setSimState(prev => ({ ...prev, ...calculateState(newWires) }));
        processingTimeoutRef.current = null;
      }, 400);
    } else {
      setSimState(prev => ({ ...prev, ...calculateState(newWires) }));
    }
  }, [calculateState]);

  useEffect(() => {
    if (isMounted) {
      updateSim(wireMap);
    }
  }, [isMounted, updateSim, wireMap]); // Sync visually on mount

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.gate) setActiveGate(active.data.current.gate as GateTemplate);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGate(null);
    if (!over || !['q0', 'q1', 'q2'].includes(over.id as string)) return;

    const gateData = active.data.current?.gate as GateTemplate;
    if (gateData) {
      const before = calculateState(wireMap).probs;
      const newMap = { ...wireMap, [over.id]: [...wireMap[over.id], { ...gateData, instanceId: `${gateData.id}-${Date.now()}` }] };
      setWireMap(newMap);
      updateSim(newMap);
      const after = calculateState(newMap).probs;
      setInsight({
        before,
        after,
        reason: getOutputReason(gateData.id, over.id as string),
        lastAction: `${gateData.label} placed on ${(over.id as string).toUpperCase()}`,
      });
    }
  };

  const handleDelete = (instanceId: string, wireId: string) => {
    const before = calculateState(wireMap).probs;
    const removedGate = wireMap[wireId].find(g => g.instanceId === instanceId);
    const newMap = { ...wireMap, [wireId]: wireMap[wireId].filter(g => g.instanceId !== instanceId) };
    setWireMap(newMap);
    updateSim(newMap);
    const after = calculateState(newMap).probs;
    setInsight({
      before,
      after,
      reason: "Removing this gate changed interference pathways, so output probabilities rebalanced.",
      lastAction: `${removedGate?.label ?? "Gate"} removed from ${wireId.toUpperCase()}`,
    });
  };

  const handleClearCircuit = () => {
    const before = calculateState(wireMap).probs;
    clearCircuit();
    updateSim({ q0: [], q1: [], q2: [] });
    setInsight({
      before,
      after: [100, 0, 0, 0, 0, 0, 0, 0],
      reason: "Without gates, the register returns to the initial state |000⟩.",
      lastAction: "Circuit cleared",
    });
  };

  if (!isMounted) return <div className="min-h-screen bg-background"></div>;

  return (
    <DndContext id="sandbox-dnd-context" onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col bg-background text-on-background min-h-screen selection:bg-primary-container/30">

        {/* TopNavBar */}
        <div className="fixed top-0 left-0 w-full h-16 z-[60] flex justify-between items-center px-8 pointer-events-none">
          <div className="w-48"></div> {/* Spacer for sidebar logo */}
          <nav className="hidden md:flex gap-6 absolute left-1/2 -translate-x-1/2 pointer-events-auto">
            <Link href="/" className="text-[#00d4ff] font-bold border-b-2 border-[#00d4ff] font-space tracking-tight transition-all">Dashboard</Link>
            <Link href="/simulations" className="text-[#64748b] hover:text-[#00d4ff] hover:bg-[#1a2744]/80 transition-all font-space tracking-tight px-3 py-1 rounded">Simulations</Link>
          </nav>
          <div className="flex items-center gap-4 pointer-events-auto">
            <Link href="/about" className="hidden sm:flex text-[#64748b] hover:text-[#00d4ff] transition-all material-symbols-outlined p-2 rounded-full cursor-pointer items-center justify-center">
              help
            </Link>
            <button
              onClick={() => {
                const name = window.prompt("Enter circuit name:");
                if (name) saveCircuit(name);
              }}
              className="bg-[#0d1f35] text-[#e2e8f0] border border-[#1a3a5c] px-4 py-1.5 rounded-lg font-bold text-xs font-space active:scale-95 duration-150 cursor-pointer hover:bg-[#14243f] transition-all"
            >
              Save
            </button>
            <button
              onClick={handleClearCircuit}
              className="bg-error text-on-error px-4 py-1.5 rounded-lg font-bold text-xs font-space active:scale-95 duration-150 cursor-pointer hover:bg-error/80 border border-[rgba(255,84,73,0.5)] shadow-[0_0_15px_rgba(255,84,73,0.3)] transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Animated Background Header Layer */}
        <header
          onMouseEnter={() => setIsHeaderExpanded(true)}
          onMouseLeave={() => setIsHeaderExpanded(false)}
          className={`w-full top-0 sticky z-[50] flex items-center px-8 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden ${
            isHeaderExpanded
              ? 'h-[30vh] bg-[#050810] shadow-[0_20px_80px_rgba(0,0,0,0.8)] border-b border-[#1a3a5c]'
              : 'h-16 bg-[#050810] shadow-[0_0_24px_rgba(0,212,255,0.08)] group/header'
          }`}
        >
          {/* Animated Branding */}
          <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col items-center pointer-events-none ${
            isHeaderExpanded ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-125' : 'top-1/2 left-8 -translate-y-1/2 scale-90 md:scale-100'
          }`}>
            <div className="text-xl font-bold tracking-tighter text-[#dbfcff] font-space leading-none drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">QUANTUM CIRCUIT SANDBOX</div>
            <div className={`text-[9px] uppercase tracking-[0.3em] font-medium transition-all duration-700 overflow-hidden flex justify-center ${
              isHeaderExpanded ? 'h-6 mt-4 opacity-100 pointer-events-auto' : 'h-0 mt-0 opacity-0 group-hover/header:h-3 group-hover/header:mt-1 group-hover/header:opacity-100'
            }`}>
              <style>{`
                .neon-glow-always { animation: neon-pulse 1.5s infinite; text-shadow: 0 0 8px #00d4ff, 0 0 20px #00d4ff; color: #00d4ff; }
                @keyframes neon-pulse { 0%, 100% { text-shadow: 0 0 8px #00d4ff, 0 0 20px #00d4ff; } 50% { text-shadow: 0 0 15px #7c3aed, 0 0 30px #7c3aed; color: #7c3aed; } }
              `}</style>
              <div className="neon-glow-always whitespace-nowrap">
                PHYSICS PROJECT BY DHRUV AND RAHUL
              </div>
            </div>
          </div>
        </header>

        <main className={`flex flex-[1_0_auto] pb-24 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${isHeaderExpanded ? 'opacity-40 blur-[2px] scale-[0.98]' : 'opacity-100 blur-0 scale-100'}`}>
          {/* SideNavBar (Left Gate Library made narrower) */}
          <aside className="h-full w-48 fixed left-0 top-16 pt-8 pb-8 px-4 flex flex-col bg-[#0d1f35] z-40 border-r border-[#1a3a5c] shadow-[0_0_20px_rgba(0,200,255,0.05)] overflow-y-auto">
            <div className="mb-4 px-2">
              <h2 className="text-[#00d4ff] text-sm font-black font-space uppercase">Core Gates</h2>
            </div>

            <div className="space-y-1">
              {availableGates.map(gate => (
                <DraggableGate key={gate.id} gate={gate} />
              ))}
            </div>
          </aside>

          {/* Central Content Area (Allowing Scrolling) */}
          <div className="flex-1 ml-48 flex flex-col pt-4 px-6 lg:px-8 gap-4 w-full pr-8">

            {/* Top Row: Probabilities & Telemetry (Left) + Canvas (Right) */}
            <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">

              {/* Left: Probabilities and all */}
              <div className="w-full lg:w-64 xl:w-72 bg-[#0d1f35] rounded-xl border border-[#1a3a5c] p-3 shadow-[0_0_20px_rgba(0,200,255,0.05)] shrink-0 flex flex-col justify-between">
                <div>
                  <h3 className="text-[11px] font-bold font-space text-[#00d4ff] mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">analytics</span>
                    Probabilities
                  </h3>

                  <div className="flex-1 flex flex-col gap-2 justify-center mb-3">
                    {['000', '001', '010', '011', '100', '101', '110', '111'].map((stateLabel, i) => {
                      const prob = simState.probs[i];
                      return (
                        <div key={stateLabel} className="flex flex-col">
                          <div className="flex justify-between items-end text-[10px] font-mono mb-1.5">
                            <span className={`text-[11px] ${prob > 5 ? 'text-primary font-bold' : 'text-[#64748b]/40'}`}>|{stateLabel}⟩</span>
                            <span className={`text-[11px] ${prob > 5 ? 'text-[#e2e8f0] font-bold shadow-sm' : 'text-on-surface-variant'}`}>{prob.toFixed(1)}%</span>
                          </div>
                          <div className="h-[3px] w-full bg-[#0d1f35] rounded-full overflow-hidden">
                             <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] transition-all duration-500 shadow-[0_0_10px_rgba(0,212,255,0.25)]" style={{ width: `${prob.toFixed(1)}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                   <div className="bg-[#00d4ff20] px-3 py-1.5 flex items-center gap-2 rounded border border-[#00d4ff40] self-start shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                     <span className={`w-1.5 h-1.5 rounded-full ${simState.status === 'Processing...' || simState.isExecuting ? 'bg-[#00d4ff] animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.8)]' : 'bg-[#64748b]/40'}`}></span>
                     <span className="text-[9px] font-mono text-[#00d4ff] uppercase tracking-widest">{simState.status}</span>
                   </div>
                   <p className="text-[10px] uppercase tracking-wider text-[#64748b] leading-relaxed font-mono">{simState.telemetry}</p>
                </div>
              </div>

              {/* Right: Circuit Canvas Input + Insight Panel */}
              <div className="flex-1 w-full bg-[#0d1f35] rounded-xl p-4 lg:p-6 border border-[#1a3a5c] relative shadow-[0_0_20px_rgba(0,200,255,0.05)]">
                <div className="relative z-10 flex flex-col xl:flex-row gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 border-b border-white/5 pb-2">
                      <h1 className="text-lg font-bold font-space text-primary tracking-tight mb-1">Circuit Canvas</h1>
                      <p className="text-xs text-on-surface-variant font-body">Assemble quantum instructions by dragging operators.</p>
                    </div>

                    <div className="space-y-3 relative z-10 w-full pt-1 pb-1">
                      <style>{`
                        @keyframes snapIn { from { transform: scale(1.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                        .gate-placed { animation: snapIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                      `}</style>
                      <DroppableWire wireId="q0" label="q0" gates={wireMap['q0']} onDelete={handleDelete} />
                      <DroppableWire wireId="q1" label="q1" gates={wireMap['q1']} onDelete={handleDelete} />
                      <DroppableWire wireId="q2" label="q2" gates={wireMap['q2']} onDelete={handleDelete} />
                    </div>

                    <div className="mt-10 border-t border-white/5 pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-space text-primary/70 uppercase tracking-wider">Qubits</label>
                          <input type="number" min="1" max="5" defaultValue="3" className="bg-surface-container-highest text-primary text-xs px-2 py-1 rounded border border-outline-variant/30 focus:border-primary/50 outline-none" disabled />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-space text-primary/70 uppercase tracking-wider">Depth</label>
                          <input type="text" value={Math.max(wireMap.q0.length, wireMap.q1.length, wireMap.q2.length)} className="bg-surface-container-highest text-primary text-xs px-2 py-1 rounded border border-outline-variant/30 outline-none" disabled />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-space text-primary/70 uppercase tracking-wider">Gates</label>
                          <input type="text" value={Object.values(wireMap).flat().length} className="bg-surface-container-highest text-primary text-xs px-2 py-1 rounded border border-outline-variant/30 outline-none" disabled />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-space text-primary/70 uppercase tracking-wider">Basis</label>
                          <select className="bg-surface-container-highest text-primary text-xs px-2 py-1 rounded border border-outline-variant/30 focus:border-primary/50 outline-none cursor-pointer">
                            <option>Computational</option>
                            <option>Hadamard</option>
                            <option>X-basis</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="xl:w-80 shrink-0 rounded-xl border border-[#24446f] bg-[#061226]/70 p-4 backdrop-blur-xl h-fit">
                    <h3 className="text-[11px] font-space uppercase tracking-[0.2em] text-[#00d4ff] mb-3">Why This Output?</h3>
                    <p className="text-[10px] text-[#9db2d2] mb-3 font-mono uppercase tracking-wider">{insight.lastAction}</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-lg border border-[#24446f] bg-[#09172c] p-2">
                        <p className="text-[9px] text-[#7ea8da] uppercase tracking-wider mb-1">Before</p>
                        <p className="text-[12px] text-[#dbeaff] font-mono">|{getDominantState(insight.before)}⟩</p>
                        <p className="text-[10px] text-[#8aa3c5] mt-1">{Math.max(...insight.before).toFixed(1)}%</p>
                      </div>
                      <div className="rounded-lg border border-[#24446f] bg-[#09172c] p-2">
                        <p className="text-[9px] text-[#7ea8da] uppercase tracking-wider mb-1">After</p>
                        <p className="text-[12px] text-[#dbeaff] font-mono">|{getDominantState(insight.after)}⟩</p>
                        <p className="text-[10px] text-[#8aa3c5] mt-1">{Math.max(...insight.after).toFixed(1)}%</p>
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#d1def2]">{insight.reason}</p>
                  </aside>
                </div>

                <div className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-xl" style={{ backgroundImage: "radial-gradient(#00d4ff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              </div>

            </div>

            {/* Bottom Row: Graphs (Bloch Spheres) across full width */}
            <div className="w-full bg-[#0d1f35] border border-[#1a3a5c] p-6 md:p-8 rounded-xl flex flex-col gap-6 shadow-[0_0_20px_rgba(0,200,255,0.05)]">

               <h4 className="text-sm font-space uppercase tracking-[0.2em] text-[#00d4ff] border-b border-[#1a3a5c] pb-4">State Vectors</h4>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8 w-full mt-2">
                  {simState.bloch.map((sphereProps, i) => (
                    <div key={i} className="relative aspect-square max-h-[400px] w-full mx-auto border border-[#1a3a5c]/70 rounded-lg bg-[#0d1f35]/60 overflow-hidden shadow-[inner_0_0_15px_rgba(0,212,255,0.03)] flex flex-col items-center">
                      <div className="absolute top-4 left-4 text-[12px] font-mono text-[#e2e8f0]/80 font-bold uppercase z-10 shadow-sm bg-[#050810]/70 px-2 py-1 rounded border border-[#00d4ff]/20">q{i}</div>
                      <div className="w-full h-full"><BlochSphere3D {...sphereProps} /></div>
                    </div>
                  ))}
               </div>
            </div>

          </div>
        </main>

        <DragOverlay dropAnimation={null}>
          {activeGate ? (
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-space font-bold text-lg opacity-90 backdrop-blur-md ${activeGate.id === 'hadamard' ? 'bg-[#00d4ff] text-[#001a25] shadow-[0_0_25px_rgba(0,212,255,0.45)]' : activeGate.id === 'cnot' ? 'bg-secondary text-on-secondary shadow-[0_0_25px_rgba(124,58,237,0.45)]' : 'bg-[#0d1f35] border border-[#1a3a5c] text-[#e2e8f0] shadow-[0_0_15px_rgba(0,0,0,0.5)]'}`}>
              {activeGate.short}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
