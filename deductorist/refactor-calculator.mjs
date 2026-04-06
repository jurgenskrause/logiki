import fs from 'fs';

// --- 1. GamePage.tsx ---
let f1 = fs.readFileSync('src/client/components/game/GamePage.tsx', 'utf8');

// Replace the old isDesktop hook
const oldHook = `  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = useMemo(() => {
    if (!puzzle) return containerWidth >= 768;
    // Prefer desktop mode seamlessly if we have minimal reasonable space and a simple puzzle
    if (puzzle.rows <= 5 && containerWidth >= 500) return true;
    return containerWidth >= 768;
  }, [containerWidth, puzzle]);`;

const newHook = `  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { isDesktop, clueIconSize } = useMemo(() => {
    const isDesk = (!puzzle ? viewport.width >= 768 : (puzzle.rows <= 5 && viewport.width >= 500) || viewport.width >= 768);
    
    let iconSize = 24;
    if (puzzle) {
       const estBoardSize = isDesk 
           ? Math.min(viewport.width * 0.65, viewport.height - 40)
           : Math.min(viewport.width - 32, viewport.height * 0.55);
           
       const cells = puzzle.rows;
       const cellWidth = estBoardSize / cells;
       const itemsPerRow = Math.ceil(Math.sqrt(cells));
       const boardIconSize = (cellWidth * 0.6) / itemsPerRow;
       
       iconSize = Math.max(boardIconSize * 2, 16);
       iconSize = Math.min(iconSize, isDesk ? 36 : 28);
    }
    return { isDesktop: isDesk, clueIconSize: iconSize };
  }, [viewport.width, viewport.height, puzzle]);`;

f1 = f1.replace(oldHook, newHook);

// Update GamePage passing clueIconSize prop
f1 = f1.replace(/<HorizontalClueList isDesktop={isDesktop}/g, '<HorizontalClueList isDesktop={isDesktop} clueIconSize={clueIconSize}');
f1 = f1.replace(/<VerticalClueList isDesktop={isDesktop}/g, '<VerticalClueList isDesktop={isDesktop} clueIconSize={clueIconSize}');

fs.writeFileSync('src/client/components/game/GamePage.tsx', f1);

// --- 2. HorizontalClueList.tsx ---
let f2 = fs.readFileSync('src/client/components/game/clue/HorizontalClueList.tsx', 'utf8');
f2 = f2.replace('isDesktop?: boolean;', 'isDesktop?: boolean;\n  clueIconSize?: number;');
f2 = f2.replace('isDesktop = false }) => {', 'isDesktop = false, clueIconSize = 24 }) => {');
f2 = f2.replace(/<HorizontalClueUI isDesktop={isDesktop}/g, '<HorizontalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize}');

// update CLUE_MAX_HEIGHT & CLUE_WIDTH usage inside list
f2 = f2.replace('const maxCluesPerColumn = Math.floor(containerHeight / CLUE_MAX_HEIGHT) || 1;', 'const currentH = clueIconSize * 2.2 + 2;\n  const maxCluesPerColumn = Math.floor(containerHeight / currentH) || 1;');
f2 = f2.replace('actualCols * CLUE_WIDTH', 'actualCols * (clueIconSize * 4.8 + 2)');
f2 = f2.replace('actualCols * CLUE_WIDTH', 'actualCols * (clueIconSize * 4.8 + 2)');

fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', f2);

// --- 3. VerticalClueList.tsx ---
let f3 = fs.readFileSync('src/client/components/game/clue/VerticalClueList.tsx', 'utf8');
f3 = f3.replace('isDesktop?: boolean;', 'isDesktop?: boolean;\n  clueIconSize?: number;');
f3 = f3.replace('isDesktop = false }) => {', 'isDesktop = false, clueIconSize = 24 }) => {');
f3 = f3.replace(/<VerticalClueUI isDesktop={isDesktop}/g, '<VerticalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize}');
fs.writeFileSync('src/client/components/game/clue/VerticalClueList.tsx', f3);

// --- 4. HorizontalClueUI.tsx ---
let f4 = fs.readFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', 'utf8');
f4 = f4.replace('isDesktop?: boolean;', 'isDesktop?: boolean;\n  clueIconSize?: number;');
f4 = f4.replace('isDesktop = false }) => {', 'isDesktop = false, clueIconSize = 24 }) => {');

// Strip out tailwind class bounds and replace with inline styles
f4 = f4.replace('className={`${isDesktop ? \'w-44 h-[76px] max-w-none\' : \'w-40 h-14 sm:h-[66px]\'} shrink-0', 'style={{ width: `calc(${clueIconSize}px * 4.8)`, height: `calc(${clueIconSize}px * 2.2)`, fontSize: `${clueIconSize}px` }}\n      className={`shrink-0');

// Replace inner tailwind fonts to inherit standard css font size
f4 = f4.replace(/className="\${isDesktop \? 'text-4xl' : 'text-xl'} drop-shadow-sm"/g, 'className="drop-shadow-sm leading-none flex items-center"');
f4 = f4.replace(/className="\${isDesktop \? 'text-4xl' : 'text-2xl'} drop-shadow-sm"/g, 'className="drop-shadow-sm leading-none flex items-center"');
f4 = f4.replace(/className="\${isDesktop \? 'text-4xl' : 'text-2xl'}"/g, 'className="leading-none flex items-center"');
f4 = f4.replace(/className="material-icons text-slate-400 dark:text-slate-300 \${isDesktop \? 'text-2xl' : 'text-base'}"/g, 'className="material-icons text-slate-400 dark:text-slate-300" style={{ fontSize: `${clueIconSize * 0.75}px` }}');
f4 = f4.replace(/className="material-icons text-slate-400 dark:text-slate-300 \${isDesktop \? 'text-2xl' : 'text-base'}"/g, 'className="material-icons text-slate-400 dark:text-slate-300" style={{ fontSize: `${clueIconSize * 0.75}px` }}');

