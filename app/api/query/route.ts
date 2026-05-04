import { NextRequest, NextResponse } from 'next/server';
import { retrieve } from '../../../src/lib/rag/retriever';
import { generateAnswer } from '../../../src/lib/rag/generator';
import { listDocuments } from '../../../src/lib/document-store';
import { getVectorStorageBackend, getVectorStoreStats } from '../../../src/lib/rag/vector-store';

export async function POST(req: NextRequest) {
  const body = await req.json() as { query?: string; documentIds?: string[]; topK?: number };

  const { query, documentIds, topK = 5 } = body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'Missing or empty query' }, { status: 400 });
  }

  const results = await retrieve(query.trim(), topK, documentIds);
  const response = await generateAnswer(query.trim(), results) as Record<string, unknown>;

  if (results.length === 0) {
    const docs = await listDocuments();
    const readyDocs = docs.filter((d) => d.status === 'ready');
    const failedDocs = docs.filter((d) => d.status === 'failed');
    const vectorStats = await getVectorStoreStats(documentIds);

    response.debug = {
      vectorBackend: getVectorStorageBackend(),
      totalVectorChunkIds: vectorStats.totalChunkIds,
      filteredVectorChunkIds: vectorStats.filteredChunkIds,
      totalDocuments: docs.length,
      readyDocuments: readyDocs.length,
      failedDocuments: failedDocs.length,
      filteredDocumentIdsCount: documentIds?.length ?? 0,
      message:
        readyDocs.length === 0
          ? 'No documents are currently ready for retrieval. Re-upload and verify upload status is ready.'
          : 'Documents are ready but retrieval returned zero chunks. Ensure upload/query use the same vector backend and redeploy if configuration changed.',
    };
  }

  return NextResponse.json(response);
}
