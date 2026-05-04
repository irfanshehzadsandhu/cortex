import { Redis } from '@upstash/redis';
import type { Chunk, RetrievalResult } from '../../types';

const IDS_KEY = 'cortex:chunk_ids';
const docIdsKey = (documentId: string) => `cortex:document_chunk_ids:${documentId}`;
const chunkKey = (id: string) => `cortex:chunk:${id}`;

let cachedRedis: Redis | null = null;

type RedisChunk = {
  id: string;
  documentId: string;
  text: string;
  filename: string;
  pageNumber: number;
  chunkIndex: number;
  vector: number[];
};

function parseStoredChunk(raw: unknown): RedisChunk {
  if (raw == null) {
    throw new Error('Missing chunk value from Redis');
  }
  if (typeof raw === 'string') {
    return JSON.parse(raw) as RedisChunk;
  }
  return raw as RedisChunk;
}

function redisUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

function redisToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

function getRedisConfig(): { url: string; token: string } {
  const url = redisUrl();
  const token = redisToken();
  if (!url || !token) {
    throw new Error(
      'Redis vector store requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or legacy KV_REST_API_URL/KV_REST_API_TOKEN).',
    );
  }
  return { url, token };
}

export function getVectorStorageBackend(): 'redis' {
  return 'redis';
}

export async function getVectorStoreStats(documentIds?: string[]): Promise<{
  totalChunkIds: number;
  filteredChunkIds: number;
}> {
  const redis = getRedis();
  const totalChunkIds = (await redis.smembers(IDS_KEY)).length;
  if (!documentIds || documentIds.length === 0) {
    return { totalChunkIds, filteredChunkIds: totalChunkIds };
  }

  const ids = new Set<string>();
  for (const docId of documentIds) {
    const chunkIds = await redis.smembers(docIdsKey(docId));
    for (const id of chunkIds) ids.add(id);
  }
  return { totalChunkIds, filteredChunkIds: ids.size };
}

function getRedis(): Redis {
  if (cachedRedis) return cachedRedis;
  const { url, token } = getRedisConfig();
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function upsertChunks(chunks: Chunk[]): Promise<void> {
  if (chunks.length === 0) return;
  const redis = getRedis();
  for (const c of chunks) {
    if (!c.embedding) continue;
    const row: RedisChunk = {
      id: c.id,
      documentId: c.documentId,
      text: c.text,
      filename: c.metadata.filename,
      pageNumber: c.metadata.pageNumber,
      chunkIndex: c.metadata.chunkIndex,
      vector: c.embedding,
    };
    await redis.set(chunkKey(c.id), JSON.stringify(row));
    await redis.sadd(IDS_KEY, c.id);
    await redis.sadd(docIdsKey(c.documentId), c.id);
  }
}

export async function similaritySearch(
  queryVector: number[],
  topK = 5,
  documentIds?: string[]
): Promise<RetrievalResult[]> {
  const redis = getRedis();
  const ids = new Set<string>();

  if (documentIds && documentIds.length > 0) {
    for (const docId of documentIds) {
      const chunkIds = await redis.smembers(docIdsKey(docId));
      for (const id of chunkIds) ids.add(id);
    }
  } else {
    const allIds = await redis.smembers(IDS_KEY);
    for (const id of allIds) ids.add(id);
  }

  const scored: RetrievalResult[] = [];
  for (const id of ids) {
    const raw = await redis.get(chunkKey(id));
    if (!raw) continue;
    const row = parseStoredChunk(raw);
    const score = cosineSimilarity(queryVector, row.vector);
    scored.push({
      score,
      chunk: {
        id: row.id,
        documentId: row.documentId,
        text: row.text,
        metadata: {
          filename: row.filename,
          pageNumber: row.pageNumber,
          chunkIndex: row.chunkIndex,
        },
      },
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const redis = getRedis();
  const ids = await redis.smembers(docIdsKey(documentId));
  for (const id of ids) {
    await redis.del(chunkKey(id));
    await redis.srem(IDS_KEY, id);
  }
  await redis.del(docIdsKey(documentId));
}
