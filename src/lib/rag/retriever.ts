import { embed } from './embedder';
import { similaritySearch } from './vector-store';
import type { RetrievalResult } from '../../types';

const DEFAULT_TOP_K = 5;
const MIN_SCORE = 0.0;

export async function retrieve(
  query: string,
  topK = DEFAULT_TOP_K,
  documentIds?: string[]
): Promise<RetrievalResult[]> {
  const queryVector = await embed(query);
  const results = await similaritySearch(queryVector, topK, documentIds);
  return results.filter((r) => r.score >= MIN_SCORE);
}
