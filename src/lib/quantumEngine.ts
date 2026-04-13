export type Complex = { r: number; i: number };

const add = (a: Complex, b: Complex): Complex => ({ r: a.r + b.r, i: a.i + b.i });
const sub = (a: Complex, b: Complex): Complex => ({ r: a.r - b.r, i: a.i - b.i });
const mul = (a: Complex, b: Complex): Complex => ({
  r: a.r * b.r - a.i * b.i,
  i: a.r * b.i + a.i * b.r
});
const abs2 = (c: Complex): number => c.r * c.r + c.i * c.i;

export type StateVector = [Complex, Complex, Complex, Complex, Complex, Complex, Complex, Complex];

export const getInitialState = (): StateVector => [
  { r: 1, i: 0 }, { r: 0, i: 0 }, { r: 0, i: 0 }, { r: 0, i: 0 },
  { r: 0, i: 0 }, { r: 0, i: 0 }, { r: 0, i: 0 }, { r: 0, i: 0 }
];

const I = [[ {r:1, i:0}, {r:0, i:0} ], [ {r:0, i:0}, {r:1, i:0} ]];
const X = [[ {r:0, i:0}, {r:1, i:0} ], [ {r:1, i:0}, {r:0, i:0} ]];
const Y = [[ {r:0, i:0}, {r:0, i:-1} ], [ {r:0, i:1}, {r:0, i:0} ]];
const Z = [[ {r:1, i:0}, {r:0, i:0} ], [ {r:0, i:0}, {r:-1, i:0} ]];
const H = [
  [ {r: 1/Math.SQRT2, i:0}, {r: 1/Math.SQRT2, i:0} ],
  [ {r: 1/Math.SQRT2, i:0}, {r: -1/Math.SQRT2, i:0} ]
];

const getGateMatrix = (gateId: string) => {
  switch (gateId) {
    case 'pauli-x': return X;
    case 'pauli-y': return Y;
    case 'pauli-z': return Z;
    case 'hadamard': return H;
    default: return I;
  }
};

export const applyGate = (state: StateVector, gateId: string, targetQubit: number): StateVector => {
  if (gateId === 'cnot') return state; // Handle CNOT separately
  if (gateId === 'measure') return state; // Measure collapses/handles differently
  
  const U = getGateMatrix(gateId);
  const nextState: StateVector = getInitialState();
  
  for (let i = 0; i < 8; i++) {
    nextState[i] = {r:0, i:0};
    for (let j = 0; j < 8; j++) {
      // Check if j differs from i only at targetQubit
      let differsAtOther = false;
      for (let q = 0; q < 3; q++) {
        if (q !== targetQubit) {
          const bitI = (i >> (2 - q)) & 1;
          const bitJ = (j >> (2 - q)) & 1;
          if (bitI !== bitJ) differsAtOther = true;
        }
      }
      if (!differsAtOther) {
        const row = (i >> (2 - targetQubit)) & 1;
        const col = (j >> (2 - targetQubit)) & 1;
        nextState[i] = add(nextState[i], mul(U[row][col], state[j]));
      }
    }
  }
  return nextState;
};

export const applyCnot = (state: StateVector, control: number, target: number): StateVector => {
  const nextState: StateVector = [...state] as StateVector;
  for (let i = 0; i < 8; i++) {
    const cBit = (i >> (2 - control)) & 1;
    if (cBit === 1) {
      const tBit = (i >> (2 - target)) & 1;
      const j = i ^ (1 << (2 - target));
      if (tBit === 0) {
        const temp = nextState[i];
        nextState[i] = nextState[j];
        nextState[j] = temp;
      }
    }
  }
  return nextState;
};

// Calculate Bloch vector (x,y,z) for a specific qubit by tracing out others
export const getBlochVector = (state: StateVector, q: number): {x:number, y:number, z:number} => {
  const mask = 1 << (2-q);
  
  // Partial trace to get reduced density matrix 2x2
  let rho00: Complex = {r:0, i:0};
  let rho11: Complex = {r:0, i:0};
  let rho01: Complex = {r:0, i:0};
  let rho10: Complex = {r:0, i:0};
  
  for (let i=0; i<8; i++) {
    const qBit = (i & mask) ? 1 : 0;
    const baseStr = i & (~mask); // Same other bits
    const amp = state[i];
    
    if (qBit === 0) {
      const amp1 = state[baseStr | mask];
      rho00 = add(rho00, {r: abs2(amp), i: 0});
      rho01 = add(rho01, mul(amp, {r: amp1.r, i: -amp1.i}));
    } else {
      const amp0 = state[baseStr];
      rho11 = add(rho11, {r: abs2(amp), i: 0});
      rho10 = add(rho10, mul(amp, {r: amp0.r, i: -amp0.i}));
    }
  }
  
  // Tr(rho * X), Tr(rho * Y), Tr(rho * Z)
  // X = [0 1; 1 0] -> rho01 + rho10
  // Y = [0 -i; i 0] -> -i*rho01 + i*rho10 = i*(rho10 - rho01)
  // Z = [1 0; 0 -1] -> rho00 - rho11
  
  const x = add(rho01, rho10).r;
  const y = add( mul({r:0,i:-1}, rho01), mul({r:0,i:1}, rho10) ).r;
  const z = sub(rho00, rho11).r;
  
  return {x, y, z};
};

export const getProbabilities = (state: StateVector): number[] => {
  return state.map(c => abs2(c));
};
