import type { Document } from '../types';

// In-memory store — survives the Next.js dev server process lifetime.
// Replace with a persistent DB (e.g. SQLite via better-sqlite3) later.
const store = new Map<string, Document>();

export function saveDocument(doc: Document): void {
  store.set(doc.id, doc);
}

export function getDocument(id: string): Document | undefined {
  return store.get(id);
}

export function listDocuments(): Document[] {
  return Array.from(store.values()).sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
  );
}

export function updateDocument(id: string, patch: Partial<Document>): void {
  const doc = store.get(id);
  if (doc) store.set(id, { ...doc, ...patch });
}

export function deleteDocument(id: string): boolean {
  return store.delete(id);
}
