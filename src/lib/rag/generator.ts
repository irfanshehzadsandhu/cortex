import { HfInference } from '@huggingface/inference';
import type { Citation, QueryResponse, RetrievalResult } from '../../types';

const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

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

  const response = await hf.chatCompletion({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a document Q&A assistant. Answer the question using ONLY the source passages provided. Cite sources inline using [filename, p.N] notation. If the passages lack enough information, say so clearly.',
      },
      {
        role: 'user',
        content: `Source passages:\n\n${context}\n\n---\n\nQuestion: ${query}`,
      },
    ],
    max_tokens: 512,
    temperature: 0.3,
  });

  const answer = response.choices[0]?.message?.content?.trim() ?? '';

  return {
    answer,
    citations: extractCitations(results),
    retrievedChunks: results,
  };
}
