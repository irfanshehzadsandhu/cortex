'use client';

import { useCallback, useEffect, useState } from 'react';
import { UploadZone } from '@/components/upload-zone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Document } from '@/src/types';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [storageBackend, setStorageBackend] = useState<'redis' | 'memory' | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/documents', { cache: 'no-store' });
    if (!res.ok) return;
    setDocs(await res.json());
    const b = res.headers.get('X-Cortex-Document-Backend');
    if (b === 'redis' || b === 'memory') setStorageBackend(b);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const deleteDoc = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    refresh();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Documents</h1>
        <p className="text-sm text-muted-foreground">Upload PDFs to ask questions about them.</p>
      </div>

      {storageBackend === 'memory' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-medium">Document list won’t sync on Vercel without Upstash Redis</p>
          <p className="mt-1 text-xs opacity-90">
            Metadata is only kept in this server’s memory. Create a free Redis database at{' '}
            <a
              href="https://console.upstash.com/"
              className="underline font-medium"
              target="_blank"
              rel="noreferrer"
            >
              Upstash
            </a>
            , copy the REST credentials into{' '}
            <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[11px] dark:bg-white/10">
              UPSTASH_REDIS_REST_URL
            </code>{' '}
            and{' '}
            <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[11px] dark:bg-white/10">
              UPSTASH_REDIS_REST_TOKEN
            </code>{' '}
            (see <code className="font-mono text-[11px]">.env.example</code>), then redeploy.
          </p>
        </div>
      )}

      <UploadZone onUploadComplete={refresh} />

      {docs.length > 0 && (
        <div className="flex flex-col gap-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{doc.filename}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {doc.pageCount} pages · {doc.chunkCount} chunks
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    doc.status === 'ready' ? 'default' :
                    doc.status === 'failed' ? 'destructive' : 'secondary'
                  }
                >
                  {doc.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteDoc(doc.id)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
