import { Redis } from '@upstash/redis';
import type { Document } from '../types';

/** In-memory fallback for local dev only — not shared across Vercel instances. */
const memoryStore = new Map<string, Document>();

const IDS_KEY = 'cortex:document_ids';
const docKey = (id: string) => `cortex:document:${id}`;

/** Upstash dashboard exposes these; legacy Vercel KV env names still work. */
function redisUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

function redisToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

function useKv(): boolean {
  return Boolean(redisUrl()?.length && redisToken()?.length);
}

/** Whether metadata is shared across instances (`redis`) or process-local (`memory`). */
export function getDocumentStorageBackend(): 'redis' | 'memory' {
  return useKv() ? 'redis' : 'memory';
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
  const url = redisUrl();
  const token = redisToken();
  if (!url || !token) {
    throw new Error('Redis URL/token missing');
  }
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
      ? (JSON.parse(raw) as Omit<Document, 'uploadedAt'> & { uploadedAt: string })
      : (raw as Omit<Document, 'uploadedAt'> & { uploadedAt: string });
  return {
    ...parsed,
    uploadedAt: new Date(parsed.uploadedAt),
  };
}

export async function saveDocument(doc: Document): Promise<void> {
  if (useKv()) {
    const redis = getRedis();
    await redis.set(docKey(doc.id), serialize(doc));
    await redis.sadd(IDS_KEY, doc.id);
    return;
  }
  memoryStore.set(doc.id, doc);
}

export async function getDocument(id: string): Promise<Document | undefined> {
  if (useKv()) {
    const redis = getRedis();
    const raw = await redis.get(docKey(id));
    return raw != null ? parseStoredDocument(raw) : undefined;
  }
  return memoryStore.get(id);
}

export async function listDocuments(): Promise<Document[]> {
  if (useKv()) {
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
  return Array.from(memoryStore.values()).sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
  );
}

export async function updateDocument(id: string, patch: Partial<Document>): Promise<void> {
  if (useKv()) {
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
    return;
  }
  const doc = memoryStore.get(id);
  if (doc) memoryStore.set(id, { ...doc, ...patch });
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (useKv()) {
    const redis = getRedis();
    const existed = await redis.get(docKey(id));
    if (!existed) return false;
    await redis.del(docKey(id));
    await redis.srem(IDS_KEY, id);
    return true;
  }
  return memoryStore.delete(id);
}
