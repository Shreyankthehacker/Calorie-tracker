import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function pdfFromLines(
  lines: Array<{ text: string; x: number; y: number }>,
  pageSize: [number, number] = [612, 792],
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(pageSize);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const line of lines) {
    page.drawText(line.text, { x: line.x, y: line.y, size: 10, font });
  }
  return Buffer.from(await doc.save());
}

export async function emptyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return Buffer.from(await doc.save());
}

export async function tableDiaryPdf(): Promise<Buffer> {
  return pdfFromLines([
    { text: 'Date', x: 40, y: 700 },
    { text: 'Meal', x: 120, y: 700 },
    { text: 'Food', x: 220, y: 700 },
    { text: 'Qty', x: 360, y: 700 },
    { text: 'Calories', x: 430, y: 700 },
    { text: 'Protein', x: 520, y: 700 },
    { text: 'Carbs', x: 590, y: 700 },
    { text: 'Fat', x: 650, y: 700 },
    { text: '09/12/26', x: 40, y: 680 },
    { text: 'Breakfast', x: 120, y: 680 },
    { text: 'Oatmeal', x: 220, y: 680 },
    { text: '1', x: 360, y: 680 },
    { text: '320', x: 430, y: 680 },
    { text: '12', x: 520, y: 680 },
    { text: '52', x: 590, y: 680 },
    { text: '8', x: 650, y: 680 },
    { text: '09/12/26', x: 40, y: 660 },
    { text: 'Lunch', x: 120, y: 660 },
    { text: 'Chicken Rice', x: 220, y: 660 },
    { text: '1', x: 360, y: 660 },
    { text: '520', x: 430, y: 660 },
    { text: '38', x: 520, y: 660 },
    { text: '45', x: 590, y: 660 },
    { text: '12', x: 650, y: 660 },
  ], [792, 792]);
}

export async function lineDiaryPdf(): Promise<Buffer> {
  return pdfFromLines([
    { text: '09/12/26', x: 50, y: 720 },
    { text: 'Breakfast', x: 50, y: 700 },
    { text: 'Toast', x: 50, y: 680 },
    { text: '160 kcal', x: 50, y: 660 },
    { text: '6g protein', x: 50, y: 640 },
    { text: '30g carbs', x: 50, y: 620 },
    { text: '2g fat', x: 50, y: 600 },
  ]);
}

export async function mixedDiaryPdf(): Promise<Buffer> {
  return pdfFromLines([
    { text: '2026-09-13', x: 40, y: 700 },
    { text: 'Breakfast', x: 40, y: 680 },
    { text: 'Oatmeal - 1 bowl - 320 kcal - 12g protein - 52g carbs - 8g fat', x: 40, y: 660 },
  ]);
}

export async function unsupportedPdf(): Promise<Buffer> {
  return pdfFromLines([
    { text: 'Quarterly Financial Report', x: 50, y: 700 },
    { text: 'Revenue increased by twelve percent versus last quarter.', x: 50, y: 680 },
  ]);
}

export async function malformedPdf(): Promise<Buffer> {
  return Buffer.from('%PDF-1.4\nthis is not a valid PDF body');
}

export async function missingCaloriesPdf(): Promise<Buffer> {
  return pdfFromLines([
    { text: '09/12/26', x: 50, y: 700 },
    { text: 'Lunch', x: 50, y: 680 },
    { text: 'Mystery stew', x: 50, y: 660 },
  ]);
}

export function multipartPdf(file: { filename: string; contentType: string; body: Buffer }, fieldName = 'file') {
  const boundary = '----VitestPdfBoundary7MA4YWxkTrZu0gW';
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ),
    file.body,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  };
}
