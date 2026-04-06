import fs from 'fs';

// --- 1. HorizontalClueUI.tsx ---
let f1 = fs.readFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', 'utf8');

const renderContentH = `  const IconRender = ({ children, left, top = '50%', scale = 1, isSymbol = false }: any) => (
    <div 
      className={\`absolute transform -translate-x-1/2 -translate-y-1/2 leading-none flex items-center justify-center \${isSymbol ? 'text-slate-400 dark:text-slate-300 material-icons' : 'drop-shadow-sm'}\`}
      style={{ left, top, fontSize: isSymbol ? \`\${clueIconSize * 0.75 * scale}px\` : \`\${clueIconSize * scale}px\` }}
    >
      {children}
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="relative w-full h-full">
            <IconRender left="20%">{icons[0]}</IconRender>
            <IconRender left="50%" isSymbol>east</IconRender>
            <IconRender left="80%">{icons[1]}</IconRender>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="relative w-full h-full">
             <IconRender left="20%">{icons[0]}</IconRender>
             <IconRender left="50%" isSymbol>swap_horiz</IconRender>
             <IconRender left="80%">{icons[1]}</IconRender>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="relative w-full h-full">
            <IconRender left="15%">{icons[0]}</IconRender>
            <IconRender left="32.5%" isSymbol>swap_horiz</IconRender>
            <IconRender left="50%">{icons[1]}</IconRender>
            <IconRender left="67.5%" isSymbol>swap_horiz</IconRender>
            <IconRender left="85%">{icons[2]}</IconRender>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="relative w-full h-full">
            <IconRender left="15%">{icons[0]}</IconRender>
            <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
               <span className="drop-shadow-sm leading-none flex items-center" style={{ fontSize: \`\${clueIconSize}px\` }}>{icons[2]}</span>
               <div style={{ width: \`\${clueIconSize * 1.5}px\`, height: \`\${clueIconSize * 1.5}px\`, borderWidth: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div style={{ height: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-[-10%] w-[120%] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <IconRender left="85%">{icons[1]}</IconRender>
          </div>
        );
      default:
        // Generic dynamic fallback
        return (
          <div className="relative w-full h-full opacity-50">
            {icons.map((ic, i) => (
               <IconRender key={i} left={\`\${15 + (i * (70 / (icons.length - 1 || 1)))}%\`}>{ic}</IconRender>
            ))}
          </div>
        );
    }
  };`;

f1 = f1.replace(/  const renderContent = \(\) => \{[\s\S]*?    \}\n  \};/, renderContentH);

// Replace 4.8 / 2.2 metrics with strict 4.0 / 1.5 ratio!
f1 = f1.replace('style={{ width: `calc(${clueIconSize}px * 4.8)`, height: `calc(${clueIconSize}px * 2.2)`, fontSize: `${clueIconSize}px` }}', 'style={{ width: `calc(${clueIconSize}px * 4.0)`, height: `calc(${clueIconSize}px * 1.5)`, fontSize: `${clueIconSize}px` }}');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', f1);


// --- 2. VerticalClueUI.tsx ---
let f2 = fs.readFileSync('src/client/components/game/clue/VerticalClueUI.tsx', 'utf8');

