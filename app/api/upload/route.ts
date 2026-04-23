import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parsePDF } from '../../../src/lib/rag/pdf-parser';
import { chunkDocument } from '../../../src/lib/rag/chunker';
import { embedBatch } from '../../../src/lib/rag/embedder';
import { upsertChunks } from '../../../src/lib/rag/vector-store';
import { saveDocument, updateDocument } from '../../../src/lib/document-store';
import type { Chunk } from '../../../src/types';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
  }

  const documentId = uuidv4();

  saveDocument({
    id: documentId,
    filename: file.name,
    uploadedAt: new Date(),
    pageCount: 0,
    chunkCount: 0,
    status: 'processing',
  });

  // Process in the background so we can return immediately
  (async () => {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parsePDF(buffer, file.name);

      const chunks = await chunkDocument(parsed, documentId);

      const texts = chunks.map((c) => c.text);
      const embeddings = await embedBatch(texts);

      const embeddedChunks: Chunk[] = chunks.map((c, i) => ({
        ...c,
        embedding: embeddings[i],
      }));

      await upsertChunks(embeddedChunks);

      updateDocument(documentId, {
        pageCount: parsed.pageCount,
        chunkCount: chunks.length,
        status: 'ready',
      });
    } catch (err) {
      console.error('[upload] processing failed', err);
      updateDocument(documentId, { status: 'failed' });
    }
  })();

  return NextResponse.json({ documentId, status: 'processing' }, { status: 202 });
}
