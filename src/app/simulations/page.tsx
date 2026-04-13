"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCircuitStore, SavedCircuit } from '@/store/useCircuitStore';

// Common templates directly formatted to store schema
const PREDEFINED_CIRCUITS = [
  {
    id: "template-bell",
    name: "Bell State",
    description: "Maximal entanglement between two qubits. Uses a Hadamard followed by a CNOT.",
    wireMap: {
      q0: [{ id: "hadamard", label: "Hadamard", icon: "square", short: "H", instanceId: "h-1" }],
      q1: [{ id: "cnot", label: "CNOT", icon: "radio_button_checked", short: "C", instanceId: "c-1", isControl: true }],
      q2: [],
    }
  },
  {
    id: "template-superposition",
    name: "Complete Superposition",
    description: "Applies Hadamard to all target bits creating a full uniform distribution.",
    wireMap: {
      q0: [{ id: "hadamard", label: "Hadamard", icon: "square", short: "H", instanceId: "h-1" }],
      q1: [{ id: "hadamard", label: "Hadamard", icon: "square", short: "H", instanceId: "h-2" }],
      q2: [{ id: "hadamard", label: "Hadamard", icon: "square", short: "H", instanceId: "h-3" }],
    }
  },
  {
    id: "template-phase-flip",
    name: "Phase Flip",
    description: "Applies a Pauli-Z after a Hadamard to invert the relative phase.",
    wireMap: {
      q0: [
        { id: "hadamard", label: "Hadamard", icon: "square", short: "H", instanceId: "h-1" },
        { id: "pauli-z", label: "Pauli-Z", icon: "square", short: "Z", instanceId: "z-1" }
      ],
      q1: [],
      q2: [],
    }
  }
];

export default function SimulationsPage() {
  const router = useRouter();
  const { savedCircuits, loadCircuit, deleteSavedCircuit } = useCircuitStore();
  
  // Handling hydration errors with Nextjs
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleApplyCircuit = (wireMap: any) => {
    loadCircuit(wireMap);
    router.push('/');
  };

  if (!mounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-[100vh] bg-background text-on-surface font-body p-8 sm:p-12 relative overflow-hidden flex flex-col items-center">
      
      {/* Decorative Blur */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary-container/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="w-full max-w-6xl z-10">
        <header className="flex justify-between items-center mb-16 border-b border-outline-variant/30 pb-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black font-space text-primary tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              SIMULATIONS
            </h1>
            <p className="text-on-surface-variant font-mono text-xs tracking-widest uppercase opacity-80">
              Load templates or restore saved sessions
            </p>
          </div>
          <Link href="/">
            <button className="text-secondary hover:text-[#dfb7ff] bg-secondary/5 hover:bg-secondary/15 transition-all font-space tracking-widest uppercase text-xs px-6 py-3 rounded-full border border-secondary/20 flex items-center gap-2 group">
              <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Dashboard
            </button>
          </Link>
        </header>

        {/* Predefined Templates */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h2 className="text-xl font-space font-bold uppercase tracking-widest">Library Templates</h2>
          </div>
          
          <div className="grid grid-cols-1 border border-outline-variant/20 rounded-2xl md:grid-cols-3 gap-[1px] bg-outline-variant/20 overflow-hidden">
            {PREDEFINED_CIRCUITS.map((circuit) => (
              <div 
                key={circuit.id} 
                onClick={() => handleApplyCircuit(circuit.wireMap)}
                className="bg-[#151720] p-8 hover:bg-[#1a1c27] transition-colors cursor-pointer group relative"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/50 to-secondary/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                
                <h3 className="text-lg font-space font-bold text-primary mb-3">{circuit.name}</h3>
                <p className="text-sm text-on-surface-variant/70 leading-relaxed font-light">{circuit.description}</p>
                
                <div className="mt-8 flex justify-end">
                  <button className="text-xs font-mono text-secondary group-hover:text-primary transition-colors flex items-center gap-2">
                    DEPLOY <span className="material-symbols-outlined text-[10px]">arrow_forward_ios</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Local User Circuits */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="material-symbols-outlined text-secondary">save</span>
            <h2 className="text-xl font-space font-bold uppercase tracking-widest">Saved Configurations</h2>
          </div>

          {savedCircuits.length === 0 ? (
            <div className="w-full py-20 bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4">folder_open</span>
              <p className="text-on-surface-variant/50 font-space tracking-widest uppercase text-sm">No saved environments found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCircuits.map((saved: SavedCircuit) => (
                <div key={saved.id} className="relative group bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all">
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-space font-bold text-on-surface">{saved.name}</h3>
                      <p className="text-[10px] text-on-surface-variant/40 font-mono mt-1">
                        {new Date(saved.timestamp).toLocaleString()}
                      </p>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteSavedCircuit(saved.id); }}
                      className="text-error/60 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-error/10"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  
                  <div className="bg-[#0b0c11] rounded-lg p-4 mb-6 border border-outline-variant/10">
                    <p className="text-xs text-on-surface-variant font-mono">
                      Q0: {saved.wireMap.q0.length} Gates<br/>
                      Q1: {saved.wireMap.q1.length} Gates<br/>
                      Q2: {saved.wireMap.q2.length} Gates
                    </p>
                  </div>

                  <button 
                    onClick={() => handleApplyCircuit(saved.wireMap)}
                    className="w-full bg-surface-container-highest hover:bg-secondary/20 text-on-surface border border-outline-variant/30 hover:border-secondary/50 hover:text-secondary rounded-lg py-3 font-space text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(223,183,255,0)] hover:shadow-[0_0_15px_rgba(223,183,255,0.2)]"
                  >
                    Load Circuit
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
