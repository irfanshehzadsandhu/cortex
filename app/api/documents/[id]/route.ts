import { NextRequest, NextResponse } from 'next/server';
import { deleteDocument } from '../../../../src/lib/document-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Isolated from `GET /api/documents` so list metadata does not trace LanceDB / pdfjs (~240 MB). */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  const { deleteDocumentChunks } = await import('../../../../src/lib/rag/vector-store');
  await deleteDocumentChunks(id);
  const deleted = await deleteDocument(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
