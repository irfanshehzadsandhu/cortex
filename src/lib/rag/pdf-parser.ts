import { PDFParse } from 'pdf-parse';
import type { ParsedPage, ParsedPDF } from '../../types';

export async function parsePDF(buffer: Buffer, filename: string): Promise<ParsedPDF> {
  const data = new Uint8Array(buffer);
  const parser = new PDFParse({ data });

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
