import { getFallbackEmoji } from '../utils/themeRegistry';
import type { ActiveClue } from './Solver';

export interface HintAction {
  cellId: string;
  row: number;
  col: number;
  itemIndex: number;
  type: 'eliminate' | 'confirm';
}

/**
 * Describes the SPECIFIC deduction being made: what was concluded and why.
 * Text is reversible — it reflects the actual conclusion (the action), not just the rule.
 */
export function describeDeduction(clue: ActiveClue, action: HintAction): string {
  const icon = (row: number, item: number) => getFallbackEmoji(row, item);
  const actionIcon = icon(action.row, action.itemIndex);
  const col1 = action.col + 1; // 1-indexed for display
  const p = clue.params;

  const conclude = action.type === 'confirm'
    ? `${actionIcon} must be in column ${col1}.`
    : `${actionIcon} cannot be in column ${col1}.`;

  switch (clue.type) {
    case 'VERTICAL_PAIR':
    case 'VERTICAL': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} must be in the same column. ${conclude}`;
    }
    case 'VERTICAL_NOT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} cannot be in the same column. ${conclude}`;
    }
    case 'VERTICAL_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} all share a column. ${conclude}`;
    }
    case 'VERTICAL_NOT_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} cannot all share a column. ${conclude}`;
    }
    case 'ADJACENT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} is exactly one column away from ${b}. ${conclude}`;
    }
    case 'LEFT_OF': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} must be somewhere to the left of ${b}. ${conclude}`;
    }
    case 'SEQUENCE_THREE': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} appear in this exact left-to-right order. ${conclude}`;
    }
    case 'GAPPED_NOT_MIDDLE':
    case 'GAPPED_EXCLUSION': {
      // params: [outer1, notMiddle, outer2]
      const [a, mid, b] = p.map(x => icon(x.row, x.item));
      return `${mid} cannot be between ${a} and ${b}. ${conclude}`;
    }
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
    case 'DISJUNCTIVE_XOR': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${c} shares a column with exactly one of ${a} or ${b}, not both. ${conclude}`;
    }
    case 'ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is fixed at column ${(clue.targetCol ?? 0) + 1}. ${conclude}`;
    }
    case 'NEGATIVE_ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is excluded from column ${(clue.targetCol ?? 0) + 1}. ${conclude}`;
    }
    default:
      return `A constraint eliminates a possibility. ${conclude}`;
  }
}
