import { NextRequest, NextResponse } from 'next/server';
import { listDocuments, deleteDocument } from '../../../src/lib/document-store';

export const runtime = 'nodejs';

export async function GET() {
  const docs = await listDocuments();
  return NextResponse.json(docs);
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
