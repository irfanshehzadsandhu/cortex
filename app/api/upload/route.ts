import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getDocumentStorageBackend,
  saveDocument,
  updateDocument,
} from '../../../src/lib/document-store';
import type { Chunk } from '../../../src/types';

export const runtime = 'nodejs';
/** Allow PDF parse + HF embeddings + LanceDB on serverless (Vercel caps by plan). */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;

    const documentId = uuidv4();

    await saveDocument({
      id: documentId,
      filename,
      uploadedAt: new Date(),
      pageCount: 0,
      chunkCount: 0,
      status: 'processing',
    });

    // Run ingestion in this invocation (not `after()`). On Vercel, `after()` work is often cut
    // short when the platform considers the request finished, which leaves documents stuck in
    // `processing` or marks them `failed` when the real issue is an incomplete run.
    let finalStatus: 'ready' | 'failed' = 'ready';
    let errorMessage: string | undefined;

    try {
      const [{ parsePDF }, { chunkDocument }, { embedBatch }, { upsertChunks }] =
        await Promise.all([
          import('../../../src/lib/rag/pdf-parser'),
          import('../../../src/lib/rag/chunker'),
          import('../../../src/lib/rag/embedder'),
          import('../../../src/lib/rag/vector-store'),
        ]);

      const parsed = await parsePDF(buffer, filename);
      const chunks = await chunkDocument(parsed, documentId);
      const texts = chunks.map((c) => c.text);
      const embeddings = await embedBatch(texts);

      const embeddedChunks: Chunk[] = chunks.map((c, i) => ({
        ...c,
        embedding: embeddings[i],
      }));

      await upsertChunks(embeddedChunks);

      await updateDocument(documentId, {
        pageCount: parsed.pageCount,
        chunkCount: chunks.length,
        status: 'ready',
        errorMessage: undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[upload] processing failed', err);
      errorMessage = msg.slice(0, 2000);
      finalStatus = 'failed';
      await updateDocument(documentId, {
        status: 'failed',
        errorMessage,
      });
    }

    const res = NextResponse.json(
      {
        documentId,
        status: finalStatus,
        ...(errorMessage ? { error: errorMessage } : {}),
      },
      { status: 200 },
    );
    res.headers.set('X-Cortex-Document-Backend', getDocumentStorageBackend());
    return res;
  } catch (err) {
    console.error('[upload] request failed', err);
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
