import { useState, useRef, useEffect } from 'react';
import { TieringService } from '../../shared/engine/TieringService';
import { StructuralSieve, ContradictionError, type GenerationTelemetry } from '../../shared/engine/StructuralSieve';
import { buildTopologyLibrary, getWeight, type TopologyEntry } from '../../shared/engine/PermutationGenerator';
import { LogicCanvas } from '../../shared/engine/LogicCanvas';
import { getFallbackEmoji } from '../../shared/utils/themeRegistry';
import { SolutionGrid } from '../../shared/engine/SolutionGrid';
import { Slot } from '../../shared/engine/CoordinateSpace';

/** A structured log event: the text message plus the optional accepted clue. */
type LogEvent = { msg: string; entry?: TopologyEntry; isContradiction?: boolean; deadCells?: { row: number; col: number }[] };

const isExcluded = (type: string, idx: number): boolean => {
  if (type === 'NEGATIVE_ANCHOR') return true;
  if (type === 'VERTICAL_NOT' || type === 'VERTICAL_NOT_TRIO') {
      return idx === 2 || (type === 'VERTICAL_NOT' && idx === 1);
  }
  if (type === 'GAPPED_EXCLUSION') return idx === 2;
  return false;
};

const getClueText = (entry: TopologyEntry): string => {
  const coords = entry.slots.map(s => `(${s.r}, ${s.c})`);
  const typeLabel = entry.type.toLowerCase().replace(/_/g, '_');
  
  if (entry.slots.length === 2) {
    return `${coords[0]} ${typeLabel} ${coords[1]}`;
  }
  if (entry.slots.length === 3) {
    if (entry.type.includes('SEQ') || entry.type.includes('TRIO')) {
      return `${coords[0]}, ${coords[1]}, ${coords[2]} ${typeLabel}`;
    }
    return `${coords[0]}, ${coords[1]} ${typeLabel} ${coords[2]}`;
  }
  
  return `${entry.type} ${coords.join(' ')}`;
};

/** Resolve the emoji for a clue slot using the active solution mapping. */
const resolveSlotEmoji = (slot: Slot, solution: SolutionGrid | null): string => {
  if (!solution) return getFallbackEmoji(slot.r, slot.c);
  try {
    return getFallbackEmoji(slot.r, solution.getItemIndexAtSlot(slot));
  } catch {
    return getFallbackEmoji(slot.r, slot.c);
  }
};

