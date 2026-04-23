'use client';

import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const text = ref.current?.value.trim();
    if (!text) return;
    onSend(text);
    if (ref.current) ref.current.value = '';
  };

  return (
    <div className="border-t px-4 py-3 flex gap-2 items-end">
      <Textarea
        ref={ref}
        placeholder="Ask a question about your documents…"
        className="resize-none min-h-[44px] max-h-[140px]"
        rows={1}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <Button onClick={send} disabled={disabled} className="shrink-0">
        Send
      </Button>
    </div>
  );
}
