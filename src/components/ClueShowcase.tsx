import { getFallbackEmoji } from '../utils/themeRegistry';
import type { TopologyLibrary } from '../engine/PermutationGenerator';

/**
 * Phase 3.2.4: Clue Typography & Symbology
 * A visualization showcase for all topological clue types, grouped by category.
 */
export function ClueShowcase({ library }: { library?: TopologyLibrary }) {
  const itemA = getFallbackEmoji(2, 0); // Dog
  const itemB = getFallbackEmoji(1, 0); // House
  const itemC = getFallbackEmoji(5, 0); // Number 1

  const ClueBox = ({ title, tooltip, count, children }: { 
    title: string, 
    tooltip: string, 
    count?: number,
    children: React.ReactNode 
  }) => (
    <div 
      className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-between gap-3 group relative cursor-help hover:border-blue-500 transition-colors"
      title={tooltip}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase text-center">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-mono font-bold text-orange-500 bg-orange-500/10 px-1.5 rounded-full">{count}</span>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-600 text-slate-200 text-xs p-2 rounded shadow-xl -top-12 left-1/2 -translate-x-1/2 w-48 text-center pointer-events-none z-10">
        {tooltip}
      </div>
    </div>
  );

  return (
    <div className="mt-8 pt-8 border-t border-slate-800 space-y-10">
      
      {/* --- SIMPLE CLUES (TIER 1) --- */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-bold text-blue-400">Simple Clues (Tier 1)</h3>
            <div className="flex-1 h-px bg-blue-900/30"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <ClueBox 
            title="Adjacent" 
            tooltip="Adjacent: Items are one column apart, in either order."
            count={library?.HORIZONTAL.ADJACENT.length}
          >
            <div className="flex items-center gap-1 text-2xl relative">
              <span>{itemA}</span>
              <span className="material-icons text-slate-600 text-[16px]">sync_alt</span>
              <span>{itemB}</span>
            </div>
          </ClueBox>

          <ClueBox 
            title="Vertical Pair" 
            tooltip="Vertical Pair: Two items must be in the same column."
            count={library?.VERTICAL.VERTICAL.length}
          >
            <div className="flex flex-col items-center border-x-2 border-slate-700 px-2 text-2xl">
              <span>{itemA}</span>
              <span className="material-icons text-slate-600 text-[16px] my-1">link</span>
              <span>{itemB}</span>
            </div>
          </ClueBox>

          <ClueBox 
            title="Vertical Not" 
            tooltip="Vertical Not: Items cannot be in the same column."
            count={library?.VERTICAL.VERTICAL_NOT.length}
          >
            <div className="flex flex-col items-center border-x-2 border-slate-700 border-dashed px-2 text-2xl relative">
              <span>{itemA}</span>
              <span>{itemB}</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-icons text-red-500/80 text-[48px]">block</span>
              </div>
            </div>
          </ClueBox>
        </div>
      </section>

      {/* --- MODERATE CLUES (TIER 2) --- */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-bold text-purple-400">Moderate Clues (Tier 2)</h3>
            <div className="flex-1 h-px bg-purple-900/30"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <ClueBox 
            title="Left Of" 
            tooltip="Left Of: Item A is immediately left of Item B."
            count={library?.HORIZONTAL.LEFT_OF.length}
          >
            <div className="flex items-center gap-1 text-2xl relative">
              <span>{itemA}</span>
              <span className="material-icons text-slate-600 text-[16px]">arrow_right_alt</span>
              <span>{itemB}</span>
            </div>
          </ClueBox>

          <ClueBox 
            title="Sequence 3" 
            tooltip="Sequence Three: Items in adjacent columns (A-B-C or C-B-A)."
            count={library?.HORIZONTAL.SEQUENCE_THREE.length}
          >
            <div className="flex items-center gap-0.5 text-2xl">
              <span>{itemA}</span>
              <span className="material-icons text-slate-600 text-[12px]">sync_alt</span>
              <span>{itemB}</span>
              <span className="material-icons text-slate-600 text-[12px]">sync_alt</span>
              <span>{itemC}</span>
            </div>
          </ClueBox>

          <ClueBox 
            title="Vertical Trio" 
            tooltip="Vertical Trio: Three items must all be in the same column."
            count={library?.VERTICAL.VERTICAL_TRIO.length}
          >
            <div className="flex flex-col items-center border-x-2 border-purple-900/50 bg-purple-900/10 rounded px-2 text-2xl">
              <span>{itemA}</span>
              <span>{itemB}</span>
              <span>{itemC}</span>
            </div>
          </ClueBox>

          <ClueBox 
            title="V-Not Trio" 
            tooltip="V-Not Trio: A and B share a column; C is not in that column."
            count={library?.VERTICAL.VERTICAL_NOT_TRIO.length}
          >
            <div className="flex items-center gap-3">
               <div className="flex flex-col items-center border-x-2 border-slate-700 px-2 text-2xl">
                  <span>{itemA}</span>
                  <span>{itemB}</span>
               </div>
               <div className="relative flex items-center justify-center grayscale opacity-50 text-2xl">
                  <span>{itemC}</span>
                  <span className="material-icons text-red-500/80 absolute text-[32px]">block</span>
               </div>
            </div>
          </ClueBox>
        </div>
      </section>

      {/* --- COMPLEX CLUES (TIER 3) --- */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-bold text-orange-400">Complex Clues (Tier 3)</h3>
            <div className="flex-1 h-px bg-orange-900/30"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <ClueBox 
            title="Gapped Excl." 
            tooltip="Gapped Exclusion: A and C are separated by a column where B is forbidden."
            count={library?.HORIZONTAL.GAPPED_EXCLUSION.length}
          >
            <div className="flex items-center gap-1 text-2xl">
              <span>{itemA}</span>
              <div className="relative flex items-center justify-center grayscale opacity-50">
                <span>{itemB}</span>
                <span className="material-icons text-red-500/80 absolute text-[32px]">block</span>
              </div>
              <span>{itemC}</span>
            </div>
          </ClueBox>

          <ClueBox 
            title="Vert. Disj." 
            tooltip="Disjunctive XOR: A matches either B or C, but not both."
            count={library?.VERTICAL.VERTICAL_DISJUNCTIVE_EXCLUSION.length}
          >
            <div className="flex flex-col items-center gap-1 text-2xl border-x-2 border-purple-900/50 px-2 rounded">
              <span>{itemA}</span>
              <div className="flex items-center gap-1 relative">
                  <span className="text-[10px] absolute -top-3 left-1/2 -translate-x-1/2 text-slate-500 font-bold bg-slate-900 px-1 border border-slate-700 rounded-full">XOR</span>
                  <span>{itemB}</span>
                  <span className="material-icons text-slate-600 text-[16px]">call_split</span>
                  <span>{itemC}</span>
              </div>
            </div>
          </ClueBox>
        </div>
      </section>

    </div>
  );
}


