'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  onUploadComplete: () => void;
}

export function UploadZone({ onUploadComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are supported.');
        return;
      }
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = (await res.json()) as {
          error?: string;
          message?: string;
          status?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? data.message ?? 'Upload failed');
        }
        if (data.status === 'failed' && data.error) {
          throw new Error(data.error);
        }
        onUploadComplete();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  return (
    <Card
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById('pdf-input')?.click()}
    >
      <input
        id="pdf-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl">📄</div>
        {uploading ? (
          <p className="text-sm text-muted-foreground">Uploading and processing…</p>
        ) : (
          <>
            <p className="font-medium">Drop a PDF here or click to browse</p>
            <Badge variant="secondary">PDF only</Badge>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Card>
  );
}
