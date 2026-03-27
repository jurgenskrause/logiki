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
  const p = clue.params;

  const conclude = action.type === 'confirm'
    ? `Therefore, ${actionIcon} must be here.`
    : `Therefore, ${actionIcon} cannot be here.`;

  switch (clue.type) {
    case 'VERTICAL_PAIR':
    case 'VERTICAL': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are in the same column. ${conclude}`;
    }
    case 'VERTICAL_NOT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are never in the same column. ${conclude}`;
    }
    case 'VERTICAL_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} all share a single column. ${conclude}`;
    }
    case 'VERTICAL_NOT_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} cannot all be in the same column. ${conclude}`;
    }
    case 'ADJACENT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are adjacent. ${conclude}`;
    }
    case 'LEFT_OF': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} is to the left of ${b}. ${conclude}`;
    }
    case 'SEQUENCE_THREE': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} are in this left-to-right order. ${conclude}`;
    }
    case 'GAPPED_NOT_MIDDLE':
    case 'GAPPED_EXCLUSION': {
      const [a, mid, b] = p.map(x => icon(x.row, x.item));
      return `${mid} is not between ${a} and ${b}. ${conclude}`;
    }
    case 'DISJUNCTIVE_XOR': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${c} shares a column with only one of ${a} or ${b}. ${conclude}`;
    }
    case 'ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is fixed at a different location. ${conclude}`;
    }
    case 'NEGATIVE_ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is blocked from this specific area. ${conclude}`;
    }
    default:
      return `A constraint rule applies. ${conclude}`;
  }
}

