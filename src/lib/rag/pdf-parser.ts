import { PDFParse } from 'pdf-parse';
import { CanvasFactory } from 'pdf-parse/worker';
import type { ParsedPage, ParsedPDF } from '../../types';

export async function parsePDF(buffer: Buffer, filename: string): Promise<ParsedPDF> {
  const data = new Uint8Array(buffer);
  // Node / Vercel: without CanvasFactory, pdfjs may use browser-only globals (e.g. DOMMatrix).
  // See https://github.com/mehmet-kozan/pdf-parse/blob/main/docs/troubleshooting.md
  const parser = new PDFParse({ data, CanvasFactory });

  const info = await parser.getInfo();
  const result = await parser.getText({ pageJoiner: '' });
  await parser.destroy();

  const pages: ParsedPage[] = result.pages
    .map((p) => ({ pageNumber: p.num, text: p.text.trim() }))
    .filter((p) => p.text.length > 0);

  return {
    filename,
    pageCount: info.total ?? pages.length,
    pages,
    rawText: result.text,
  };
}
