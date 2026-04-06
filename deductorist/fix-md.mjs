import fs from 'fs';
let code = fs.readFileSync('src/client/components/game/GamePage.tsx', 'utf8');

// 1. Hook
code = code.replace(
  "const isDesktop = useMediaQuery('(min-width: 768px)');",
  `const [containerWidth, setContainerWidth] = useState(window.innerWidth);
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
  }, [containerWidth, puzzle]);`
);

// 2. Mobile Header
code = code.replace(
  `className="md:hidden relative flex items-center px-2 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40 shrink-0 overflow-hidden text-left"`,
  `className={\`relative items-center px-2 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40 shrink-0 overflow-hidden text-left \${isDesktop ? 'hidden' : 'flex'}\`}`
);

// 3. Desktop Header
code = code.replace(
  `className="hidden md:flex relative items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40 shrink-0 overflow-hidden"`,
  `className={\`relative items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40 shrink-0 overflow-hidden \${isDesktop ? 'flex' : 'hidden'}\`}`
);

// 4. Buttons
code = code.replace(
  `className={\`relative hidden md:flex h-10 w-10 p-2.5 rounded-xl items-center justify-center transition-colors shadow-sm \${`,
  `className={\`relative h-10 w-10 p-2.5 rounded-xl items-center justify-center transition-colors shadow-sm \${isDesktop ? 'flex' : 'hidden'} \${`
);
code = code.replace(
  `className="hidden md:flex h-10 w-10 p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl items-center justify-center transition-colors shadow-sm animate-in fade-in zoom-in duration-200"`,
  `className={\`h-10 w-10 p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl items-center justify-center transition-colors shadow-sm animate-in fade-in zoom-in duration-200 \${isDesktop ? 'flex' : 'hidden'}\`}`
);

// 5. Main wrapper
code = code.replace(
  `className={\`w-full h-full flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[minmax(0,1fr)_auto] overflow-hidden \${`,
  `className={\`w-full h-full overflow-hidden \${isDesktop ? 'grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)_auto]' : 'flex flex-col'} \${`
);

// 6. Board wrapper
code = code.replace(
  `className="w-full flex-1 shrink min-h-0 min-w-0 flex items-center justify-center p-0 md:p-4 mb-2 md:mb-0 relative overflow-hidden md:w-auto md:col-start-1 md:row-start-1"`,
  `className={\`w-full shrink min-h-0 min-w-0 flex items-center justify-center relative overflow-hidden \${isDesktop ? 'p-4 mb-0 w-auto col-start-1 row-start-1' : 'flex-1 p-0 mb-2'}\`}`
);

// 7. Tabs wrapper
code = code.replace(
  `className="shrink-0 md:col-start-1 md:row-start-2 md:hidden flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-sm z-20 gap-2"`,
  `className={\`shrink-0 items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-sm z-20 gap-2 \${isDesktop ? 'hidden col-start-1 row-start-2' : 'flex'}\`}`
);

// 8. Horizontal Drawer
code = code.replace(
  `className={\`min-h-[0px] md:flex-1 md:col-start-2 md:row-start-1 md:row-span-2 md:min-h-0 md:h-full bg-slate-100 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shadow-inner w-full md:w-auto flex-col \${
          activeMobileTab === 'horizontal' ? \`flex flex-1 z-10 relative visible pointer-events-auto md:h-auto\` : 'hidden md:visible md:flex md:pointer-events-auto md:relative md:z-10 md:h-auto'
        }\`}`,
  `className={\`min-h-[0px] bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-inner flex-col \${
          isDesktop ? 'flex-1 col-start-2 row-start-1 row-span-2 min-h-0 h-full border-t-0 border-l w-auto visible flex pointer-events-auto relative z-10' 
                    : (activeMobileTab === 'horizontal' ? 'border-t w-full flex flex-1 z-10 relative visible pointer-events-auto' : 'hidden')
        }\`}`
);

code = code.replace(
  `className="flex-1 min-h-[0px] flex flex-col overflow-hidden relative md:overflow-x-auto md:overflow-y-hidden"`,
  `className={\`flex-1 min-h-[0px] flex flex-col relative \${isDesktop ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'}\`}`
);

// 9. Vertical Drawer
code = code.replace(
  `className={\`min-h-[0px] md:flex-1 md:col-start-1 md:row-start-2 md:min-h-0 md:h-full bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-inner w-full flex-col \${
          activeMobileTab === 'vertical' ? \`flex flex-1 z-10 relative visible pointer-events-auto md:h-auto\` : 'hidden md:visible md:flex md:pointer-events-auto md:relative md:z-10 md:h-auto'
        }\`}`,
  `className={\`min-h-[0px] bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-inner flex-col \${
          isDesktop ? 'flex-1 col-start-1 row-start-2 min-h-0 h-full border-t w-full visible flex pointer-events-auto relative z-10' 
                    : (activeMobileTab === 'vertical' ? 'border-t w-full flex flex-1 z-10 relative visible pointer-events-auto' : 'hidden')
        }\`}`
);

code = code.replace(
  `className="flex-1 min-h-[0px] flex flex-col overflow-hidden relative md:overflow-y-auto md:overflow-x-hidden md:custom-scrollbar"`,
  `className={\`flex-1 min-h-[0px] flex flex-col relative \${isDesktop ? 'overflow-y-auto overflow-x-hidden custom-scrollbar' : 'overflow-hidden'}\`}`
);

fs.writeFileSync('src/client/components/game/GamePage.tsx', code);
