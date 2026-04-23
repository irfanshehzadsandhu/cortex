import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

const MODEL = 'Xenova/all-MiniLM-L6-v2';

let embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', MODEL, { quantized: true });
  }
  return embedder;
}

export async function embed(text: string): Promise<number[]> {
  const fn = await getEmbedder();
  const output = await fn(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const fn = await getEmbedder();
  const output = await fn(texts, { pooling: 'mean', normalize: true });
  const dim = output.dims[1] as number;
  const flat = output.data as Float32Array;
  return Array.from({ length: texts.length }, (_, i) =>
    Array.from(flat.slice(i * dim, (i + 1) * dim))
  );
}
