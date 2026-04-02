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
  const resultText = isConfirm ? 'must be here.' : 'cannot be here.';

  switch (clue.type) {
    case 'VERTICAL_PAIR':
    case 'VERTICAL': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} share the same column. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'VERTICAL_NOT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} can never be in the same column. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'VERTICAL_TRIO': {
      const symbols = p.map(x => icon(x.row, x.item));
      return `${symbols.join(', ')} all share the same column. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'VERTICAL_NOT_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a} and ${b} share a column, but ${c} is excluded. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'ADJACENT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are side-by-side. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'LEFT_OF': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} must be to the left of ${b}. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'SEQUENCE_THREE': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a} and ${b} and ${c} are in three adjacent columns. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'GAPPED_NOT_MIDDLE':
    case 'GAPPED_EXCLUSION': {
      const [a, c, b] = p.map(x => icon(x.row, x.item));
      if (targetIcon === b) {
        return `${b} cannot be directly between ${a} and ${c}. Therefore, ${targetIcon} cannot be here.`;
      }
      return `${a} and ${c} are exactly one column apart. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'DISJUNCTIVE_XOR': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${c} belongs with ${a} or ${b}, but not both. Therefore, ${targetIcon} ${resultText}`;
    }

    case 'ANCHOR': {
      return `${targetIcon} belongs in a specific fixed location. Therefore, it ${resultText}`;
    }

    case 'NEGATIVE_ANCHOR': {
      return `${targetIcon} is blocked from this specific region. Therefore, it ${resultText}`;
    }

    default:
      return `A logical constraint applies. Therefore, ${targetIcon} ${resultText}`;
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
      return `${a} and ${b} share the same column.`;
    }
    case 'VERTICAL_NOT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are never in the same column.`;
    }
    case 'VERTICAL_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a}, ${b}, and ${c} all share the same column.`;
    }
    case 'VERTICAL_NOT_TRIO': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a} and ${b} share a column, but ${c} is excluded.`;
    }
    case 'ADJACENT': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} and ${b} are side-by-side. A and B may be reversed.`;
    }
    case 'LEFT_OF': {
      const [a, b] = [icon(p[0].row, p[0].item), icon(p[1].row, p[1].item)];
      return `${a} must be to the left of ${b}.`;
    }
    case 'SEQUENCE_THREE': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${a} and ${b} and ${c} are in three adjacent columns, with ${b} in the middle. ${a} and ${c} may be reversed.`;
    }
    case 'GAPPED_NOT_MIDDLE':
    case 'GAPPED_EXCLUSION': {
      const [a, c, b] = p.map(x => icon(x.row, x.item));
      return `${a} and ${c} are separated by one column, ${b} cannot be in that column. A and C may be reversed.`;
    }
    case 'DISJUNCTIVE_XOR':
    case 'VERTICAL_DISJUNCTIVE_EXCLUSION': {
      const [a, b, c] = p.map(x => icon(x.row, x.item));
      return `${c} belongs with ${a} or ${b}, but not both.`;
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
