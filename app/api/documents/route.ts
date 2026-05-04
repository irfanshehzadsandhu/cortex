import { NextResponse } from 'next/server';
import {
  getDocumentStorageBackend,
  listDocuments,
} from '../../../src/lib/document-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Document list only — no LanceDB / pdf-parse in this module graph (keeps bundle small on Vercel). */
export async function GET() {
  const docs = await listDocuments();
  const res = NextResponse.json(docs);
  res.headers.set('X-Cortex-Document-Backend', getDocumentStorageBackend());
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return res;
}
