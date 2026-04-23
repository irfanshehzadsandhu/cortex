'use client';

import { useCallback, useEffect, useState } from 'react';
import { UploadZone } from '@/components/upload-zone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Document } from '@/src/types';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/documents');
    if (res.ok) setDocs(await res.json());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const deleteDoc = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Documents</h1>
        <p className="text-sm text-muted-foreground">Upload PDFs to ask questions about them.</p>
      </div>

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