export function StructuralSandboxUI() {
  const [N, setN] = useState(4);
  const [M, setM] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [stats, setStats] = useState({ simple: 0, moderate: 0, complex: 0 });
  
  const [masks, setMasks] = useState<number[]>([]);
  const [prevMasks, setPrevMasks] = useState<number[]>([]);
  
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(null);
  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [delay, setDelay] = useState(50);
  
  const stepResolverRef = useRef<(() => void) | null>(null);
  const isSteppingRef = useRef(false);
  /** Holds the active SolutionGrid so clue slots can be resolved during streaming. */
  const solutionRef = useRef<SolutionGrid | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const generate = async () => {
    setIsGenerating(true);
    setEvents([]);
    setTelemetry(null);
    solutionRef.current = null;
    
    const initialMask = (1 << M) - 1;
    setMasks(new Array(N * M).fill(initialMask));
    setPrevMasks(new Array(N * M).fill(initialMask));

    try {
      const tStart = performance.now();
      const report = buildTopologyLibrary(N, M);
      const tiering = new TieringService(report.library);
      tiering.shuffle();
      const manifestTime = performance.now() - tStart;

      setEvents([
        { msg: 'Initializing Topological Manifest...' },
        { msg: `Manifest completed in ${manifestTime.toFixed(1)}ms` },
      ]);
      setStats({ 
        simple: tiering.vSimpleStack.length + tiering.hSimpleStack.length, 
        moderate: tiering.vModerateStack.length + tiering.hModerateStack.length, 
        complex: tiering.vComplexStack.length + tiering.hComplexStack.length 
      });

      const sieve = new StructuralSieve();
      let currentMasks = new Array(N * M).fill(initialMask);

      const result = await sieve.generateAsync(
        tiering,
        N,
        M,
        async (canvas: LogicCanvas, currentStats, msg, entry) => {
        const newMasks = [];
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < M; c++) {
            newMasks.push(canvas.getMask(r, c));
          }
        }
        
        setPrevMasks([...currentMasks]);
        setMasks(newMasks);
        currentMasks = newMasks;

        setStats(currentStats);
        setEvents(prev => [...prev, { msg, entry }]);

        if (isSteppingRef.current) {
          await new Promise<void>(resolve => {
            stepResolverRef.current = resolve;
          });
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      },
      Math.random,
      (sol) => { solutionRef.current = sol; }
      );

      setTelemetry(result);
      setEvents(prev => [...prev, { msg: `✓ Generation Pipeline finished in ${result.timeMs.toFixed(1)}ms` }]);
      setPrevMasks(currentMasks);

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (e instanceof ContradictionError) {
        const cellList = e.deadCells.map(c => `R${c.row}:C${c.col}`).join(', ');
        setEvents(prev => [...prev, {
          msg: `CONTRADICTION: Clue killed ${e.deadCells.length} cell(s) → ${cellList}`,
          entry: e.offendingEntry,
          isContradiction: true,
          deadCells: e.deadCells,
        } as LogEvent]);
      } else {
        setEvents(prev => [...prev, { msg: `CRITICAL ERROR: ${e.message}` }]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm w-full mt-12 col-span-1 xl:col-span-2">
      <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-orange-400 uppercase tracking-widest">
        <span className="material-icons">architecture</span>
        Sandbox: Structural Sieve Generation
      </h2>
      
      <div className="flex flex-wrap gap-6 mb-8 bg-slate-950 p-6 rounded-2xl border border-slate-800 items-end">
        <label className="flex flex-col text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Categories (Rows / N)
          <input type="number" value={N} onChange={e=>setN(Number(e.target.value))} 
                 className="bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-lg mt-1 w-24 outline-none focus:border-orange-500" 
                 min={3} max={8}/>
        </label>
        <label className="flex flex-col text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Houses (Columns / M)
          <input type="number" value={M} onChange={e=>setM(Number(e.target.value))} 
                 className="bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-lg mt-1 w-24 outline-none focus:border-orange-500" 
                 min={3} max={8}/>
        </label>
        <label className="flex flex-col text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Mode
          <select value={mode} onChange={e => {
            const newMode = e.target.value as 'AUTO' | 'MANUAL';
            setMode(newMode);
            isSteppingRef.current = newMode === 'MANUAL';
            if (newMode === 'AUTO' && stepResolverRef.current) {
              stepResolverRef.current();
              stepResolverRef.current = null;
            }
          }} className="bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm mt-1 w-32 outline-none focus:border-orange-500">
            <option value="AUTO">AUTO</option>
            <option value="MANUAL">MANUAL</option>
          </select>
        </label>

        {mode === 'AUTO' && (
          <label className="flex flex-col text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Delay (ms)
            <input type="number" value={delay} onChange={e => setDelay(Number(e.target.value))} 
                   className="bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-sm mt-1 w-20 outline-none focus:border-orange-500" 
                   min={0} max={2000}/>
          </label>
        )}

        <div className="flex gap-2">
          <button onClick={generate} disabled={isGenerating} 
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition disabled:opacity-50">
            {isGenerating ? 'Restart' : 'Trigger Sieve Generator'}
          </button>
          
          {isGenerating && mode === 'MANUAL' && (
            <button onClick={() => {
              if (stepResolverRef.current) {
                stepResolverRef.current();
                stepResolverRef.current = null;
              }
            }} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition">
              Next Step
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="col-span-2 bg-slate-950/80 border border-slate-800 rounded-3xl p-8">
          <h3 className="text-xs font-bold tracking-widest text-slate-500 mb-6 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live LogicCanvas Stream
          </h3>
          
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${M}, minmax(0, 1fr))` }}>
            {masks.map((mask, idx) => {
              const prev = prevMasks[idx];
              const isChanged = mask !== prev;
              const isSolved = mask !== 0 && (mask & (mask - 1)) === 0;
              const row = Math.floor(idx / M);
              const remainingOptions = [];
              for (let i = 0; i < M; i++) {
                if ((mask & (1 << i)) !== 0) remainingOptions.push(i);
              }

              return (
                <div key={idx} className={`font-mono text-center p-2 sm:p-3 rounded-xl transition-all duration-150 relative overflow-hidden flex flex-wrap items-center justify-center gap-1 min-h-[60px] ${
                  isChanged ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-105 z-10' : 
                  mask === 0 ? 'bg-red-900/20 text-red-500/50 grayscale opacity-20' :
                  isSolved ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 ring-2 ring-emerald-500/20' : 
                  'bg-slate-900 text-slate-600'
                }`}>
                  {remainingOptions.map(opt => (
                    <span key={opt} className={`${isSolved ? 'text-2xl' : 'text-xs opacity-50'}`}>
                      {getFallbackEmoji(row, opt)}
                    </span>
                  ))}
                  {isChanged && <div className="absolute inset-0 bg-white/20 animate-ping rounded-xl"></div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 flex justify-between items-center text-center">
             <div className="flex-1">
               <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">SIMPLE</div>
               <div className="text-3xl font-light text-blue-400 font-mono">{stats.simple}</div>
             </div>
             <div className="w-[1px] h-8 bg-slate-800"></div>
             <div className="flex-1">
               <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">MODERATE</div>
               <div className="text-3xl font-light text-purple-400 font-mono">{stats.moderate}</div>
             </div>
             <div className="w-[1px] h-8 bg-slate-800"></div>
             <div className="flex-1">
               <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-1">COMPLEX</div>
               <div className="text-3xl font-light text-orange-400 font-mono">{stats.complex}</div>
             </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 flex flex-col">
             <h3 className="text-xs font-bold tracking-widest text-slate-500 mb-4 uppercase">Sieve Event Log</h3>
            <div className="overflow-y-auto text-[11px] font-mono space-y-1.5 pr-2 custom-scrollbar max-h-[500px]">
              {events.map((ev, i) => {
                const isEscalation = ev.msg.includes('Escalating') || ev.msg.includes('CRITICAL');

                const connector = ev.entry
                  ? ev.entry.type === 'LEFT_OF'   ? '→'
                  : ev.entry.type === 'ADJACENT'  ? '↔'
                  : ev.entry.type.includes('NOT') ? '≠'
                  : ev.entry.type.includes('SEQ') ? '⋯'
                  : '•'
                  : null;
                const stepLabel = ev.msg.includes('SIMPLE Clue') ? 'Simple'
                  : ev.msg.includes('MODERATE Clue') ? 'Moderate'
                  : ev.msg.includes('COMPLEX Clue') ? 'Complex'
                  : ev.msg.includes('Pruning Pass') ? 'Prune'
                  : ev.msg.includes('Committed') ? 'Discovery'
                  : ev.msg.includes('Stalemate') ? 'Anchor'
                  : null;

                if (ev.entry && stepLabel) {
                  const isPrune = stepLabel === 'Prune';
                  const isDiscovery = stepLabel === 'Discovery';
                  const isAnchor = stepLabel === 'Anchor';

                  return (
                    <div key={i} className={`shrink-0 rounded-lg border overflow-hidden ${
                      isPrune 
                        ? 'border-purple-900/40 bg-purple-950/20 border-l-[3px] border-l-purple-500/60' 
                        : isDiscovery
                        ? 'border-blue-900/40 bg-blue-950/20 border-l-[3px] border-l-blue-500/60'
                        : 'border-emerald-900/40 bg-emerald-950/20 border-l-[3px] border-l-emerald-500/60'
                    }`}>
                      <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                        <span className="text-[9px] text-slate-600 shrink-0 tabular-nums">[{String(i).padStart(3, '0')}]</span>
                        <span className={`text-[9px] font-bold tracking-widest uppercase ${
                          isPrune ? 'text-purple-400' : 
                          isDiscovery ? 'text-blue-400' :
                          'text-emerald-400'
                        }`}>
                          {isPrune ? '✂️ Pruned Clue' : isAnchor ? '⚓ Anchor Clue' : `✓ ${stepLabel} Clue`}
                        </span>
                        <span className="ml-auto text-[9px] font-bold text-slate-500 tracking-wider uppercase shrink-0">
                          {ev.entry.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="px-2 pb-1.5 text-[10px] text-slate-400 leading-snug">
                        {ev.msg}
                      </div>

                      <div className={`flex items-center gap-1.5 px-2 pb-2 pt-1 border-t flex-wrap ${
                        isPrune ? 'border-purple-900/30 grayscale opacity-50' : 'border-emerald-900/30'
                      }`}>
                        {ev.entry.slots.map((s, si) => (
                          <span key={si} className="flex items-center gap-1">
                            {si > 0 && (
                              <span className="text-sm text-slate-500 font-bold">{connector}</span>
                            )}
                            <div className="relative flex items-center justify-center">
                              <span title={`Row ${s.r}, Col ${s.c}`} className={`text-xl leading-none ${isExcluded(ev.entry!.type, si) ? 'opacity-40 grayscale' : ''}`}>
                                {resolveSlotEmoji(s, solutionRef.current)}
                              </span>
                              {isExcluded(ev.entry!.type, si) && (
                                <div className="absolute inset-0 flex items-center justify-center text-red-500/80 font-black text-xs pointer-events-none">
                                  <span className="material-icons !text-lg select-none">close</span>
                                </div>
                              )}
                            </div>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
 

                 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((ev as any).isContradiction && ev.entry) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const deadCells: { row: number; col: number }[] = (ev as any).deadCells ?? [];
                  return (
                    <div key={i} className="shrink-0 rounded-lg border border-red-900/50 bg-red-950/20 border-l-[3px] border-l-red-500 overflow-hidden">
                      <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                        <span className="text-[9px] text-slate-600 shrink-0 tabular-nums">[{String(i).padStart(3, '0')}]</span>
                        <span className="text-[9px] font-bold tracking-widest text-red-400 uppercase">⚠ CONTRADICTION DETECTED</span>
                        <span className="ml-auto text-[9px] font-bold text-slate-500 tracking-wider uppercase shrink-0">
                          {ev.entry.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="px-2 pb-1.5 text-[10px] text-red-300/80 leading-snug">
                        {ev.msg}
                        {deadCells.length > 0 && (
                          <span className="ml-2 text-red-400/60">
                            ({deadCells.map(c => `R${c.row}C${c.col}`).join(', ')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-2 pb-2 pt-1 border-t border-red-900/40 flex-wrap">
                        {ev.entry.slots.map((s, si) => (
                          <span key={si} className="flex items-center gap-1">
                            {si > 0 && (
                              <span className="text-sm text-slate-500 font-bold">{connector}</span>
                            )}
                            <div className="relative flex items-center justify-center">
                              <span title={`Row ${s.r}, Col ${s.c}`} className={`text-xl leading-none ${isExcluded(ev.entry!.type, si) ? 'opacity-40 grayscale' : ''}`}>
                                {resolveSlotEmoji(s, solutionRef.current)}
                              </span>
                              {isExcluded(ev.entry!.type, si) && (
                                <div className="absolute inset-0 flex items-center justify-center text-red-500/80 font-black text-xs pointer-events-none">
                                  <span className="material-icons !text-lg select-none">close</span>
                                </div>
                              )}
                            </div>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className={`shrink-0 flex items-center gap-2 px-2 py-1.5 rounded border-l-[3px] ${
                    isEscalation ? 'text-orange-400 border-orange-500/60 bg-orange-950/20' : 'text-slate-500 border-slate-800 bg-slate-900/30'
                  }`}>
                    <span className="text-[9px] opacity-40 shrink-0 tabular-nums">[{String(i).padStart(3, '0')}]</span>
                    <span className="text-[10px] opacity-80">{ev.msg}</span>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </div>
        </div>
      </div>

      {telemetry && (
        <div className="mt-8 bg-emerald-950/30 border border-emerald-900/50 rounded-3xl p-8 backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h3 className="text-emerald-400 font-black mb-6 uppercase tracking-widest text-sm flex items-center gap-2">
             <span className="material-icons text-xl">receipt_long</span>
             Structural Recipe Finalized
           </h3>
           
           <div className="grid grid-cols-4 gap-4 mb-6 text-xs font-mono text-emerald-100/70 p-4 bg-emerald-950/50 rounded-2xl border border-emerald-900/50">
             <div><span className="text-emerald-500/50 uppercase tracking-widest block text-[9px] mb-1">Manifest Volume (V)</span> 
               <span className="text-xl">{telemetry.manifestVolume}</span> clues
             </div>
             <div><span className="text-emerald-500/50 uppercase tracking-widest block text-[9px] mb-1">Target Clues (N_target)</span> 
               <span className="text-xl">{telemetry.targetClues}</span> minimum
             </div>
             <div><span className="text-emerald-500/50 uppercase tracking-widest block text-[9px] mb-1">Final Accepted</span> 
               <span className="text-xl text-white">{telemetry.finalClues}</span> clues
             </div>
             <div><span className="text-emerald-500/50 uppercase tracking-widest block text-[9px] mb-1">Pruning Efficiency</span> 
               <span className="text-xl text-emerald-400">-{telemetry.prunedCount}</span> redundant
             </div>
           </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {telemetry.clues.map((c: TopologyEntry, i: number) => {
                 const weight = getWeight(c.type);
                 const weightLabel = weight === 1 ? 'S' : weight === 2 ? 'M' : 'C';
                 const weightColor = weight === 1 ? 'border-blue-400/30 text-blue-400' : weight === 2 ? 'border-purple-400/30 text-purple-400' : 'border-orange-400/30 text-orange-400';
                 const originalText = getClueText(c);

                 return (
                  <div key={i} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3 relative overflow-hidden h-full">
                    <div className={`absolute top-0 right-0 px-1.5 py-0.5 text-[8px] font-black border-l border-b rounded-bl-lg tracking-tighter ${weightColor}`}>
                      {weightLabel}
                    </div>

                    <div className="text-[10px] font-bold text-slate-600 bg-slate-900 w-6 h-6 flex items-center justify-center rounded-full shrink-0">
                      {i+1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1 pr-6">
                        <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">{c.type.replace(/_/g, ' ')}</span>
                      </div>
                      
                      <div className="text-[11px] text-slate-300 font-medium leading-relaxed mb-3 pr-2 italic">
                        "{originalText}"
                      </div>

                      <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/50 text-[10px] font-bold text-slate-400">
                        {c.slots.map((s, si) => (
                          <div key={si} className="flex items-center gap-1 text-xl">
                            {si > 0 && <span className="text-[10px] text-slate-600 font-bold">
                              {c.type === 'LEFT_OF' ? '→' : c.type === 'ADJACENT' ? '↔' : c.type.includes('NOT') ? '≠' : '•'}
                            </span>}
                            <div className="relative flex items-center justify-center">
                              <span className={isExcluded(c.type, si) ? 'opacity-30 grayscale' : ''}>
                                {resolveSlotEmoji(s, telemetry?.solution ?? null)}
                              </span>
                              {isExcluded(c.type, si) && (
                                <div className="absolute inset-0 flex items-center justify-center text-red-500/80 font-black text-[10px] pointer-events-none">
                                  <span className="material-icons !text-sm select-none">close</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                 );
              })}
            </div>
        </div>
      )}
    </section>
  );
}
