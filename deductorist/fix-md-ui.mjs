import fs from 'fs';

// 1. VerticalClueUI.tsx
let f1 = fs.readFileSync('src/client/components/game/clue/VerticalClueUI.tsx', 'utf8');

f1 = f1.replace(
  'const iconClass = "text-xl md:text-3xl drop-shadow-sm leading-none flex items-center justify-center";',
  'const iconClass = `drop-shadow-sm leading-none flex items-center justify-center ${isDesktop ? "text-3xl" : "text-xl"}`;'
);
f1 = f1.replace(/pt-1 pb-4 md:py-2/g, "${isDesktop ? 'py-2' : 'pt-1 pb-4'}");
f1 = f1.replace(/text-lg md:text-2xl/g, "${isDesktop ? 'text-2xl' : 'text-lg'}");
f1 = f1.replace(/w-7 h-7 md:w-\[42px\] md:h-\[42px\] border-\[2px\] md:border-\[4px\]/g, "${isDesktop ? 'w-[42px] h-[42px] border-[4px]' : 'w-7 h-7 border-[2px]'}");
f1 = f1.replace(/h-\[2px\] md:h-\[4px\]/g, "${isDesktop ? 'h-[4px]' : 'h-[2px]'}");
f1 = f1.replace(/gap-1 md:gap-4/g, "${isDesktop ? 'gap-4' : 'gap-1'}");
f1 = f1.replace(/text-\[8px\] md:text-\[14px\]/g, "${isDesktop ? 'text-[14px]' : 'text-[8px]'}");
f1 = f1.replace(/text-xl md:text-2xl/g, "${isDesktop ? 'text-2xl' : 'text-xl'}");
f1 = f1.replace(/w-20 md:w-24 h-\[120px\] md:h-\[168px\]/g, "${isDesktop ? 'w-24 h-[168px]' : 'w-20 h-[120px]'}");

f1 = f1.replace(
  'className="absolute bottom-0 inset-x-0 h-6 md:hidden flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-b-lg transition-colors group/handle touch-none"',
  'className={`absolute bottom-0 inset-x-0 h-6 items-center justify-center gap-2 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-b-lg transition-colors group/handle touch-none ${isDesktop ? "hidden" : "flex"}`}'
);

fs.writeFileSync('src/client/components/game/clue/VerticalClueUI.tsx', f1);


// 2. HorizontalClueUI.tsx
let f2 = fs.readFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', 'utf8');

f2 = f2.replace(/gap-3 md:gap-5 pr-6 md:pr-0/g, "${isDesktop ? 'gap-5 pr-0' : 'gap-3 pr-6'}");
f2 = f2.replace(/text-xl md:text-3xl/g, "${isDesktop ? 'text-3xl' : 'text-xl'}");
f2 = f2.replace(/text-base md:text-2xl/g, "${isDesktop ? 'text-2xl' : 'text-base'}");
f2 = f2.replace(/gap-2 md:gap-4 pr-6 md:pr-0/g, "${isDesktop ? 'gap-4 pr-0' : 'gap-2 pr-6'}");
f2 = f2.replace(/gap-1\.5 md:gap-2 pr-6 md:pr-0/g, "${isDesktop ? 'gap-2 pr-0' : 'gap-1.5 pr-6'}");
f2 = f2.replace(/scale-\[0\.6\] md:scale-75 -mx-3 md:-mx-2/g, "${isDesktop ? 'scale-75 -mx-2' : 'scale-[0.6] -mx-3'}");
f2 = f2.replace(/gap-2 md:gap-3 pr-6 md:pr-0/g, "${isDesktop ? 'gap-3 pr-0' : 'gap-2 pr-6'}");
f2 = f2.replace(/w-7 h-7 md:w-\[42px\] md:h-\[42px\] border-\[2px\] md:border-\[4px\]/g, "${isDesktop ? 'w-[42px] h-[42px] border-[4px]' : 'w-7 h-7 border-[2px]'}");
f2 = f2.replace(/h-\[2px\] md:h-\[4px\]/g, "${isDesktop ? 'h-[4px]' : 'h-[2px]'}");
f2 = f2.replace(/text-2xl md:text-3xl/g, "${isDesktop ? 'text-3xl' : 'text-2xl'}");
f2 = f2.replace(/w-40 sm:w-40 h-14 sm:h-\[66px\] md:max-w-none md:w-48 md:h-\[84px\]/g, "${isDesktop ? 'w-48 h-[84px] max-w-none' : 'w-40 h-14 sm:h-[66px]'}");

f2 = f2.replace(
  'className="absolute right-0 inset-y-0 w-8 md:hidden flex flex-col items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-r-lg transition-colors group/handle touch-none"',
  'className={`absolute right-0 inset-y-0 w-8 flex flex-col items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-r-lg transition-colors group/handle touch-none ${isDesktop ? "hidden" : "flex"}`}'
);

fs.writeFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', f2);


// 3. HorizontalClueList.tsx fixes for gap
let f3 = fs.readFileSync('src/client/components/game/clue/HorizontalClueList.tsx', 'utf8');
f3 = f3.replace(' className="w-full h-full grid gap-0.5 overflow-hidden"', ' className="w-full h-full grid gap-1 overflow-hidden"');
f3 = f3.replace('const CLUE_MAX_HEIGHT = 84 + 2; // h-[84px] + gap-0.5', 'const CLUE_MAX_HEIGHT = 84 + 4; // h-[84px] + gap-1');
f3 = f3.replace('const CLUE_WIDTH = 192 + 2; // w-48 + gap-0.5', 'const CLUE_WIDTH = 192 + 4; // w-48 + gap-1');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', f3);
