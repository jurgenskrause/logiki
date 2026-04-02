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
  const targetIcon = icon(action.row, action.itemIndex);
  const p = clue.params;

  const isConfirm = action.type === 'confirm';

  switch (clue.type) {
    case 'VERTICAL_PAIR':
    case 'VERTICAL': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      if (isConfirm) {
        return `${a} and ${b} share a column. Since one is here, the other must be too.`;
      }
      return `${a} and ${b} share a column. Since ${a === targetIcon ? b : a} is blocked here, ${targetIcon} is also blocked.`;
    }

    case 'VERTICAL_NOT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      const other = targetIcon === a ? b : a;
      return `${a} and ${b} are never in the same column. Since ${other} already claimed this spot, ${targetIcon} must be elsewhere.`;
    }

    case 'VERTICAL_TRIO': {
      const symbols = p.map(x => icon(x.row, x.item));
      if (isConfirm) {
        return `${symbols.join(', ')} all share a single column. One has been solved here, so the others must follow.`;
      }
      return `${symbols.join(', ')} are locked into a single column. Since one cannot be here, none of them can.`;
    }

    case 'VERTICAL_NOT_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      if (targetIcon === c) {
        return `${a} and ${b} share a column, but ${c} is explicitly excluded from their column.`;
      }
      return `${a} and ${b} are together, but separate from ${c}. This logic restricts ${targetIcon} here.`;
    }

    case 'ADJACENT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      if (isConfirm) {
        return `${a} and ${b} are neighbors. Since this is the only spot where they can be side-by-side, ${targetIcon} is now fixed.`;
      }
      return `${a} and ${b} must be right next to each other. This cell has no valid neighboring spot for ${targetIcon === a ? b : a}.`;
    }

    case 'LEFT_OF': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      if (targetIcon === a) {
        return `${a} stays to the left of ${b}. This spot is too far right for ${a} to leave room for its partner.`;
      }
      return `${b} stays to the right of ${a}. This spot is too far left for ${b} to have ${a} on its left.`;
    }

    case 'SEQUENCE_THREE': {
      const [a, mid, c] = p.map(x => icon(x.row, x.item));
      if (targetIcon === mid) {
        return `${mid} is always between ${a} and ${c}, occupying the center of their three-column span.`;
      }
      return `To fit the sequential order ${a}-${mid}-${c}, this item needs room for neighbors on both sides.`;
    }

    case 'GAPPED_NOT_MIDDLE':
    case 'GAPPED_EXCLUSION': {
      const [a, c, b] = p.map(x => icon(x.row, x.item)); // Convention: A, C are edges, B is forbidden middle
      const prefix = `${a} and ${c} are one column apart, and ${b} is not in that column.`;
      
      if (isConfirm) {
        return `${prefix} Therefore, ${targetIcon} must be here.`;
      }
      return `${prefix} Therefore, ${targetIcon} cannot be here.`;
    }

    case 'DISJUNCTIVE_XOR': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${c} belongs with either ${a} or ${b}, but never both. This restriction forces ${targetIcon} out of this spot.`;
    }

    case 'ANCHOR': {
      return `${targetIcon} belongs in a specific fixed location defined by the puzzle start.`;
    }

    case 'NEGATIVE_ANCHOR': {
      return `${targetIcon} is explicitly restricted from occupying this specific region.`;
    }

    default:
      return `A logical constraint for ${targetIcon} applies here. ${isConfirm ? 'Therefore, it must be here.' : 'Therefore, it is blocked.'}`;
  }
}

/**
 * Describes the STATIC RULE defined by the clue, without a specific conclusion.
 */
export function describeRule(clue: ActiveClue): string {
  const icon = (row: number, item: number) => getFallbackEmoji(row, item);
  const p = clue.params;

  switch (clue.type) {
    case 'VERTICAL_PAIR':
    case 'VERTICAL': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are in the same column.`;
    }
    case 'VERTICAL_NOT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are never in the same column.`;
    }
    case 'VERTICAL_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} all share a single column.`;
    }
    case 'VERTICAL_NOT_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a} and ${b} are in the same column, but ${c} is not in that column.`;
    }
    case 'ADJACENT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are adjacent.`;
    }
    case 'LEFT_OF': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} is to the left of ${b}.`;
    }
    case 'SEQUENCE_THREE': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${b} is between ${a} and ${c}.`;
    }
    case 'GAPPED_NOT_MIDDLE':
    case 'GAPPED_EXCLUSION': {
      const [a, c, b] = p.map(x => icon(x.row, x.item));
      return `${a} and ${c} are one column apart, and ${b} is not in that column.`;
    }
    case 'DISJUNCTIVE_XOR':
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${c} is in the same column as ${a} or ${b}, but not both.`;
    }
    case 'ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is at a specific fixed location.`;
    }
    case 'NEGATIVE_ANCHOR': {
      const a = icon(p[0].row, p[0].item);
      return `${a} is blocked from a specific area.`;
    }
    default:
      return `A constraint rule applies.`;
  }
}
