import { randomUUID } from 'crypto';
import type { Chunk, ParsedPDF } from '../../types';

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 64;

/** Same order as LangChain `RecursiveCharacterTextSplitter` default (no extra deps). */
const SEPARATORS = ['\n\n', '\n', ' ', ''] as const;

function splitOnSeparator(text: string, separator: string): string[] {
  if (separator === '') return text.split('');
  return text.split(separator).filter((s) => s !== '');
}

function joinDocs(docs: string[], separator: string): string | null {
  const t = docs.join(separator).trim();
  return t === '' ? null : t;
}

function mergeSplits(splits: string[], separator: string): string[] {
  const docs: string[] = [];
  const currentDoc: string[] = [];
  let total = 0;
  const sepLen = separator.length;
  for (const d of splits) {
    const len = d.length;
    if (total + len + currentDoc.length * sepLen > CHUNK_SIZE) {
      if (currentDoc.length > 0) {
        const joined = joinDocs(currentDoc, separator);
        if (joined !== null) docs.push(joined);
        while (
          total > CHUNK_OVERLAP ||
          (total + len + currentDoc.length * sepLen > CHUNK_SIZE && total > 0)
        ) {
          total -= currentDoc[0]!.length;
          currentDoc.shift();
        }
      }
    }
    currentDoc.push(d);
    total += len;
  }
  const joined = joinDocs(currentDoc, separator);
  if (joined !== null) docs.push(joined);
  return docs;
}

function splitTextRecursive(text: string, separators: readonly string[]): string[] {
  const finalChunks: string[] = [];
  let separator = separators[separators.length - 1]!;
  let newSeparators: string[] | undefined;
  for (let i = 0; i < separators.length; i++) {
    const s = separators[i]!;
    if (s === '') {
      separator = s;
      break;
    }
    if (text.includes(s)) {
      separator = s;
      newSeparators = separators.slice(i + 1);
      break;
    }
  }
  const splits = splitOnSeparator(text, separator);
  const keepSeparator = true;
  const joinSep = keepSeparator ? '' : separator;
  let goodSplits: string[] = [];
  for (const s of splits) {
    if (s.length < CHUNK_SIZE) {
      goodSplits.push(s);
    } else {
      if (goodSplits.length) {
        finalChunks.push(...mergeSplits(goodSplits, joinSep));
        goodSplits = [];
      }
      if (!newSeparators) finalChunks.push(s);
      else finalChunks.push(...splitTextRecursive(s, newSeparators));
    }
  }
  if (goodSplits.length) finalChunks.push(...mergeSplits(goodSplits, joinSep));
  return finalChunks;
}

export function splitPageText(text: string): string[] {
  return splitTextRecursive(text, SEPARATORS);
}

export async function chunkDocument(pdf: ParsedPDF, documentId: string): Promise<Chunk[]> {
  const chunks: Chunk[] = [];

  for (const page of pdf.pages) {
    const texts = splitPageText(page.text);
    texts.forEach((t, chunkIndex) => {
      chunks.push({
        id: randomUUID(),
        documentId,
        text: t,
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
