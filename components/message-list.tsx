import { ScrollArea } from '@/components/ui/scroll-area';
import { SourceCitations } from './source-citations';
import type { Citation } from '@/src/types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

interface Props {
  messages: Message[];
  loading?: boolean;
}

export function MessageList({ messages, loading }: Props) {
  return (
    <ScrollArea className="flex-1 px-4 py-3">
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-16">
            Ask anything about your uploaded documents.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && msg.citations && (
                <SourceCitations citations={msg.citations} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-muted text-sm text-muted-foreground animate-pulse">
              Thinking…
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
