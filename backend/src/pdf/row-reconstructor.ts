import type { PdfTextBlock, ReconstructedCell, ReconstructedRow } from './types.js';
import { ROW_Y_TOLERANCE } from './text-normalizer.js';

export function reconstructRows(
  blocks: PdfTextBlock[],
  rowTolerance = ROW_Y_TOLERANCE,
): ReconstructedRow[] {
  const byPage = new Map<number, PdfTextBlock[]>();
  for (const block of blocks) {
    const list = byPage.get(block.page) ?? [];
    list.push(block);
    byPage.set(block.page, list);
  }

  const rows: ReconstructedRow[] = [];
  const pages = [...byPage.keys()].sort((a, b) => a - b);
  for (const page of pages) {
    const pageBlocks = (byPage.get(page) ?? []).slice().sort((a, b) => b.y - a.y || a.x - b.x);
    const buckets: PdfTextBlock[][] = [];
    for (const block of pageBlocks) {
      const bucket = buckets.find((candidate) =>
        candidate.some((existing) => Math.abs(existing.y - block.y) <= rowTolerance),
      );
      if (bucket) {
        bucket.push(block);
      } else {
        buckets.push([block]);
      }
    }

    for (const bucket of buckets) {
      const cells: ReconstructedCell[] = bucket
        .slice()
        .sort((a, b) => a.x - b.x)
        .map((item) => ({
          text: item.text,
          x: item.x,
          y: item.y,
          width: item.width,
        }));
      const y = cells.reduce((sum, cell) => sum + cell.y, 0) / Math.max(cells.length, 1);
      rows.push({
        page,
        y,
        cells,
        text: cells.map((cell) => cell.text).join(' '),
      });
    }
  }

  return rows;
}
