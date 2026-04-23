import * as lancedb from '@lancedb/lancedb';
import { makeArrowTable } from '@lancedb/lancedb';
import path from 'path';
import type { Chunk, RetrievalResult } from '../../types';

const DB_PATH = path.resolve(process.cwd(), 'data/lancedb');
const TABLE_NAME = 'chunks';
const EMBEDDING_DIM = 384;

type ChunkRow = {
  id: string;
  documentId: string;
  text: string;
  filename: string;
  pageNumber: number;
  chunkIndex: number;
  vector: number[];
};

let db: lancedb.Connection | null = null;

async function getDB(): Promise<lancedb.Connection> {
  if (!db) db = await lancedb.connect(DB_PATH);
  return db;
}

async function getTable(): Promise<lancedb.Table> {
  const conn = await getDB();
  const names = await conn.tableNames();
  if (names.includes(TABLE_NAME)) return conn.openTable(TABLE_NAME);

  // Create table with a dummy row so schema is established, then delete it
  const placeholder: ChunkRow = {
    id: '__init__',
    documentId: '',
    text: '',
    filename: '',
    pageNumber: 0,
    chunkIndex: 0,
    vector: new Array(EMBEDDING_DIM).fill(0),
  };
  const table = await conn.createTable(TABLE_NAME, makeArrowTable([placeholder]));
  await table.delete("id = '__init__'");
  return table;
}

export async function upsertChunks(chunks: Chunk[]): Promise<void> {
  if (chunks.length === 0) return;
  const table = await getTable();
  const rows: ChunkRow[] = chunks.map((c) => ({
    id: c.id,
    documentId: c.documentId,
    text: c.text,
    filename: c.metadata.filename,
    pageNumber: c.metadata.pageNumber,
    chunkIndex: c.metadata.chunkIndex,
    vector: c.embedding!,
  }));
  await table.add(makeArrowTable(rows));
}

export async function similaritySearch(
  queryVector: number[],
  topK = 5,
  documentIds?: string[]
): Promise<RetrievalResult[]> {
  const table = await getTable();
  let query = table.vectorSearch(queryVector).limit(topK).select(['id', 'documentId', 'text', 'filename', 'pageNumber', 'chunkIndex']);

  if (documentIds && documentIds.length > 0) {
    const ids = documentIds.map((id) => `'${id}'`).join(', ');
    query = query.where(`documentId IN (${ids})`);
  }

  const rows = await query.toArray();

  return rows.map((row) => ({
    score: row._distance != null ? 1 - (row._distance as number) : 0,
    chunk: {
      id: row.id as string,
      documentId: row.documentId as string,
      text: row.text as string,
      metadata: {
        filename: row.filename as string,
        pageNumber: row.pageNumber as number,
        chunkIndex: row.chunkIndex as number,
      },
    },
  }));
}

export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const table = await getTable();
  await table.delete(`documentId = '${documentId}'`);
}
