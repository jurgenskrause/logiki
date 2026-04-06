import fs from 'fs';

// 1. HorizontalClueUI.tsx
let f1 = fs.readFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', 'utf8');

// Icons text-3xl -> text-4xl
f1 = f1.replace(/\${isDesktop \? 'text-3xl' : 'text-xl'}/g, "${isDesktop ? 'text-4xl' : 'text-xl'}");
f1 = f1.replace(/\${isDesktop \? 'text-3xl' : 'text-2xl'}/g, "${isDesktop ? 'text-4xl' : 'text-2xl'}");

// Inner gaps
f1 = f1.replace(/\${isDesktop \? 'gap-5 pr-0' : 'gap-3 pr-6'}/g, "${isDesktop ? 'gap-3 pr-0' : 'gap-3 pr-6'}");
f1 = f1.replace(/\${isDesktop \? 'gap-4 pr-0' : 'gap-2 pr-6'}/g, "${isDesktop ? 'gap-2 pr-0' : 'gap-2 pr-6'}");
f1 = f1.replace(/\${isDesktop \? 'gap-2 pr-0' : 'gap-1\.5 pr-6'}/g, "${isDesktop ? 'gap-1 pr-0' : 'gap-1.5 pr-6'}");
f1 = f1.replace(/\${isDesktop \? 'gap-3 pr-0' : 'gap-2 pr-6'}/g, "${isDesktop ? 'gap-1.5 pr-0' : 'gap-2 pr-6'}");

// Box dimensions constraint
f1 = f1.replace(/\${isDesktop \? 'w-48 h-\[84px\] max-w-none' : 'w-40 h-14 sm:h-\[66px\]'}/g, "${isDesktop ? 'w-44 h-[76px] max-w-none' : 'w-40 h-14 sm:h-[66px]'}");

fs.writeFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', f1);

// 2. HorizontalClueList.tsx gap optimization
let f2 = fs.readFileSync('src/client/components/game/clue/HorizontalClueList.tsx', 'utf8');
f2 = f2.replace('grid gap-1 overflow-hidden', 'grid gap-0.5 overflow-hidden');
f2 = f2.replace('CLUE_MAX_HEIGHT = 84 + 4;', 'CLUE_MAX_HEIGHT = 76 + 2;');
f2 = f2.replace('CLUE_WIDTH = 192 + 4;', 'CLUE_WIDTH = 176 + 2;');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', f2);

// 3. VerticalClueList.tsx gap optimization
let f3 = fs.readFileSync('src/client/components/game/clue/VerticalClueList.tsx', 'utf8');
f3 = f3.replace('justify-center gap-1 w-full', 'justify-center gap-0.5 w-full');
fs.writeFileSync('src/client/components/game/clue/VerticalClueList.tsx', f3);
