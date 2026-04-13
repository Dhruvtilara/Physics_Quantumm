import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary-container/30 flex flex-col items-center justify-center p-8">
      
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="z-10 w-full max-w-4xl bg-[#0d1f35] border border-[#1a3a5c] rounded-3xl p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black font-space text-[#00d4ff] tracking-tighter drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]">
            ABOUT THE PROJECT
          </h1>
          <Link href="/">
            <button className="text-secondary hover:text-[#dfb7ff] bg-secondary/10 hover:bg-secondary/20 transition-all font-space tracking-widest uppercase text-xs px-6 py-3 rounded-full border border-secondary/30 flex items-center gap-2 group">
              <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Return to Sandbox
            </button>
          </Link>
        </div>

        <div className="space-y-10">
          <div className="bg-[#0d1f35]/90 p-8 rounded-2xl border border-[#1a3a5c]/40 relative overflow-hidden group hover:border-[#00d4ff]/30 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00d4ff] to-[#7c3aed]"></div>
            <h2 className="text-sm font-space text-[#00d4ff] uppercase tracking-[0.3em] mb-4">Physics Project By</h2>
            <div className="flex flex-col md:flex-row gap-6 md:gap-16">
              <div>
                <p className="text-2xl font-bold text-[#e2e8f0]">Dhruv</p>
                <p className="text-sm font-mono text-[#64748b]">25BPS1044</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#e2e8f0]">Rahul</p>
                <p className="text-sm font-mono text-[#64748b]">25BPS1061</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-[#64748b] leading-relaxed font-light">
            <h3 className="text-xl font-space font-bold text-[#e2e8f0]">Quantum Circuit Sandbox</h3>
            <p>
              This interactive platform is designed to visualize and simulate basic quantum computing principles in real-time. 
              By utilizing a drag-and-drop interface, users can construct theoretical quantum instruction layouts and observe
              the deterministic mathematical probabilities rendered live onto a dynamic 3D Bloch Sphere.
            </p>
            <p>
              The simulation mathematically scales theoretical operations such as the Pauli-X, Y, Z, and Hadamard transformations,
              providing intuitive insight into high-level quantum mechanical states directly within the browser ecosystem.
            </p>
            <div className="pt-6 mt-6 border-t border-outline-variant/10">
               <p className="text-[10px] font-mono text-primary/50 uppercase tracking-widest text-center">
                 Developed for Physics Curriculum • 2026
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
