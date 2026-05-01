import type { Document } from '../types';
import type { VercelKV } from '@vercel/kv';

/** In-memory fallback for local dev only — not shared across Vercel instances. */
const memoryStore = new Map<string, Document>();

const IDS_KEY = 'cortex:document_ids';
const docKey = (id: string) => `cortex:document:${id}`;

function redisUrl(): string | undefined {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
}

function redisToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
}

function useKv(): boolean {
  return Boolean(redisUrl()?.length && redisToken()?.length);
}

let cachedKv: VercelKV | null = null;

async function getKv(): Promise<VercelKV> {
  if (cachedKv) return cachedKv;
  const { createClient } = await import('@vercel/kv');
  const url = redisUrl();
  const token = redisToken();
  if (!url || !token) {
    throw new Error('Redis URL/token missing');
  }
  cachedKv = createClient({ url, token });
  return cachedKv;
}

function serialize(doc: Document): string {
  return JSON.stringify({
    ...doc,
    uploadedAt: doc.uploadedAt.toISOString(),
  });
}

function deserialize(json: string): Document {
  const o = JSON.parse(json) as Omit<Document, 'uploadedAt'> & { uploadedAt: string };
  return {
    ...o,
    uploadedAt: new Date(o.uploadedAt),
  };
}

export async function saveDocument(doc: Document): Promise<void> {
  if (useKv()) {
    const kv = await getKv();
    await kv.set(docKey(doc.id), serialize(doc));
    await kv.sadd(IDS_KEY, doc.id);
    return;
  }
  memoryStore.set(doc.id, doc);
}

export async function getDocument(id: string): Promise<Document | undefined> {
  if (useKv()) {
    const kv = await getKv();
    const raw = await kv.get<string>(docKey(id));
    return raw ? deserialize(raw) : undefined;
  }
  return memoryStore.get(id);
}

export async function listDocuments(): Promise<Document[]> {
  if (useKv()) {
    const kv = await getKv();
    const ids = await kv.smembers(IDS_KEY);
    if (!ids.length) return [];
    const docs: Document[] = [];
    for (const id of ids) {
      const raw = await kv.get<string>(docKey(id));
      if (raw) docs.push(deserialize(raw));
    }
    return docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  return Array.from(memoryStore.values()).sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
  );
}

export async function updateDocument(id: string, patch: Partial<Document>): Promise<void> {
  if (useKv()) {
    const kv = await getKv();
    const raw = await kv.get<string>(docKey(id));
    if (!raw) return;
    const doc = deserialize(raw);
    await kv.set(
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
    const kv = await getKv();
    const existed = await kv.get(docKey(id));
    if (!existed) return false;
    await kv.del(docKey(id));
    await kv.srem(IDS_KEY, id);
    return true;
  }
  return memoryStore.delete(id);
}
