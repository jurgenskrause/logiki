import React from 'react';

// DEV_BUILD is injected by Vite/vite-env.d.ts or similar globals.

export const DevMenu = ({ puzzleId, grid, isDev, date }: { puzzleId?: string, grid?: Uint16Array | number[], isDev?: boolean, date?: string }) => {
  if (!isDev) return null;

  const handleReset = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = date || urlParams.get('date') || new Date().toISOString().split('T')[0];

    const legacyKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('deductorist_')) legacyKeys.push(key);
    }
    legacyKeys.forEach(k => localStorage.removeItem(k));

    window.__isResetting = true;
    
    if (window.__pendingSyncTimer) clearTimeout(window.__pendingSyncTimer);

    fetch(`/api/game/dev/reset?date=${dateParam}`, { method: 'POST' })
      .then(async r => {
         const json = await r.json();
         if (r.ok) {
           alert('Local Browser cache + Target Date API Globals purged natively!');
           window.location.reload();
         } else {
           alert(`Clearance Rejected: ${json.message}`);
         }
      })
      .catch(console.error);
  };

  const handleRandomSubmit = () => {
    for (let i = 0; i < 50; i++) {
      // Box-Muller transform for a true Normal Distribution (Bell Curve)
      let u = 0, v = 0;
      while (u === 0) u = Math.random(); 
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      
      const meanMs = 300000; // 5 minutes average
      const stdDevMs = 120000; // 2 minutes standard deviation
      let devOverrideTimeMs = Math.floor(z * stdDevMs + meanMs);

      // Minor 2% injection chance for huge tails to simulate absolute outliers structurally
      if (Math.random() < 0.02) {
         devOverrideTimeMs = Math.random() > 0.5 ? 21600000 : 500; 
      }

      // Ensure standard floor is maintained logically
      if (devOverrideTimeMs < 500) devOverrideTimeMs = 500;

      // Ensure synthetic submissions contain enough valid blank payloads to clear Sieve 2 locally
      // Assuming maximum potential 8x8 requires 24 clicks minimum
      const mockMoveLog = new Array(24).fill({ timeOffsetMs: 100, cellIndex: 0 });

      fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId: puzzleId || 'unknown',
          boardState: grid ? Array.from(grid) : [],
          moveLog: mockMoveLog,
          isDevBuild: true,
          devOverrideTimeMs
        })
      }).catch(console.error);
    }
    console.log('50 payloads dispatched (Box-Muller Normal Distribution)');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex gap-2 bg-slate-900/90 p-2 rounded-xl border border-rose-500/30 shadow-2xl">
      <button onClick={handleReset} className="px-3 py-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg font-black text-[10px] uppercase">
        💣 Reset
      </button>
      <button onClick={handleRandomSubmit} className="px-3 py-2 bg-blue-600/90 hover:bg-blue-500 text-white rounded-lg font-black text-[10px] uppercase">
        🎲 Random Submit
      </button>
    </div>
  );
};
