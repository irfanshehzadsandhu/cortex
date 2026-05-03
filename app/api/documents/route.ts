import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDocument,
  getDocumentStorageBackend,
  listDocuments,
} from '../../../src/lib/document-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const docs = await listDocuments();
  const res = NextResponse.json(docs);
  res.headers.set('X-Cortex-Document-Backend', getDocumentStorageBackend());
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return res;
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  const { deleteDocumentChunks } = await import('../../../src/lib/rag/vector-store');
  await deleteDocumentChunks(id);
  const deleted = await deleteDocument(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
