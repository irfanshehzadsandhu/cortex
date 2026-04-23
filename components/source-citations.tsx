import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Citation } from '@/src/types';

interface Props {
  citations: Citation[];
}

export function SourceCitations({ citations }: Props) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3">
      <Separator className="mb-3" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sources</p>
      <div className="flex flex-col gap-2">
        {citations.map((c, i) => (
          <Card key={i} className="p-3 bg-muted/40">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{c.filename}</Badge>
              <span className="text-xs text-muted-foreground">p. {c.pageNumber}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{c.excerpt}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
