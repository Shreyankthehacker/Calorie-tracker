const ROW_Y_TOLERANCE = 4;

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePdfBlocks(blocks: Array<{
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}>) {
  return blocks
    .map((block) => ({
      ...block,
      text: normalizeWhitespace(block.text),
    }))
    .filter((block) => block.text.length > 0);
}

export { ROW_Y_TOLERANCE };
