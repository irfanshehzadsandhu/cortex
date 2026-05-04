import { Redis } from '@upstash/redis';
import type { Document } from '../types';

const IDS_KEY = 'cortex:document_ids';
const docKey = (id: string) => `cortex:document:${id}`;

/** Upstash dashboard exposes these; legacy Vercel KV env names still work. */
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
      'Document store requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or legacy KV_REST_API_URL/KV_REST_API_TOKEN).',
    );
  }
  return { url, token };
}

/** Metadata storage backend is always Redis. */
export function getDocumentStorageBackend(): 'redis' {
  return 'redis';
}

let cachedRedis: Redis | null = null;

/**
 * @upstash/redis talks to Upstash over HTTPS (REST), not the TCP `redis://` endpoint.
 */
function assertValidUpstashRestUrl(url: string): void {
  const u = url.trim();
  if (u.startsWith('redis://') || u.startsWith('rediss://')) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL is the TCP Redis URL (redis://…). Use the HTTPS REST URL instead: Upstash Console → your database → REST API → copy the URL that starts with https:// (same section as the REST token).'
    );
  }
  if (!u.startsWith('https://')) {
    throw new Error(
      `UPSTASH_REDIS_REST_URL must start with https:// (REST API). Got: ${u.slice(0, 64)}${u.length > 64 ? '…' : ''}`
    );
  }
}

function getRedis(): Redis {
  if (cachedRedis) return cachedRedis;
  const { url, token } = getRedisConfig();
  assertValidUpstashRestUrl(url);
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function serialize(doc: Document): string {
  return JSON.stringify({
    ...doc,
    uploadedAt: doc.uploadedAt.toISOString(),
  });
}

/**
 * Upstash `get` may return either a string (raw JSON) or an already-parsed object.
 * Passing an object into `JSON.parse` stringifies it as "[object Object]" and throws.
 */
function parseStoredDocument(raw: unknown): Document {
  if (raw == null) {
    throw new Error('Missing document value from Redis');
  }
  const parsed =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Omit<Document, 'uploadedAt'> & { uploadedAt: string; errorMessage?: string })
      : (raw as Omit<Document, 'uploadedAt'> & { uploadedAt: string; errorMessage?: string });
  const err = parsed.errorMessage;
  return {
    ...parsed,
    uploadedAt: new Date(parsed.uploadedAt),
    ...(typeof err === 'string' && err.length > 0 ? { errorMessage: err } : {}),
  };
}

export async function saveDocument(doc: Document): Promise<void> {
  const redis = getRedis();
  await redis.set(docKey(doc.id), serialize(doc));
  await redis.sadd(IDS_KEY, doc.id);
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const redis = getRedis();
  const raw = await redis.get(docKey(id));
  return raw != null ? parseStoredDocument(raw) : undefined;
}

export async function listDocuments(): Promise<Document[]> {
  const redis = getRedis();
  const ids = await redis.smembers(IDS_KEY);
  if (!ids.length) return [];
  const docs: Document[] = [];
  for (const id of ids) {
    const raw = await redis.get(docKey(id));
    if (raw != null) docs.push(parseStoredDocument(raw));
  }
  return docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

export async function updateDocument(id: string, patch: Partial<Document>): Promise<void> {
  const redis = getRedis();
  const raw = await redis.get(docKey(id));
  if (raw == null) return;
  const doc = parseStoredDocument(raw);
  await redis.set(
    docKey(id),
    serialize({
      ...doc,
      ...patch,
      uploadedAt: patch.uploadedAt ?? doc.uploadedAt,
    })
  );
}

export async function deleteDocument(id: string): Promise<boolean> {
  const redis = getRedis();
  const existed = await redis.get(docKey(id));
  if (!existed) return false;
  await redis.del(docKey(id));
  await redis.srem(IDS_KEY, id);
  return true;
}
