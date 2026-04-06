import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const emojis = ['🍎', '🐕', '🏠', '⚽', '💎', '🎹', '⏰', '🎸', '🚀'];

export const Splash = () => {
  return (
    <div className="flex relative flex-col justify-center items-center min-h-[100dvh] bg-slate-950 overflow-hidden font-sans">
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-90" />
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-indigo-600 rounded-full mix-blend-screen blur-[100px] opacity-40 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-80 h-80 bg-purple-600 rounded-full mix-blend-screen blur-[120px] opacity-30 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col items-center justify-center gap-10 p-6 w-full max-w-lg">
        
        {/* Title Section */}
        <div className="flex flex-col items-center gap-3 w-full">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-blue-400 to-purple-500 drop-shadow-sm w-full text-center pb-2">
            DEDUCTORIST
          </h1>
          <p className="text-slate-300 font-bold tracking-[0.2em] uppercase text-xs sm:text-sm text-center drop-shadow-lg">
            The Ultimate Logic Grid Puzzle
          </p>
        </div>

        {/* Centerpiece: Floating 3x3 Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 p-5 sm:p-7 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {emojis.map((emoji, idx) => (
            <div 
              key={idx}
              className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-4xl sm:text-5xl bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-inner animate-float"
              style={{ animationDelay: `${(idx % 3) * 0.3 + Math.floor(idx / 3) * 0.15}s` }}
            >
              <span className="drop-shadow-lg">{emoji}</span>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <button
          className="group relative mt-6 flex items-center justify-center px-10 py-5 sm:px-12 sm:py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black tracking-wider text-lg sm:text-xl rounded-full transition-all duration-300 hover:-translate-y-1 active:scale-95 animate-pulse-glow shadow-xl border border-white/10"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          <span className="flex items-center gap-3">
            <span className="material-icons text-2xl sm:text-3xl drop-shadow-md">play_arrow</span>
            PLAY DAILY PUZZLE
          </span>
        </button>
        
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center text-slate-500 text-[10px] font-bold tracking-[0.15em] opacity-80 pointer-events-none">
        POWERED BY DEVVIT
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
