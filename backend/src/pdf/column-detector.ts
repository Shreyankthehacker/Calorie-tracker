import { matchHeader } from './header-aliases.js';
import type {
  CanonicalField,
  DetectedColumn,
  DiaryParseWarning,
  HeaderMatchType,
  ReconstructedRow,
} from './types.js';

export { matchHeader, matchHeaderKey, normalizeHeaderForMatch } from './header-aliases.js';

const MATCH_RANK: Record<HeaderMatchType, number> = {
  exact: 3,
  alias: 2,
  pattern: 1,
  unknown: 0,
};

function isMapped(column: DetectedColumn): column is DetectedColumn & { canonicalField: CanonicalField } {
  return column.canonicalField !== null;
}

function pickWinners(columns: DetectedColumn[]): Map<CanonicalField, DetectedColumn> {
  const grouped = new Map<CanonicalField, DetectedColumn[]>();
  for (const column of columns) {
    if (!isMapped(column)) {
      continue;
    }
    const list = grouped.get(column.canonicalField) ?? [];
    list.push(column);
    grouped.set(column.canonicalField, list);
  }

  const winners = new Map<CanonicalField, DetectedColumn>();
  for (const [field, candidates] of grouped) {
    const ranked = candidates.slice().sort((left, right) => {
      const rankDiff = MATCH_RANK[right.matchType] - MATCH_RANK[left.matchType];
      if (rankDiff !== 0) {
        return rankDiff;
      }
      const confidenceDiff = right.confidence - left.confidence;
      if (confidenceDiff !== 0) {
        return confidenceDiff;
      }
      return left.x - right.x;
    });
    const winner = ranked[0];
    if (winner) {
      winners.set(field, winner);
    }
  }
  return winners;
}

export function detectColumns(rows: ReconstructedRow[]): {
  headerRowIndex: number;
  columns: DetectedColumn[];
  winners: Map<CanonicalField, DetectedColumn>;
  warnings: DiaryParseWarning[];
} | null {
  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    const row = rows[index];
    if (!row) {
      continue;
    }
    const columns: DetectedColumn[] = row.cells.map((cell) => {
      const match = matchHeader(cell.text);
      return {
        originalHeader: match.originalHeader,
        normalizedHeader: match.normalizedHeader,
        canonicalField: match.canonicalField,
        confidence: match.confidence,
        matchType: match.matchType,
        x: cell.x + cell.width / 2,
      };
    });
    const winners = pickWinners(columns);
    const mappedCount = winners.size;
    const hasFood = winners.has('foodName');
    const hasCalories = winners.has('calories');
    if (hasFood && (hasCalories || mappedCount >= 3)) {
      const warnings: DiaryParseWarning[] = [];
      for (const column of columns) {
        if (!column.canonicalField) {
          warnings.push({
            type: 'UNKNOWN_COLUMN',
            column: column.originalHeader,
            message: `Column could not be mapped to a supported FoodEntry field.`,
          });
        }
      }
      const grouped = new Map<CanonicalField, DetectedColumn[]>();
      for (const column of columns) {
        if (!column.canonicalField) {
          continue;
        }
        const list = grouped.get(column.canonicalField) ?? [];
        list.push(column);
        grouped.set(column.canonicalField, list);
      }
      for (const [field, candidates] of grouped) {
        if (candidates.length < 2) {
          continue;
        }
        warnings.push({
          type: 'DUPLICATE_COLUMN_MAPPING',
          columns: candidates.map((column) => column.originalHeader),
          canonicalField: field,
          message: `Multiple columns mapped to ${field}.`,
        });
      }
      return { headerRowIndex: index, columns, winners, warnings };
    }
  }
  return null;
}

export function assignCellsToColumns(
  row: ReconstructedRow,
  columns: DetectedColumn[],
  columnTolerance = 48,
): Partial<Record<CanonicalField, string>> {
  const winners = pickWinners(columns);
  const assigned: Partial<Record<CanonicalField, string>> = {};
  for (const cell of row.cells) {
    const center = cell.x + cell.width / 2;
    let best: DetectedColumn | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const column of columns) {
      const distance = Math.abs(column.x - center);
      if (distance < bestDistance) {
        best = column;
        bestDistance = distance;
      }
    }
    if (!best || bestDistance > columnTolerance || !best.canonicalField) {
      continue;
    }
    const winner = winners.get(best.canonicalField);
    if (winner !== best) {
      continue;
    }
    assigned[best.canonicalField] = assigned[best.canonicalField]
      ? `${assigned[best.canonicalField]} ${cell.text}`
      : cell.text;
  }
  return assigned;
}
