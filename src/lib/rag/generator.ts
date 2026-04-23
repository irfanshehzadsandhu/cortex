import { anthropic } from '../anthropic';
import type { Citation, QueryResponse, RetrievalResult } from '../../types';

const MODEL = 'claude-opus-4-7';

const SYSTEM_PROMPT = `You are a document Q&A assistant. Answer the user's question using ONLY the provided source passages.

Rules:
- Base your answer exclusively on the passages below
- If the passages don't contain enough information, say so clearly
- Cite sources inline using [filename, p.N] notation
- Be concise and precise`;

function buildContext(results: RetrievalResult[]): string {
  return results
    .map((r, i) => {
      const { filename, pageNumber } = r.chunk.metadata;
      return `[${i + 1}] ${filename}, page ${pageNumber}:\n${r.chunk.text}`;
    })
    .join('\n\n---\n\n');
}

function extractCitations(results: RetrievalResult[]): Citation[] {
  return results.map((r) => ({
    filename: r.chunk.metadata.filename,
    pageNumber: r.chunk.metadata.pageNumber,
    excerpt: r.chunk.text.slice(0, 200),
  }));
}

export async function generateAnswer(
  query: string,
  results: RetrievalResult[]
): Promise<QueryResponse> {
  if (results.length === 0) {
    return {
      answer: 'No relevant passages found to answer your question.',
      citations: [],
      retrievedChunks: [],
    };
  }

  const context = buildContext(results);
  const userMessage = `Source passages:\n\n${context}\n\n---\n\nQuestion: ${query}`;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const message = await stream.finalMessage();

  const answerBlock = message.content.find((b) => b.type === 'text');
  const answer = answerBlock?.type === 'text' ? answerBlock.text : '';

  return {
    answer,
    citations: extractCitations(results),
    retrievedChunks: results,
  };
}
