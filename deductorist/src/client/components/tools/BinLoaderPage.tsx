import React, { useState } from 'react';
import { ManifestLoader, type PuzzleManifest } from '../../../shared/engine/ManifestLoader';

export const BinLoaderPage: React.FC = () => {
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleManifest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileInfo({ name: file.name, size: file.size });
    setIsProcessing(true);
    setError(null);
    setPuzzles([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const loader = new ManifestLoader();
        loader.loadFromBuffer(buffer);

        // To read all puzzles, we'd need to know the dates.
        // For debugging, let's try a range of dates around "today"
        const found: PuzzleManifest[] = [];
        const baseDate = new Date('2026-03-30'); // Our reference start date

        // We check 14 days and 5 levels
        for (let d = 0; d < 14; d++) {
          const date = new Date(baseDate);
          date.setDate(date.getDate() + d);
          const dateStr = date.toISOString().split('T')[0];

          for (let level = 1; level <= 5; level++) {
            const p = await loader.getPuzzle(dateStr, level);
            if (p) found.push(p);
          }
        }

        setPuzzles(found);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message || 'Failed to process binary file.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col items-center">
      <header className="flex items-center gap-4 mb-8 bg-slate-900 border border-slate-800 p-4 rounded-3xl shrink-0 w-full sticky top-0 z-10">
        <h1 className="text-2xl font-black text-blue-400 uppercase tracking-tighter">DEDUCTORIST Binary Inspector</h1>
      </header>

      <main className="w-full max-w-4xl space-y-8">
        {/* Upload Zone */}
        <div className="p-12 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 flex flex-col items-center justify-center gap-6 group hover:border-blue-500/50 transition-colors">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <span className="material-icons text-3xl">upload_file</span>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold mb-1">Upload Deductorist Manifest</p>
            <p className="text-sm text-slate-500">Select a .bin file to inspect its contents</p>
          </div>
          <label className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer shadow-lg shadow-blue-900/20 transition-all active:scale-95">
            Browse Files
            <input type="file" accept=".bin" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {fileInfo && (
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="material-icons text-blue-400">description</span>
              <div>
                <p className="font-bold text-sm">{fileInfo.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{ (fileInfo.size / 1024).toFixed(2) } KB</p>
              </div>
            </div>
            {isProcessing ? (
               <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase">
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-blue-400"></div>
                  Hydrating...
               </div>
            ) : (
               <span className="text-xs text-emerald-400 font-bold uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
                 {puzzles.length} Puzzles Found
               </span>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3">
            <span className="material-icons">error_outline</span>
            {error}
          </div>
        )}

        {/* Puzzle List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {puzzles.map((p, i) => (
            <div key={i} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">Level {p.difficulty}</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{p.rows}x{p.cols} Grid</p>
                </div>
                <div className="px-2 py-1 bg-slate-800 rounded-lg text-[10px] font-mono text-slate-400">
                  {p.clues.length} Clues
                </div>
              </div>

              <div className="space-y-1 overflow-hidden">
                 <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Integrity Hash (SHA-256)</p>
                 <code className="text-[8px] break-all text-slate-400 bg-black/40 p-2 block rounded-lg font-mono">
                    {Array.from(p.integrityHash).map(b => b.toString(16).padStart(2, '0')).join('')}
                 </code>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <details className="group">
                  <summary className="text-[10px] font-bold uppercase tracking-widest text-blue-400 cursor-pointer list-none flex items-center gap-1">
                    <span className="material-icons text-xs group-open:rotate-180 transition-transform">expand_more</span>
                    View {p.clues.length} Clue Packets
                  </summary>
                  <div className="mt-4 space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {p.clues.map((c, ci) => (
                      <div key={ci} className="p-2 bg-slate-950 rounded-lg text-[9px] font-mono flex justify-between">
                        <span className="text-indigo-400">{c.type}</span>
                        <span className="text-slate-500">
                          {c.params.map(pm => `(R${pm.row},I${pm.item})`).join(' ↔ ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
