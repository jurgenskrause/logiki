import fs from 'fs';

// --- HorizontalClueUI.tsx ---
let f1 = fs.readFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', 'utf8');

const renderHContent = `  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="flex items-center justify-center w-full h-full" style={{ gap: \`calc(\${clueIconSize}px * 0.5)\`, paddingRight: isDesktop ? 0 : "1.5rem" }}>
            <span className="drop-shadow-sm leading-none flex items-center">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300" style={{ fontSize: \`\${clueIconSize * 0.75}px\` }}>east</span>
            <span className="drop-shadow-sm leading-none flex items-center">{icons[1]}</span>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="flex items-center justify-center w-full h-full" style={{ gap: \`calc(\${clueIconSize}px * 0.4)\`, paddingRight: isDesktop ? 0 : "1.5rem" }}>
             <span className="drop-shadow-sm leading-none flex items-center">{icons[0]}</span>
             <span className="material-icons text-slate-400 dark:text-slate-300" style={{ fontSize: \`\${clueIconSize * 0.75}px\` }}>swap_horiz</span>
             <span className="drop-shadow-sm leading-none flex items-center">{icons[1]}</span>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="flex items-center justify-center w-full h-full" style={{ gap: \`calc(\${clueIconSize}px * 0.3)\`, paddingRight: isDesktop ? 0 : "1.5rem" }}>
            <span className="drop-shadow-sm leading-none flex items-center">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300" style={{ fontSize: \`\${clueIconSize * 0.75}px\` }}>swap_horiz</span>
            <span className="drop-shadow-sm leading-none flex items-center">{icons[1]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300" style={{ fontSize: \`\${clueIconSize * 0.75}px\` }}>swap_horiz</span>
            <span className="drop-shadow-sm leading-none flex items-center">{icons[2]}</span>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="flex items-center justify-center w-full h-full" style={{ gap: \`calc(\${clueIconSize}px * 0.35)\`, paddingRight: isDesktop ? 0 : "1.5rem" }}>
            <span className="drop-shadow-sm leading-none flex items-center">{icons[0]}</span>
            <div className="relative mx-1 md:mx-2 flex items-center justify-center">
               <span className="drop-shadow-sm leading-none flex items-center">{icons[2]}</span>
               <div style={{ width: \`\${clueIconSize * 1.5}px\`, height: \`\${clueIconSize * 1.5}px\`, borderWidth: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div style={{ height: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-[-10%] w-[120%] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <span className="drop-shadow-sm leading-none flex items-center">{icons[1]}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="leading-none flex items-center">{ic}</span>)}
          </div>
        );
    }
  };`;

f1 = f1.replace(/  const renderContent = \(\) => \{[\s\S]*?    \}\n  \};/, renderHContent);

f1 = f1.replace('{...(isDesktop && dragHandleProps ? dragHandleProps : {})}', '{...(hasMouse && dragHandleProps ? dragHandleProps : {})}');
f1 = f1.replace('{...(!isDesktop && dragHandleProps ? dragHandleProps : {})}', '{...(!hasMouse && dragHandleProps ? dragHandleProps : {})}');
f1 = f1.replace('isDesktop || hasMouse ? "hidden" : "flex"', 'hasMouse ? "hidden" : "flex"');

fs.writeFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', f1);

// --- VerticalClueUI.tsx ---
let f2 = fs.readFileSync('src/client/components/game/clue/VerticalClueUI.tsx', 'utf8');

const renderVContent = `  const renderContent = () => {
    const iconClass = \`drop-shadow-sm leading-none flex items-center justify-center\`;
    const vPad = isDesktop ? 'py-2' : 'pt-1 pb-4';
    
    switch (type) {
      case 'VERTICAL':
      case 'VERTICAL_PAIR':
        return (
          <div className={\`flex flex-col items-center justify-around w-full h-full \${vPad}\`}>
            <span className={iconClass}>{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 leading-none" style={{ fontSize: \`\${clueIconSize * 0.75}px\` }}>link</span>
            <span className={iconClass}>{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_NOT':
      case 'VERTICAL_NOT_PAIR':
        return (
          <div className={\`flex flex-col items-center justify-around w-full h-full \${vPad}\`}>
            <span className={iconClass}>{icons[0]}</span>
            <span className="material-icons text-red-500 leading-none" style={{ fontSize: \`\${clueIconSize * 0.75}px\` }}>link_off</span>
            <span className={iconClass}>{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_TRIO':
        return (
          <div className={\`flex flex-col items-center justify-around w-full h-full \${vPad}\`}>
            <span className={iconClass}>{icons[0]}</span>
            <span className={iconClass}>{icons[1]}</span>
            <span className={iconClass}>{icons[2]}</span>
          </div>
        );
      case 'VERTICAL_NOT_TRIO':
        return (
          <div className={\`flex flex-col items-center justify-around w-full h-full \${vPad}\`}>
            <span className={iconClass}>{icons[0]}</span>
            <div className="relative flex items-center justify-center">
               <span className={iconClass}>{icons[2]}</span>
               <div style={{ width: \`\${clueIconSize * 1.5}px\`, height: \`\${clueIconSize * 1.5}px\`, borderWidth: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div style={{ height: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-[-10%] w-[120%] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <span className={iconClass}>{icons[1]}</span>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
        return (
          <div className={\`flex flex-col items-center justify-around w-full h-full \${vPad}\`}>
            <span className={iconClass}>{icons[0]}</span>
            <div className="relative flex flex-col items-center justify-center" style={{ gap: \`calc(\${clueIconSize}px * 0.15)\` }}>
               <span className={iconClass}>{icons[1]}</span>
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span style={{ fontSize: \`\${clueIconSize * 0.5}px\` }} className="material-icons text-blue-500 bg-white/90 dark:bg-slate-900/90 rounded-full p-0.5 shadow-xs border border-slate-200 dark:border-slate-700">sync</span>
               </div>
               <span className={iconClass}>{icons[2]}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="leading-none flex items-center">{ic}</span>)}
          </div>
        );
    }
  };`;

f2 = f2.replace(/  const renderContent = \(\) => \{[\s\S]*?    \}\n  \};/, renderVContent);

f2 = f2.replace(
  "className={`${isDesktop ? 'w-24 h-[168px]' : 'w-20 h-[120px]'} bg-white dark:bg-slate-800 rounded-lg shadow-md hover:border-indigo-500 group flex items-center justify-center shrink-0 select-none ${",
  "style={{ width: `calc(${clueIconSize}px * 2.6)`, height: `calc(${clueIconSize}px * 4.6)`, fontSize: `${clueIconSize}px` }}\\n      className={`bg-white dark:bg-slate-800 rounded-lg shadow-md hover:border-indigo-500 group flex items-center justify-center shrink-0 select-none ${"
);

f2 = f2.replace('{...(isDesktop && dragHandleProps ? dragHandleProps : {})}', '{...(hasMouse && dragHandleProps ? dragHandleProps : {})}');
f2 = f2.replace('{...(!isDesktop && dragHandleProps ? dragHandleProps : {})}', '{...(!hasMouse && dragHandleProps ? dragHandleProps : {})}');
f2 = f2.replace('isDesktop || hasMouse ? "hidden" : "flex"', 'hasMouse ? "hidden" : "flex"');

fs.writeFileSync('src/client/components/game/clue/VerticalClueUI.tsx', f2);
