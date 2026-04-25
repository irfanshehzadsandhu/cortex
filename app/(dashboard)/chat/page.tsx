'use client';

import { useState } from 'react';
import { ChatInput } from '@/components/chat-input';
import { MessageList, type Message } from '@/components/message-list';
import type { QueryResponse } from '@/src/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });

      const data: QueryResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, citations: data.citations },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Chat</h1>
        <p className="text-xs text-muted-foreground">Ask questions about your uploaded documents.</p>
      </div>
      <MessageList messages={messages} loading={loading} />
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