const renderContentV = `  const IconRender = ({ children, left = '50%', top, scale = 1, isSymbol = false }: any) => (
    <div 
      className={\`absolute transform -translate-x-1/2 -translate-y-1/2 leading-none flex items-center justify-center \${isSymbol ? 'text-slate-400 dark:text-slate-300 material-icons' : 'drop-shadow-sm'}\`}
      style={{ left, top, fontSize: isSymbol ? \`\${clueIconSize * 0.75 * scale}px\` : \`\${clueIconSize * scale}px\` }}
    >
      {children}
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'VERTICAL':
      case 'VERTICAL_PAIR':
        return (
          <div className="relative w-full h-full">
            <IconRender top="20%">{icons[0]}</IconRender>
            <IconRender top="50%" isSymbol>link</IconRender>
            <IconRender top="80%">{icons[1]}</IconRender>
          </div>
        );
      case 'VERTICAL_NOT':
      case 'VERTICAL_NOT_PAIR':
        return (
          <div className="relative w-full h-full">
            <IconRender top="20%">{icons[0]}</IconRender>
            <IconRender top="50%" isSymbol scale={1.2}>link_off</IconRender>
            <IconRender top="80%">{icons[1]}</IconRender>
          </div>
        );
      case 'VERTICAL_TRIO':
        return (
          <div className="relative w-full h-full">
            <IconRender top="15%">{icons[0]}</IconRender>
            <IconRender top="50%">{icons[1]}</IconRender>
            <IconRender top="85%">{icons[2]}</IconRender>
          </div>
        );
      case 'VERTICAL_NOT_TRIO':
        return (
          <div className="relative w-full h-full">
            <IconRender top="15%">{icons[0]}</IconRender>
            <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
               <span className="drop-shadow-sm leading-none flex items-center" style={{ fontSize: \`\${clueIconSize}px\` }}>{icons[2]}</span>
               <div style={{ width: \`\${clueIconSize * 1.5}px\`, height: \`\${clueIconSize * 1.5}px\`, borderWidth: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div style={{ height: \`\${clueIconSize * 0.15}px\` }} className="absolute top-1/2 left-[-10%] w-[120%] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <IconRender top="85%">{icons[1]}</IconRender>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
        return (
          <div className="relative w-full h-full">
            <IconRender top="15%">{icons[0]}</IconRender>
            <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center" style={{ gap: \`calc(\${clueIconSize}px * 0.15)\` }}>
               <span className="drop-shadow-sm leading-none flex items-center" style={{ fontSize: \`\${clueIconSize}px\` }}>{icons[1]}</span>
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span style={{ fontSize: \`\${clueIconSize * 0.5}px\` }} className="material-icons text-blue-500 bg-white/90 dark:bg-slate-900/90 rounded-full p-0.5 shadow-xs border border-slate-200 dark:border-slate-700">sync</span>
               </div>
               <span className="drop-shadow-sm leading-none flex items-center" style={{ fontSize: \`\${clueIconSize}px\` }}>{icons[2]}</span>
            </div>
          </div>
        );
      default:
        // Generic dynamic fallback
        return (
          <div className="relative w-full h-full opacity-50">
            {icons.map((ic, i) => (
               <IconRender key={i} top={\`\${15 + (i * (70 / (icons.length - 1 || 1)))}%\`}>{ic}</IconRender>
            ))}
          </div>
        );
    }
  };`;

f2 = f2.replace(/  const renderContent = \(\) => \{[\s\S]*?    \}\n  \};/, renderContentV);

// Sync Strict 1.5W / 4.0H Dimensions!
f2 = f2.replace('style={{ width: `calc(${clueIconSize}px * 2.6)`, height: `calc(${clueIconSize}px * 4.6)`, fontSize: `${clueIconSize}px` }}', 'style={{ width: `calc(${clueIconSize}px * 1.5)`, height: `calc(${clueIconSize}px * 4.0)`, fontSize: `${clueIconSize}px` }}');
fs.writeFileSync('src/client/components/game/clue/VerticalClueUI.tsx', f2);

// --- 3. HorizontalClueList.tsx (Update Geometry constants) ---
let f3 = fs.readFileSync('src/client/components/game/clue/HorizontalClueList.tsx', 'utf8');
f3 = f3.replace('const currentH = clueIconSize * 2.2 + 2;', 'const currentH = clueIconSize * 1.5 + 2;');
f3 = f3.replace('actualCols * (clueIconSize * 4.8 + 2)', 'actualCols * (clueIconSize * 4.0 + 2)');
f3 = f3.replace('actualCols * (clueIconSize * 4.8 + 2)', 'actualCols * (clueIconSize * 4.0 + 2)');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', f3);

// --- 4. GamePage.tsx (Sync Geometry Constants in iterative loop) ---
let f4 = fs.readFileSync('src/client/components/game/GamePage.tsx', 'utf8');

const regexIter = /const P_w = C_h \* \(4\.8 \* candidateIc \+ candidateIc \* 0\.3\);\s*const P_h = R_h \* \(2\.2 \* candidateIc \+ candidateIc \* 0\.3\) \+ 32;\s*const V_w = numV \* \(2\.6 \* candidateIc \+ candidateIc \* 0\.3\);\s*const V_h = 4\.6 \* candidateIc;/

const replacerIter = `const P_w = C_h * (4.0 * candidateIc + candidateIc * 0.3);
             const P_h = R_h * (1.5 * candidateIc + candidateIc * 0.3) + 32;
             const V_w = numV * (1.5 * candidateIc + candidateIc * 0.3);
             const V_h = 4.0 * candidateIc;`

f4 = f4.replace(regexIter, replacerIter);
fs.writeFileSync('src/client/components/game/GamePage.tsx', f4);