f4 = f4.replace(/className="text-xl md:text-3xl"/g, 'className="leading-none"');

// Fix gaps dynamically via style
f4 = f4.replace(/className="flex items-center justify-center w-full h-full \${isDesktop \? 'gap-3 pr-0' : 'gap-3 pr-6'}"/g, 'className="flex items-center justify-center w-full h-full" style={{ gap: `calc(${clueIconSize}px * 0.5)`, paddingRight: isDesktop ? 0 : "1.5rem" }}');
f4 = f4.replace(/className="flex items-center justify-center w-full h-full \${isDesktop \? 'gap-2 pr-0' : 'gap-2 pr-6'}"/g, 'className="flex items-center justify-center w-full h-full" style={{ gap: `calc(${clueIconSize}px * 0.4)`, paddingRight: isDesktop ? 0 : "1.5rem" }}');
f4 = f4.replace(/className="flex items-center justify-center w-full h-full \${isDesktop \? 'gap-1 pr-0' : 'gap-1\.5 pr-6'}"/g, 'className="flex items-center justify-center w-full h-full" style={{ gap: `calc(${clueIconSize}px * 0.3)`, paddingRight: isDesktop ? 0 : "1.5rem" }}');
f4 = f4.replace(/className="flex items-center justify-center w-full h-full \${isDesktop \? 'gap-1\.5 pr-0' : 'gap-2 pr-6'}"/g, 'className="flex items-center justify-center w-full h-full" style={{ gap: `calc(${clueIconSize}px * 0.35)`, paddingRight: isDesktop ? 0 : "1.5rem" }}');

// XOR Overlay 
f4 = f4.replace(/className="\${isDesktop \? 'w-\[42px\] h-\[42px\] border-\[4px\]' : 'w-7 h-7 border-\[2px\]'}/g, 'style={{ width: `${clueIconSize * 1.5}px`, height: `${clueIconSize * 1.5}px`, borderWidth: `${clueIconSize * 0.15}px` }} className="');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', f4);

// --- 5. VerticalClueUI.tsx ---
let f5 = fs.readFileSync('src/client/components/game/clue/VerticalClueUI.tsx', 'utf8');
f5 = f5.replace('isDesktop?: boolean;', 'isDesktop?: boolean;\n  clueIconSize?: number;');
f5 = f5.replace('isDesktop = false }) => {', 'isDesktop = false, clueIconSize = 24 }) => {');

// Strip container tailwind dimensions
f5 = f5.replace('className={`w-20 md:w-24 h-[120px] md:h-[168px] bg-white', 'style={{ width: `calc(${clueIconSize}px * 2.6)`, height: `calc(${clueIconSize}px * 4.6)`, fontSize: `${clueIconSize}px` }}\n      className={`bg-white');

f5 = f5.replace('const iconClass = `drop-shadow-sm leading-none flex items-center justify-center ${isDesktop ? "text-3xl" : "text-xl"}`;', 'const iconClass = `drop-shadow-sm leading-none flex items-center justify-center`;');

// XOR/NOT overlay logic scaling
f5 = f5.replace(/className="\${isDesktop \? 'w-\[42px\] h-\[42px\] border-\[4px\]' : 'w-7 h-7 border-\[2px\]'} border-red-500\/90/g, 'style={{ width: `${clueIconSize * 1.5}px`, height: `${clueIconSize * 1.5}px`, borderWidth: `${clueIconSize * 0.15}px` }} className="border-red-500/90');
f5 = f5.replace(/className="absolute top-1\/2 left-\[-10%\] w-\[120%\] \${isDesktop \? 'h-\[4px\]' : 'h-\[2px\]'} bg-red-500\/90/g, 'style={{ height: `${clueIconSize * 0.15}px` }} className="absolute top-1/2 left-[-10%] w-[120%] bg-red-500/90');
f5 = f5.replace(/className="material-icons text-blue-500 \${isDesktop \? 'text-\[14px\]' : 'text-\[8px\]'} bg-white\/90/g, 'style={{ fontSize: `${clueIconSize * 0.5}px` }} className="material-icons text-blue-500 bg-white/90');

// Static internal tailwinds to dynamic props
f5 = f5.replace(/className="material-icons text-slate-400 dark:text-slate-300 \${isDesktop \? 'text-2xl' : 'text-lg'} leading-none"/g, 'className="material-icons text-slate-400 dark:text-slate-300 leading-none" style={{ fontSize: `${clueIconSize * 0.75}px` }}');
f5 = f5.replace(/className="material-icons text-red-500 \${isDesktop \? 'text-2xl' : 'text-lg'} leading-none"/g, 'className="material-icons text-red-500 leading-none" style={{ fontSize: `${clueIconSize * 0.75}px` }}');

fs.writeFileSync('src/client/components/game/clue/VerticalClueUI.tsx', f5);
