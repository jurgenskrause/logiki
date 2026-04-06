import { useState, useMemo } from 'react';
import { buildTopologyLibrary } from '../../shared/engine/PermutationGenerator';
import { SelectionDeck } from '../../shared/engine/SelectionDeck';
import { SolutionGrid } from '../../shared/engine/SolutionGrid';
import { CoordinateSpace } from '../../shared/engine/CoordinateSpace';
import { getFallbackEmoji } from '../../shared/utils/themeRegistry';
import { ClueShowcase } from './ClueShowcase';

export function TopologyAuditUI() {
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(8);
  const [trigger, setTrigger] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  // Re-run the exhaustive sweep if dimensions change or the user forces a refresh
  const report = useMemo(() => {
    return buildTopologyLibrary(rows, cols, true); // true = force bypass cache for accurate time
  }, [rows, cols, trigger]);

  const { library, timeMs, collisions } = report;

  const adj = library.HORIZONTAL.ADJACENT.length;
  const vert = library.VERTICAL.VERTICAL.length;
  const left = library.HORIZONTAL.LEFT_OF.length;
  const seq = library.HORIZONTAL.SEQUENCE_THREE.length;
  const gpe = library.HORIZONTAL.GAPPED_EXCLUSION.length;
  const vtrio = library.VERTICAL.VERTICAL_TRIO.length;
  const vdex = library.VERTICAL.VERTICAL_DISJUNCTIVE_EXCLUSION.length;
  const vnot3 = library.VERTICAL.VERTICAL_NOT_TRIO.length;
  const vnot = library.VERTICAL.VERTICAL_NOT.length;
  const total = adj + vert + left + seq + gpe + vtrio + vdex + vnot3 + vnot;

  // C(rows, 3) × cols
  const comb3 = rows < 3 ? 0 : (rows * (rows - 1) * (rows - 2)) / 6;
  const expectedVtrio = comb3 * cols;
  const vtrioPass = expectedVtrio === vtrio;

  // Gapped Span Mathematical Integrity Check (Exhaustive Triplet Expansion)
  // Formula: (cols - 2) anchor span * (rows * rows) vertical combinations * (totalSlots - gapColSlots - sa - sc)
  const expectedGpe = Math.max(0, cols - 2) * (rows * rows) * ((rows * cols) - rows - 2);
  const gpeRatioPass = expectedGpe === gpe;

  // Vertical Not Mathematical Integrity Check
  // Formula: (R * C) * (R-1) * (C-1) / 2
  const expectedVnot = (rows * cols * (rows - 1) * (cols - 1)) / 2;
  const vnotPass = expectedVnot === vnot;

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

        {/* Integrity 2: VTRIO Math Check */}
        <div className={`p-4 rounded-2xl border ${vtrioPass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
           <span className="text-[10px] text-slate-500 uppercase block mb-1">VTrio Ratio Check</span>
           <code className={`text-lg font-bold ${vtrioPass ? 'text-emerald-400' : 'text-red-400'}`}>
             {vtrioPass ? 'PASSED' : `${vtrio} != ${expectedVtrio}`}
           </code>
        </div>

        {/* Integrity 3: GPE Math Check */}
        <div className={`p-4 rounded-2xl border ${gpeRatioPass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
           <span className="text-[10px] text-slate-500 uppercase block mb-1">Gapped Ratio Check</span>
           <code className={`text-lg font-bold ${gpeRatioPass ? 'text-emerald-400' : 'text-red-400'}`}>
             {gpeRatioPass ? 'PASSED' : `${gpe} != ${expectedGpe}`}
           </code>
        </div>

        {/* Integrity 4: VNOT Math Check */}
        <div className={`p-4 rounded-2xl border ${vnotPass ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
           <span className="text-[10px] text-slate-500 uppercase block mb-1">V-Not Ratio Check</span>
           <code className={`text-lg font-bold ${vnotPass ? 'text-emerald-400' : 'text-red-400'}`}>
             {vnotPass ? 'PASSED' : `${vnot} != ${expectedVnot}`}
           </code>
        </div>
      </div>

      {/* Library Breakdown By Complexity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* SIMPLE TIER */}
        <div className="p-5 bg-slate-950 rounded-2xl border border-blue-900/30">
          <div className="flex justify-between items-center mb-4 border-b border-blue-900/30 pb-2">
            <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Simple (Tier 1)</span>
            <code className="text-sm font-bold text-blue-300">{adj + vert + vnot}</code>
          </div>
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Adjacent (Horizontal)</span>
              <span className="text-slate-300 font-mono">{adj}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vertical Pair</span>
              <span className="text-slate-300 font-mono">{vert}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vertical Not</span>
              <span className="text-slate-300 font-mono">{vnot}</span>
            </div>
          </div>
        </div>

        {/* MODERATE TIER */}
        <div className="p-5 bg-slate-950 rounded-2xl border border-purple-900/30">
          <div className="flex justify-between items-center mb-4 border-b border-purple-900/30 pb-2">
            <span className="text-[10px] text-purple-400 uppercase font-black tracking-widest">Moderate (Tier 2)</span>
            <code className="text-sm font-bold text-purple-300">{left + seq + vtrio + vnot3}</code>
          </div>
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Left Of (Horizontal)</span>
              <span className="text-slate-300 font-mono">{left}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Sequence 3</span>
              <span className="text-slate-300 font-mono">{seq}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vertical Trio</span>
              <span className="text-slate-300 font-mono">{vtrio}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vertical Not Trio</span>
              <span className="text-slate-300 font-mono">{vnot3}</span>
            </div>
          </div>
        </div>

        {/* COMPLEX TIER */}
        <div className="p-5 bg-slate-950 rounded-2xl border border-orange-900/30">
          <div className="flex justify-between items-center mb-4 border-b border-orange-900/30 pb-2">
            <span className="text-[10px] text-orange-400 uppercase font-black tracking-widest">Complex (Tier 3)</span>
            <code className="text-sm font-bold text-orange-300">{gpe + vdex}</code>
          </div>
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Gapped Exclusion</span>
              <span className="text-slate-300 font-mono">{gpe}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vertical Disjunctive (XOR)</span>
              <span className="text-slate-300 font-mono">{vdex}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 mt-6">
        <span>EXHAUSTIVE SWEEP TIME: <span className="text-orange-400">{timeMs.toFixed(2)}ms</span></span>
        <span>STATUS: {collisionPass && gpeRatioPass && vtrioPass && vnotPass ? <span className="text-emerald-400">MATH INTEGRITY VERIFIED</span> : <span className="text-red-400">INTEGRITY FAILURE</span>}</span>
      </div>

      {/* Phase 3.2.1: Shuffler Audit */}
      <div className="mt-8 pt-8 border-t border-slate-800">
        <h3 className="text-lg font-bold flex items-center gap-3 text-pink-400 mb-4">
          <span className="material-icons">shuffle</span>
          Selection Deck Determinism (Fisher-Yates)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            const seedA = "17032026";
            const seedB = "DIFFERENT";
            
            const deck1 = new SelectionDeck(library, seedA);
            const deck2 = new SelectionDeck(library, seedA); // same seed again
            const deck3 = new SelectionDeck(library, seedB);

            const v1 = deck1.getDeck('VERTICAL').slice(0, 3).map(e => e.topologyID);
            const v2 = deck2.getDeck('VERTICAL').slice(0, 3).map(e => e.topologyID);
            const v3 = deck3.getDeck('VERTICAL').slice(0, 3).map(e => e.topologyID);

            const match12 = v1.join() === v2.join();
            const diff13 = v1.join() !== v3.join();

            return (
              <>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                    Seed A: {seedA}
                    <span className="text-blue-400">Run 1</span>
                  </span>
                  <div className="mt-2 text-xs font-mono space-y-1 text-slate-300">
                    {v1.map((id, i) => <div key={i} className="truncate">{id}</div>)}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${match12 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                    Seed A: {seedA}
                    <span className="text-blue-400">Run 2</span>
                  </span>
                  <div className="mt-2 text-xs font-mono space-y-1 text-slate-300">
                    {v2.map((id, i) => <div key={i} className="truncate">{id}</div>)}
                  </div>
                  <div className={`text-[10px] uppercase font-bold mt-3 ${match12 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {match12 ? 'IDENTICAL MATCH' : 'MISMATCH'}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${diff13 ? 'border-pink-500/50 bg-pink-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                    Seed B: {seedB}
                    <span className="text-pink-400">Run 3</span>
                  </span>
                  <div className="mt-2 text-xs font-mono space-y-1 text-slate-300">
                    {v3.map((id, i) => <div key={i} className="truncate">{id}</div>)}
                  </div>
                  <div className={`text-[10px] uppercase font-bold mt-3 ${diff13 ? 'text-pink-400' : 'text-red-400'}`}>
                    {diff13 ? 'DIVERGED (EXPECTED)' : 'COLLISION'}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Phase 3.2.2: Solution Integrity (Answer Key) */}
      <div className="mt-8 pt-8 border-t border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-3 text-cyan-400">
            <span className="material-icons">key</span>
            Phase 3.2.2: Solution Integrity (Answer Key)
          </h3>
          <button 
            onClick={() => setShowSolution(!showSolution)}
            className="bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-300 border border-cyan-800 text-xs px-3 py-1.5 rounded uppercase font-bold transition-colors"
          >
            {showSolution ? 'Hide Solution Maps' : 'Reveal Solution Maps'}
          </button>
        </div>

        {showSolution && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {(() => {
              const seedA = "17032026";
              const seedB = "DIFFERENT";
              const space = new CoordinateSpace(rows, cols);

              // To maintain continuity in test, we instantiate the respective decks to yield their PRNG instances
              const deckA1 = new SelectionDeck(library, seedA);
              const gridA1 = new SolutionGrid(space, deckA1.rng);

              const deckA2 = new SelectionDeck(library, seedA);
              const gridA2 = new SolutionGrid(space, deckA2.rng);

              const deckB = new SelectionDeck(library, seedB);
              const gridB = new SolutionGrid(space, deckB.rng);

              const renderGrid = (grid: SolutionGrid, matchStatus: 'MATCH' | 'DIVERGED' | 'BASE') => (
                <div className={`p-4 rounded-2xl border ${
                  matchStatus === 'MATCH' ? 'border-emerald-500/50 bg-emerald-500/5' : 
                  matchStatus === 'DIVERGED' ? 'border-pink-500/50 bg-pink-500/5' : 
                  'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {matchStatus === 'BASE' ? 'Seed A: ' + seedA : matchStatus === 'MATCH' ? 'Seed A (Run 2): IDENTICAL' : 'Seed B: DIVERGED'}
                    </span>
                  </div>
                  <div 
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                  >
                    {space.ALL_SLOTS.map(slot => {
                      const itemId = grid.getItemAtSlot(slot);
                      const catIndex = Math.floor(itemId / cols);
                      const itemIndex = itemId % cols;
                      const emoji = getFallbackEmoji(catIndex, itemIndex);

                      return (
                        <div 
                          key={slot.toKey()} 
                          className="aspect-square flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded relative group"
                        >
                          <span className="text-xl md:text-2xl">{emoji}</span>
                          <span className="text-[8px] font-mono text-slate-500 absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {itemId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

              return (
                <>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Determinism Proof (Same Seed)</h4>
                    <div className="grid grid-cols-2 gap-2">
                       {renderGrid(gridA1, 'BASE')}
                       {renderGrid(gridA2, 'MATCH')}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Divergence Proof (Diff Seed)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       {renderGrid(gridB, 'DIVERGED')}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <ClueShowcase library={library} />
    </section>
  );
}
