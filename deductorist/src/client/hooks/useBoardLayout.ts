import { useMemo } from 'react';
import type { PuzzleManifest } from '../../shared/engine/ManifestLoader';

export function useBoardLayout(
  puzzle: PuzzleManifest | null,
  viewport: { width: number; height: number },
  activeMobileTab: 'horizontal' | 'vertical'
) {
  const MIN_BOARD_ICON_SIZE = 12;

  return useMemo(() => {
    const hasMouse = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    const isDesk = (!puzzle ? viewport.width >= 768 : (puzzle.rows <= 5 && viewport.width >= 500) || viewport.width >= 768);
    
    let optimalIconSize = 24;
    let finalDrawerHeight = 0;
    
    if (puzzle) {
       const N = puzzle.rows;
       const itemsPerRow = Math.ceil(Math.sqrt(N));
       const C1 = 0.6 / (N * itemsPerRow);
       const MIN_BOARD_SIZE = MIN_BOARD_ICON_SIZE / C1;
       
       const hClues = puzzle.clues.filter(c => ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(c.type));
       const vClues = puzzle.clues.filter(c => ['VERTICAL', 'VERTICAL_NOT', 'VERTICAL_TRIO', 'VERTICAL_NOT_TRIO', 'DISJUNCTIVE_XOR', 'VERTICAL_DISJUNCTIVE_EXCLUSION'].includes(c.type));
       
       if (isDesk) {
          const maxIcFor3Cols = Math.floor(((viewport.width - 32) / 12.9) * 2) / 2;
          let candidateIc = Math.min(50, maxIcFor3Cols);
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
                   const maxB_scale = candidateIc / (1.6 * C1);
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
          const maxAllowedWidth = viewport.width - 32;
          const maxIcFor3Cols = Math.floor((maxAllowedWidth / 12.6) * 2) / 2;
          let candidateIc = Math.min(60, maxIcFor3Cols);
          let validIc = 20; // Increased Mobile Floor limit
          let backupIc = 20;
          let backupDrawer = 0;
          let foundEquilibrium = false;
          
          const numH = hClues.length;
          const numV = vClues.length;
          
          const subCols = Math.ceil(puzzle.cols / 2);
          const boardAspectRatio = (puzzle.cols * subCols) / (puzzle.rows * 2);
          
          while (candidateIc >= 18) {
             const gap = candidateIc * 0.2; 
             const hW = 4.0 * candidateIc + gap;
             const hH = 1.5 * candidateIc + gap;
             const colsH = Math.max(1, Math.floor(maxAllowedWidth / hW));
             const rowsH = Math.max(1, Math.ceil(numH / colsH));
             const panelHH = rowsH * hH;
             
             const vW = 1.5 * candidateIc + gap;
             const vH = 4.0 * candidateIc + gap;
             const colsV = Math.max(1, Math.floor(maxAllowedWidth / vW));
             const rowsV = Math.max(1, Math.ceil(numV / colsV));
             const panelVH = rowsV * vH; 
             const pureUnhinderedPanelMaxHeight = Math.max(panelHH, panelVH) + 16;
             
             // Maximize mobile board to screen bounds
             const B = maxAllowedWidth; 
             
             const physicalBoardHeight = B / boardAspectRatio;
             const availableDrawerHeight = viewport.height - 130 - physicalBoardHeight;
             const minRequiredDrawer = hH + 16;
             const OPTIMAL_MIN_BOARD_SIZE = Math.min(MIN_BOARD_SIZE, maxAllowedWidth);
             
             if (B >= OPTIMAL_MIN_BOARD_SIZE && availableDrawerHeight >= minRequiredDrawer) {
                if (!backupDrawer && candidateIc <= 40) {
                    backupIc = candidateIc;
                    backupDrawer = availableDrawerHeight;
                }
                if (pureUnhinderedPanelMaxHeight <= availableDrawerHeight) {
                    validIc = candidateIc;
                    finalDrawerHeight = availableDrawerHeight;
                    foundEquilibrium = true;
                    break;
                }
             }
             candidateIc -= 0.5;
          }
          
          if (!foundEquilibrium) {
             validIc = backupDrawer ? backupIc : 18;
             finalDrawerHeight = backupDrawer || Math.max(200, viewport.height - 130 - (Math.min(MIN_BOARD_SIZE, maxAllowedWidth) / boardAspectRatio));
          }
          
          optimalIconSize = validIc;
       }
    }
    return { isDesktop: isDesk, clueIconSize: optimalIconSize, hasMouse, requiredDrawerHeight: finalDrawerHeight };
  }, [viewport.width, viewport.height, puzzle, activeMobileTab]);
}
