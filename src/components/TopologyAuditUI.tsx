import { useState, useMemo } from 'react';
import { buildTopologyLibrary } from '../engine/PermutationGenerator';

export function TopologyAuditUI() {
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(8);
  const [trigger, setTrigger] = useState(0);

  // Re-run the exhaustive sweep if dimensions change or the user forces a refresh
  const report = useMemo(() => {
    return buildTopologyLibrary(rows, cols, true); // true = force bypass cache for accurate time
  }, [rows, cols, trigger]);

  const { library, timeMs, collisions } = report;

  const adj = library.ADJACENT.length;
  const vert = library.VERTICAL.length;
  const left = library.LEFT_OF.length;
  const seq = library.SEQUENCE_THREE.length;
  const gpe = library.GAPPED_EXCLUSION.length;
  const total = adj + vert + left + seq + gpe;

  // Gapped Span Mathematical Integrity Check
  // Formula: For every possible column span of exactly 2, all 3 coordinate row slots (rA, rB, rC) are fully independent.
  const expectedGpe = Math.max(0, cols - 2) * Math.pow(rows, 3);
  const gpeRatioPass = expectedGpe === gpe;
  const collisionPass = collisions === 0;

  return (
    <section className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm lg:col-span-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold flex items-center gap-3 text-orange-400">
          <span className="material-icons">grid_on</span>
          Phase 3.1.5: Topology Library Audit
        </h2>

        {/* Controls */}
        <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-slate-500 font-bold uppercase">Grid:</span>
            <select 
              value={`${rows}x${cols}`}
              onChange={(e) => {
                const [r, c] = e.target.value.split('x').map(Number);
                setRows(r);
                setCols(c);
              }}
              className="bg-slate-900 border border-slate-700 text-sm rounded px-2 py-1 text-slate-300 outline-none focus:border-blue-500"
            >
              <option value="4x4">4x4 Standard</option>
              <option value="6x6">6x6 Expanded</option>
              <option value="8x8">8x8 Extreme</option>
              <option value="4x6">4x6 Wide</option>
              <option value="1x8">1x8 Single-Row</option>
            </select>
          </div>
          <button 
            onClick={() => setTrigger(t => t + 1)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded uppercase font-bold transition-colors"
          >
            Re-Generate
          </button>
        </div>
      </div>
      
      {/* Top Level Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
           <span className="text-[10px] text-slate-500 uppercase block mb-1">Grid Stats</span>
           <code className="text-lg font-bold text-slate-300">{rows}x{cols} | {rows * cols} Slots</code>
        </div>
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
           <span className="text-[10px] text-slate-500 uppercase block mb-1">Manifest Density</span>
           <code className="text-lg font-black text-orange-400">{total}</code>
        </div>
        
        {/* Integrity 1: Collisions */}
        <div className={`p-4 rounded-2xl border ${collisionPass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
           <span className="text-[10px] text-slate-500 uppercase block mb-1">Collision Check</span>
           <code className={`text-lg font-bold ${collisionPass ? 'text-emerald-400' : 'text-red-400'}`}>
             {collisions} DUP
           </code>
        </div>

        {/* Integrity 2: Math Checks */}
        <div className={`p-4 rounded-2xl border ${gpeRatioPass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
           <span className="text-[10px] text-slate-500 uppercase block mb-1">Gapped Ratio Check</span>
           <code className={`text-lg font-bold ${gpeRatioPass ? 'text-emerald-400' : 'text-red-400'}`}>
             {gpeRatioPass ? 'PASSED' : `${gpe} != ${expectedGpe}`}
           </code>
        </div>
      </div>

      {/* Library Breakdown */}
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
        <span className="text-[10px] text-slate-500 uppercase block mb-3 font-bold border-b border-slate-800 pb-2">The Library Index (By Type)</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">Adjacent</span>
            <code className="text-md font-bold text-slate-300">{adj}</code>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">Vertical</span>
            <code className="text-md font-bold text-slate-300">{vert}</code>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">Left Of</span>
            <code className="text-md font-bold text-slate-300">{left}</code>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">Sequence (3)</span>
            <code className="text-md font-bold text-slate-300">{seq}</code>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">Gapped Excl.</span>
            <code className="text-md font-bold text-slate-300">{gpe}</code>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 mt-6">
        <span>EXHAUSTIVE SWEEP TIME: <span className="text-orange-400">{timeMs.toFixed(2)}ms</span></span>
        <span>STATUS: {collisionPass && gpeRatioPass ? <span className="text-emerald-400">MATH INTEGRITY VERIFIED</span> : <span className="text-red-400">INTEGRITY FAILURE</span>}</span>
      </div>
    </section>
  );
}
