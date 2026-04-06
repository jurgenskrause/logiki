import fs from 'fs';

// --- 1. GamePage.tsx ---
let f1 = fs.readFileSync('src/client/components/game/GamePage.tsx', 'utf8');

const hookIterTarget = `       if (isDesk) {
          let candidateIc = 50;
          let validIc = 16;
          const numH = hClues.length;
          const C_h = Math.min(numH, 3);
          const R_h = Math.ceil(numH / C_h) || 1;
          const numV = vClues.length;

          while (candidateIc >= 12) {
             const P_w = C_h * (4.0 * candidateIc + candidateIc * 0.3);
             const P_h = R_h * (1.5 * candidateIc + candidateIc * 0.3) + 32;
             const V_w = numV * (1.5 * candidateIc + candidateIc * 0.3);
             const V_h = 4.0 * candidateIc;
             
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
          let candidateIc = 40;
          let validIc = 20; // Increased Mobile Floor limit
          const numH = hClues.length;
          const numV = vClues.length;
          
          while (candidateIc >= 18) {
             const gap = candidateIc * 0.2; 
             const hW = 4.0 * candidateIc + gap;
             const hH = 1.5 * candidateIc + gap;
             const colsH = Math.max(1, Math.floor((viewport.width - 32) / hW));
             const rowsH = Math.ceil(numH / colsH);
             const panelHH = rowsH * hH;
             
             const vW = 1.5 * candidateIc + gap;
             const vH = 4.0 * candidateIc + gap;
             const colsV = Math.max(1, Math.floor((viewport.width - 32) / vW));
             const rowsV = Math.ceil(numV / colsV);
             const panelVH = rowsV * vH;
             
             const requiredDrawerHeight = Math.max(panelHH, panelVH) + 60;
             const maxB_geo = viewport.height - requiredDrawerHeight - 40;
             const maxB_width = viewport.width - 32;
             const maxB_scale = candidateIc / (2 * C1);
             const B = Math.min(maxB_width, Math.min(maxB_geo, maxB_scale));
             
             if (B >= MIN_BOARD_SIZE) {
                validIc = candidateIc;
                break;
             }
             candidateIc -= 0.5;
          }
          optimalIconSize = validIc;
       }`;

f1 = f1.replace(/       if \(isDesk\) \{[\s\S]*?       \} else \{[\s\S]*?       \}/, hookIterTarget);

fs.writeFileSync('src/client/components/game/GamePage.tsx', f1);

// --- 2. HorizontalClueList.tsx ---
let f2 = fs.readFileSync('src/client/components/game/clue/HorizontalClueList.tsx', 'utf8');

const listHTarget = `  return (
    <div 
      className="flex-1 min-h-[0px] h-full flex flex-col pointer-events-auto"
    >
      <div 
        ref={containerRef}
        className={\`flex-1 w-full flex relative \${isDesktop ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden pb-4'}\`}
      >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          {isDesktop ? (
            <div className="flex flex-col flex-wrap content-start justify-start w-full h-full" style={{ gap: \`calc(\${clueIconSize}px * 0.2)\` }}>
              {orderedClues.map((item) => (
                <SortableClueWrapper key={item.id} id={item.id}>
                  <HorizontalClueUI
                    clue={item}
                    isDesktop={isDesktop}
                    clueIconSize={clueIconSize}
                    hasMouse={hasMouse}
                    isHighlighted={highlightedClue === item.id}
                    isBinned={binnedIds.has(item.id)}
                    onHover={onClueHover}
                    onDiscard={onClueToggleBin}
                    onDoubleTap={() => scrollToClueId?.(item.id)}
                    dragHandleProps={{ onPointerDown: (e: any) => onMoveClue?.(item.id, e) }}
                  />
                </SortableClueWrapper>
              ))}
            </div>
          ) : (
            <div className="flex flex-row flex-wrap content-start justify-center w-full h-max mx-auto px-2" style={{ gap: \`calc(\${clueIconSize}px * 0.2)\` }}>
              {orderedClues.map((item) => (
                <SortableClueWrapper key={item.id} id={item.id}>
                  <HorizontalClueUI
                    clue={item}
                    isDesktop={isDesktop}
                    clueIconSize={clueIconSize}
                    hasMouse={hasMouse}
                    isHighlighted={highlightedClue === item.id}
                    isBinned={binnedIds.has(item.id)}
                    onHover={onClueHover}
                    onDiscard={onClueToggleBin}
                    onDoubleTap={() => scrollToClueId?.(item.id)}
                    dragHandleProps={{ onPointerDown: (e: any) => onMoveClue?.(item.id, e) }}
                  />
                </SortableClueWrapper>
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );`;

f2 = f2.replace(/  return \([\s\S]*?\);\n\};/, listHTarget + '\n};');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', f2);

// --- 3. VerticalClueList.tsx ---
let f3 = fs.readFileSync('src/client/components/game/clue/VerticalClueList.tsx', 'utf8');

const listVTarget = `  return (
    <div 
      ref={containerRef}
      title="VerticalClueList: outer containerRef"
      className={\`flex-1 w-full min-h-[0px] flex \${isDesktop ? 'px-1 py-1 overflow-y-auto overflow-x-hidden custom-scrollbar' : 'overflow-y-auto overflow-x-hidden pb-4'} relative\`}
    >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          <div 
             className={\`flex flex-row flex-wrap content-start w-full h-max mx-auto \${isDesktop ? 'justify-start px-2 py-2' : 'justify-center px-2'}\`} 
             style={{ gap: \`calc(\${clueIconSize}px * 0.2)\` }}
          >
               {orderedClues.map((item) => (
                 <SortableClueWrapper key={item.id} id={item.id}>
                   <VerticalClueUI 
                     clue={item} 
                     isDesktop={isDesktop}
                     clueIconSize={clueIconSize}
                     hasMouse={hasMouse}
                     isHighlighted={highlightedClue === item.id}
                     isBinned={binnedIds.has(item.id)}
                     onHover={onClueHover}
                     onDiscard={onClueToggleBin}
                     onDoubleTap={() => scrollToClueId?.(item.id)}
                     dragHandleProps={{ onPointerDown: (e: any) => onMoveClue?.(item.id, e) }}
                   />
                 </SortableClueWrapper>
               ))}
          </div>
        </SortableContext>
    </div>
  );`;

f3 = f3.replace(/  return \([\s\S]*?\);\n\};/, listVTarget + '\n};');
fs.writeFileSync('src/client/components/game/clue/VerticalClueList.tsx', f3);
