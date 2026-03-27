import { getFallbackEmoji } from '../utils/themeRegistry';
import type { ActiveClue } from './Solver';

/**
 * Translates an ActiveClue into a human-readable English string with emoji icons.
 * Used by the hint system to render clue descriptions for the player.
 */
export function describeClue(clue: ActiveClue): string {
  const icon = (row: number, item: number) => getFallbackEmoji(row, item);
  const p = clue.params;

  switch (clue.type) {
    case 'VERTICAL_PAIR':
    case 'VERTICAL': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      return `${a} and ${b} are in the same column.`;
    }
    case 'VERTICAL_NOT': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      return `${a} and ${b} are NOT in the same column.`;
    }
    case 'VERTICAL_TRIO': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      const c = icon(p[2].row, p[2].item);
      return `${a}, ${b}, and ${c} are all in the same column.`;
    }
    case 'VERTICAL_NOT_TRIO': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      const c = icon(p[2].row, p[2].item);
      return `${a}, ${b}, and ${c} are NOT all in the same column.`;
    }
    case 'ADJACENT': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      return `${a} and ${b} are in neighboring columns.`;
    }
    case 'LEFT_OF': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      return `${a} is somewhere to the left of ${b}.`;
    }
    case 'SEQUENCE_THREE': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      const c = icon(p[2].row, p[2].item);
      return `${a}, ${b}, and ${c} appear in this exact left-to-right order.`;
    }
    case 'GAPPED_NOT_MIDDLE':
    case 'GAPPED_EXCLUSION': {
      const a = icon(p[0].row, p[0].item);
      const mid = icon(p[1].row, p[1].item);
      const b = icon(p[2].row, p[2].item);
      return `${mid} is NOT between ${a} and ${b}.`;
    }
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
    case 'DISJUNCTIVE_XOR': {
      const a = icon(p[0].row, p[0].item);
      const b = icon(p[1].row, p[1].item);
      const c = icon(p[2].row, p[2].item);
      return `${c} is with either ${a} or ${b}, but not both.`;
    }
    case 'ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is fixed at column ${(clue.targetCol ?? 0) + 1}.`;
    }
    case 'NEGATIVE_ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is NOT in column ${(clue.targetCol ?? 0) + 1}.`;
    }
    default:
      return `Clue type "${clue.type}" provides a logical constraint.`;
  }
}
