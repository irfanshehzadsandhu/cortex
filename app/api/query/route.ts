import { NextRequest, NextResponse } from 'next/server';
import { retrieve } from '../../../src/lib/rag/retriever';
import { generateAnswer } from '../../../src/lib/rag/generator';

export async function POST(req: NextRequest) {
  const body = await req.json() as { query?: string; documentIds?: string[]; topK?: number };

  const { query, documentIds, topK = 5 } = body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'Missing or empty query' }, { status: 400 });
  }

  const results = await retrieve(query.trim(), topK, documentIds);
  const response = await generateAnswer(query.trim(), results);

  return NextResponse.json(response);
}
