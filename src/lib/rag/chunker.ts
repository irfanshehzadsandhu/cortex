import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { randomUUID } from 'crypto';
import type { Chunk, ParsedPDF } from '../../types';

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 64;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export async function chunkDocument(pdf: ParsedPDF, documentId: string): Promise<Chunk[]> {
  const chunks: Chunk[] = [];

  for (const page of pdf.pages) {
    const texts = await splitter.splitText(page.text);
    texts.forEach((text, chunkIndex) => {
      chunks.push({
        id: randomUUID(),
        documentId,
        text,
        metadata: {
          filename: pdf.filename,
          pageNumber: page.pageNumber,
          chunkIndex,
        },
      });
    });
  }

  return chunks;
}
