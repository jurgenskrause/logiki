import fs from 'fs';

// --- 1. GamePage.tsx ---
let f1 = fs.readFileSync('src/client/components/game/GamePage.tsx', 'utf8');

const hook1 = `  const { isDesktop, clueIconSize } = useMemo(() => {
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

const target1 = `  const MIN_BOARD_ICON_SIZE = 12;
  const { isDesktop, clueIconSize, hasMouse } = useMemo(() => {
    const hasMouse = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    const isDesk = (!puzzle ? viewport.width >= 768 : (puzzle.rows <= 5 && viewport.width >= 500) || viewport.width >= 768);
    
    let optimalIconSize = 24;
    if (puzzle) {
       const N = puzzle.rows;
       const itemsPerRow = Math.ceil(Math.sqrt(N));
       const C1 = 0.6 / (N * itemsPerRow);
       const MIN_BOARD_SIZE = MIN_BOARD_ICON_SIZE / C1;
       
       const hClues = puzzle.clues.filter(c => ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(c.type));
       const vClues = puzzle.clues.filter(c => ['VERTICAL', 'VERTICAL_NOT', 'VERTICAL_TRIO', 'VERTICAL_NOT_TRIO', 'DISJUNCTIVE_XOR', 'VERTICAL_DISJUNCTIVE_EXCLUSION'].includes(c.type));
       
       if (isDesk) {
          let candidateIc = 50;
          let validIc = 16;
          const numH = hClues.length;
          const C_h = Math.min(numH, 3);
          const R_h = Math.ceil(numH / C_h) || 1;
          const numV = vClues.length;

          while (candidateIc >= 12) {
             const P_w = C_h * (4.8 * candidateIc + candidateIc * 0.3);
             const P_h = R_h * (2.2 * candidateIc + candidateIc * 0.3) + 32;
             const V_w = numV * (2.6 * candidateIc + candidateIc * 0.3);
             const V_h = 4.6 * candidateIc;
             
             if (P_h <= viewport.height && P_w < viewport.width) {
                const availCol1Width = viewport.width - P_w - 32;
                if (V_w <= availCol1Width) {
                   const maxB_geo = Math.min(availCol1Width, Math.max(0, viewport.height - V_h - 40));
                   const maxB_scale = candidateIc / (2 * C1);
                   const B = Math.min(maxB_geo, maxB_scale);
                   
                   if (B >= MIN_BOARD_SIZE) {
                      validIc = candidateIc;
                      break;
                   }
                }
             }
             candidateIc -= 0.5;
          }
          optimalIconSize = validIc;
       } else {
          const estBoardSize = Math.min(viewport.width - 32, viewport.height * 0.55);
          optimalIconSize = Math.max((estBoardSize * C1) * 2, 16);
          optimalIconSize = Math.min(optimalIconSize, 28);
       }
    }
    return { isDesktop: isDesk, clueIconSize: optimalIconSize, hasMouse };
  }, [viewport.width, viewport.height, puzzle]);`;

f1 = f1.replace(hook1, target1);

f1 = f1.replace(/<HorizontalClueList isDesktop={isDesktop} clueIconSize={clueIconSize}/g, '<HorizontalClueList isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse}');
f1 = f1.replace(/<VerticalClueList isDesktop={isDesktop} clueIconSize={clueIconSize}/g, '<VerticalClueList isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse}');
fs.writeFileSync('src/client/components/game/GamePage.tsx', f1);

// --- 2. HorizontalClueList.tsx ---
let f2 = fs.readFileSync('src/client/components/game/clue/HorizontalClueList.tsx', 'utf8');
f2 = f2.replace('clueIconSize?: number;', 'clueIconSize?: number;\n  hasMouse?: boolean;');
f2 = f2.replace('clueIconSize = 24 }) => {', 'clueIconSize = 24, hasMouse = false }) => {');
f2 = f2.replace(/<HorizontalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize}/g, '<HorizontalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse}');

f2 = f2.replace(
  `            <div \n              className="w-full h-full grid gap-0.5 overflow-hidden"\n              style={{\n                gridTemplateRows: \`repeat(\${maxCluesPerColumn}, minmax(0, 1fr))\`,\n                gridTemplateColumns: \`repeat(\${actualCols}, minmax(0, 1fr))\`,\n                gridAutoFlow: 'column'\n              }}\n            >`,
  `            <div className="flex flex-col flex-wrap content-start justify-start gap-1 w-full h-full">`
);
fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', f2);

// --- 3. VerticalClueList.tsx ---
let f3 = fs.readFileSync('src/client/components/game/clue/VerticalClueList.tsx', 'utf8');
f3 = f3.replace('clueIconSize?: number;', 'clueIconSize?: number;\n  hasMouse?: boolean;');
f3 = f3.replace('clueIconSize = 24 }) => {', 'clueIconSize = 24, hasMouse = false }) => {');
f3 = f3.replace(/<VerticalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize}/g, '<VerticalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse}');
f3 = f3.replace('justify-center gap-0.5', 'justify-start gap-0.5'); // Flush alignment
fs.writeFileSync('src/client/components/game/clue/VerticalClueList.tsx', f3);

// --- 4. HorizontalClueUI.tsx ---
let f4 = fs.readFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', 'utf8');
f4 = f4.replace('clueIconSize?: number;', 'clueIconSize?: number;\n  hasMouse?: boolean;');
f4 = f4.replace('clueIconSize = 24 }) => {', 'clueIconSize = 24, hasMouse = false }) => {');
f4 = f4.replace(/\${isDesktop \? "hidden" : "flex"}/g, '${isDesktop || hasMouse ? "hidden" : "flex"}');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', f4);

// --- 5. VerticalClueUI.tsx ---
let f5 = fs.readFileSync('src/client/components/game/clue/VerticalClueUI.tsx', 'utf8');
f5 = f5.replace('clueIconSize?: number;', 'clueIconSize?: number;\n  hasMouse?: boolean;');
f5 = f5.replace('clueIconSize = 24 }) => {', 'clueIconSize = 24, hasMouse = false }) => {');
f5 = f5.replace(/\${isDesktop \? "hidden" : "flex"}/g, '${isDesktop || hasMouse ? "hidden" : "flex"}');
fs.writeFileSync('src/client/components/game/clue/VerticalClueUI.tsx', f5);
