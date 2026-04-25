import { embed } from './embedder';
import { similaritySearch } from './vector-store';
import type { RetrievalResult } from '../../types';

const DEFAULT_TOP_K = 5;
export async function retrieve(
  query: string,
  topK = DEFAULT_TOP_K,
  documentIds?: string[]
): Promise<RetrievalResult[]> {
  const queryVector = await embed(query);
  return similaritySearch(queryVector, topK, documentIds);
}
