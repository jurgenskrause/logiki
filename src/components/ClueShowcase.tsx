import { getFallbackEmoji } from '../utils/themeRegistry';

/**
 * Phase 3.2.4: Clue Typography & Symbology
 * A visualization showcase for all topological clue types.
 */
export function ClueShowcase() {
  const itemA = getFallbackEmoji(2, 0); // Pet 0 (Dog)
  const itemB = getFallbackEmoji(1, 0); // House 0 (House)
  const itemC = getFallbackEmoji(5, 0); // Number 0 (1)

  const ClueBox = ({ title, tooltip, children }: { title: string, tooltip: string, children: React.ReactNode }) => (
    <div 
      className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-between gap-3 group relative cursor-help hover:border-blue-500 transition-colors"
      title={tooltip}
    >
      <span className="text-[10px] font-bold text-slate-500 uppercase text-center">{title}</span>
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>
      {/* Custom Tooltip on Hover */}
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-600 text-slate-200 text-xs p-2 rounded shadow-xl -top-12 left-1/2 -translate-x-1/2 w-48 text-center pointer-events-none z-10">
        {tooltip}
      </div>
    </div>
  );

  return (
    <div className="mt-8 pt-8 border-t border-slate-800">
      <h3 className="text-lg font-bold flex items-center gap-3 text-yellow-400 mb-6">
        <span className="material-icons">visibility</span>
        Phase 3.2.4: Clue Symbology (Visual Representation)
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        
        {/* 1. ADJACENT */}
        <ClueBox 
          title="Adjacent" 
          tooltip="Adjacent: These two items must be exactly one column apart, in either order."
        >
          <div className="flex items-center gap-1 text-2xl relative">
            <span>{itemA}</span>
            <span className="material-icons text-slate-600 text-[16px]">sync_alt</span>
            <span>{itemB}</span>
          </div>
        </ClueBox>

        {/* 2. LEFT_OF */}
        <ClueBox 
          title="Left Of" 
          tooltip="Left Of: The first item must be immediately to the left of the second item."
        >
          <div className="flex items-center gap-1 text-2xl relative">
            <span>{itemA}</span>
            <span className="material-icons text-slate-600 text-[16px]">arrow_right_alt</span>
            <span>{itemB}</span>
          </div>
        </ClueBox>

        {/* 3. VERTICAL */}
        <ClueBox 
          title="Vertical Pair" 
          tooltip="Vertical Pair: These two items must be in the exact same column."
        >
          <div className="flex flex-col items-center border-x-2 border-slate-700 px-2 text-2xl">
            <span>{itemA}</span>
            <span className="material-icons text-slate-600 text-[16px] my-1">link</span>
            <span>{itemB}</span>
          </div>
        </ClueBox>

        {/* 4. VERTICAL_NOT */}
        <ClueBox 
          title="Vertical Not" 
          tooltip="Vertical Not: These two items cannot be in the same column."
        >
          <div className="flex flex-col items-center border-x-2 border-slate-700 border-dashed px-2 text-2xl relative">
            <span>{itemA}</span>
            <span>{itemB}</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-icons text-red-500/80 text-[48px]">block</span>
            </div>
          </div>
        </ClueBox>

        {/* 5. VERTICAL_TRIO */}
        <ClueBox 
          title="Vertical Trio" 
          tooltip="Vertical Trio: These three items must all be in the same column."
        >
          <div className="flex flex-col items-center border-x-2 border-purple-900/50 bg-purple-900/10 rounded px-2 text-2xl">
            <span>{itemA}</span>
            <span>{itemB}</span>
            <span>{itemC}</span>
          </div>
        </ClueBox>

        {/* 6. SEQUENCE_THREE */}
        <ClueBox 
          title="Sequence 3" 
          tooltip="Sequence Three: These three items must be in adjacent columns in this exact order, or reversed."
        >
          <div className="flex items-center gap-0.5 text-2xl">
            <span>{itemA}</span>
            <span className="material-icons text-slate-600 text-[12px]">sync_alt</span>
            <span>{itemB}</span>
            <span className="material-icons text-slate-600 text-[12px]">sync_alt</span>
            <span>{itemC}</span>
          </div>
        </ClueBox>

        {/* 7. GAPPED_EXCLUSION */}
        <ClueBox 
          title="Gapped Excl." 
          tooltip="Gapped Exclusion: The outer items are separated by one column. The middle item cannot be the one shown."
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

        {/* 8. VERTICAL_DISJUNCTIVE_EXCLUSION */}
        <ClueBox 
          title="Vert. Disj." 
          tooltip="Disjunctive XOR: The top item must share a column with EXACTLY ONE of the bottom two items."
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
    </div>
  );
}
