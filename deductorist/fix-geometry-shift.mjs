import fs from 'fs';

let f1 = fs.readFileSync('src/client/components/game/GamePage.tsx', 'utf8');

const hookIterTarget = `       if (isDesk) {
          let candidateIc = 50;
          let validIc = 16;
          const numH = hClues.length;
          const C_h = Math.max(1, Math.min(numH, 3));
          const R_h = Math.max(1, Math.ceil(numH / C_h));
          const numV = vClues.length;

          while (candidateIc >= 12) {
             const P_w = C_h * (4.0 * candidateIc + candidateIc * 0.3);
             const P_h = R_h * (1.5 * candidateIc + candidateIc * 0.3) + 32;
             const V_w = Math.max(1, numV) * (1.5 * candidateIc + candidateIc * 0.3);
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
             const rowsH = Math.max(1, Math.ceil(numH / colsH));
             const panelHH = rowsH * hH;
             
             const vW = 1.5 * candidateIc + gap;
             const vH = 4.0 * candidateIc + gap;
             const colsV = Math.max(1, Math.floor((viewport.width - 32) / vW));
             const rowsV = Math.max(1, Math.ceil(numV / colsV));
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
