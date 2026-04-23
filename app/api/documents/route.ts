import { NextRequest, NextResponse } from 'next/server';
import { listDocuments, deleteDocument } from '../../../src/lib/document-store';
import { deleteDocumentChunks } from '../../../src/lib/rag/vector-store';

export async function GET() {
  return NextResponse.json(listDocuments());
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  await deleteDocumentChunks(id);
  const deleted = deleteDocument(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
