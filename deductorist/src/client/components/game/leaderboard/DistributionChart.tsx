import React, { useMemo } from 'react';
import type { LeaderboardResponse } from '../../../../shared/api';

interface Props {
  leaderboardData: LeaderboardResponse;
  userTimeMs: number;
}

export const DistributionChart: React.FC<Props> = ({ leaderboardData, userTimeMs }) => {
  const { distribution, totalSolvers } = leaderboardData;
  const userBucket = Math.floor(userTimeMs / 1000);

  const { chartData, percentile, betterCount } = useMemo(() => {
    if (!distribution || !totalSolvers) return { chartData: [], percentile: 0, betterCount: 0 };

    const buckets = Object.keys(distribution).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    if (buckets.length === 0) return { chartData: [], percentile: 0, betterCount: 0 };

    const min = Math.min(buckets[0], userBucket);
    const max = Math.max(buckets[buckets.length - 1], userBucket);

    const range = max - min + 1;
    const numColumns = 14;
    const binSize = Math.max(1, Math.ceil(range / numColumns));

    const data = [];
    let slowerCount = 0;
    
    for (const b of buckets) {
      if (b > userBucket) {
        slowerCount += distribution[b];
      }
    }

    const perc = Math.floor((slowerCount / totalSolvers) * 100);

    // Grouping by bins
    let maxVal = 1;
    for (let start = min; start <= max; start += binSize) {
      const end = start + binSize - 1;
      let count = 0;
      let isUserBin = false;
      
      for(let i = start; i <= end; i++) {
         count += distribution[i] || 0;
         if (i === userBucket) isUserBin = true;
      }
      
      maxVal = Math.max(maxVal, count);
      
      data.push({
         timeSec: start,
         endSec: binSize > 1 ? end : start,
         count,
         isUser: isUserBin,
         heightPercent: 0 // Will map scaling next loop
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

    return { chartData: data, percentile: perc, betterCount: slowerCount };
  }, [distribution, totalSolvers, userTimeMs, userBucket]);

  if (!distribution || chartData.length === 0) return null;

  return (
    <div className="w-full mt-4 flex flex-col items-center">
      <h3 className="text-slate-600 dark:text-slate-300 font-medium mb-1 tracking-tight">Solution Distribution</h3>
      <p className="text-[12px] text-slate-500 mb-6 font-bold">
        Your {userBucket}s - Better than {percentile}% of {totalSolvers} solvers
      </p>

      <div className="flex items-end justify-center w-full h-32 px-1 mb-2 gap-1 isolate relative">
        {chartData.map((bar, idx) => (
          <div key={idx} className="flex flex-col items-center flex-1 max-w-[2.5rem] relative">
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
      
      {/* Bottom X-Axis labels mapping under baseline */}
      <div className="flex items-start justify-center w-full px-1 gap-1 h-6">
         {chartData.map((bar, idx) => (
            <div key={idx} className={`flex flex-col items-center flex-1 max-w-[2.5rem] pt-1`}>
              <span className={`text-[10px] font-extrabold ${bar.isUser ? 'text-[#0ea5e9]' : 'text-slate-400'}`}>
                {bar.isUser ? 'You' : bar.timeSec + (bar.endSec > bar.timeSec ? '+' : '')}
              </span>
            </div>
         ))}
      </div>
    </div>
  );
};
