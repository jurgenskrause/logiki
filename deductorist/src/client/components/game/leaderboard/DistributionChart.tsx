import React, { useMemo } from 'react';
import type { LeaderboardResponse } from '../../../../shared/api';

interface Props {
  leaderboardData: LeaderboardResponse;
  userTimeMs: number;
}

export const DistributionChart: React.FC<Props> = ({ leaderboardData, userTimeMs }) => {
  const { distribution, totalSolvers } = leaderboardData;
  const userBucket = Math.floor(userTimeMs / 1000);

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  const { chartData, percentile, totalOthers } = useMemo(() => {
    if (!distribution || !totalSolvers) return { chartData: [], percentile: 0, betterCount: 0, totalOthers: 0 };

    const buckets = Object.keys(distribution).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    if (buckets.length === 0) return { chartData: [], percentile: 0, betterCount: 0 };

    let min = Math.min(buckets[0], userBucket);
    let originalMax = Math.max(buckets[buckets.length - 1], userBucket);

    let slowerCount = 0;
    let runningTotal = 0;
    let cutoffMax = originalMax;

    // Filter outliers logic: Drop outliers that stretch the chart needlessly
    for (const b of buckets) {
      runningTotal += distribution[b];
      if (b > userBucket) slowerCount += distribution[b];

      // Clip bounds at 99% of solvers
      if (runningTotal >= totalSolvers * 0.99 && cutoffMax === originalMax) {
         cutoffMax = Math.max(min + 60, b * 1.5); 
      }
    }

    const max = Math.min(originalMax, cutoffMax);
    const range = max - min + 1;
    const numColumns = 14;
    const binSize = Math.max(1, Math.ceil(range / numColumns));

    const totalOthers = Math.max(0, totalSolvers - 1);
    const perc = totalOthers > 0 ? Math.floor((slowerCount / totalOthers) * 100) : 100;

    const data = [];
    let maxVal = 1;

    for (let start = min; start <= max; start += binSize) {
      const end = start + binSize - 1;
      const isLastBin = start + binSize > max;
      const actualEnd = isLastBin ? Infinity : end;

      let count = 0;
      let isUserBin = false;
      
      for (const bucket of buckets) {
         if (bucket >= start && bucket <= actualEnd) {
            count += distribution[bucket];
            if (bucket === userBucket) isUserBin = true;
         }
      }
      
      maxVal = Math.max(maxVal, count);
      
      data.push({
         timeSec: start,
         endSec: isLastBin ? Infinity : end,
         count,
         isUser: isUserBin,
         heightPercent: 0
      });
    }

    // Attempt to artificially pad user if tracking disconnected
    const userBar = data.find(d => d.isUser);
    if (userBar && userBar.count === 0) {
      userBar.count = 1;
      maxVal = Math.max(maxVal, 1);
    }
    
    data.forEach(d => {
       d.heightPercent = Math.max(2, Math.floor((d.count / maxVal) * 100));
    });

    return { chartData: data, percentile: perc, betterCount: slowerCount, totalOthers };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distribution, totalSolvers, userTimeMs, userBucket]);

  if (!distribution || chartData.length === 0) return null;

  return (
    <div className="w-full mt-1 flex flex-col items-center">
      <h3 className="text-slate-600 dark:text-slate-300 font-medium mb-0.5 tracking-tight text-[11px] sm:text-[12px]">Solution Distribution</h3>
      <p className="text-[10px] sm:text-[11px] text-slate-500 mb-2 sm:mb-3 font-bold">
        {totalOthers > 0 
          ? `Your ${formatSecs(userBucket)}s - Better than ${percentile}% of ${totalOthers} solvers`
          : `Your ${formatSecs(userBucket)}s - First to solve!`
        }
      </p>

      <div className="flex items-end justify-center w-full h-16 sm:h-20 px-1 mb-1 gap-1 isolate relative">
        {chartData.map((bar, idx) => (
          <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 max-w-[2.5rem] relative">
            <span className={`text-[10px] font-bold opacity-80 flex flex-col items-center ${bar.isUser ? 'text-[#0ea5e9]' : 'text-slate-400'}`}>
              {bar.isUser && percentile >= 90 && <span className="material-icons text-[14px] text-amber-500 transform translate-y-1 z-10 filter drop-shadow">emoji_events</span>}
              <span className="mb-1">{bar.count > 0 ? bar.count : ''}</span>
            </span>
            <div 
              className={`w-full rounded-t-sm transition-all duration-1000 ${bar.isUser ? 'bg-[#0ea5e9]' : 'bg-[#22c55e]'}`}
              style={{ height: `${bar.heightPercent}%` }}
            />
            {/* Native zero-point visual horizontal baseline tracking identical to wireframe */}
            <div className="absolute bottom-0 w-full flex items-end">
               <div className="h-[2px] w-full bg-[#1e293b]" style={{ transform: 'translateY(1px)' }}></div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};
