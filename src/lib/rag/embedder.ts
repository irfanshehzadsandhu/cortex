import { HfInference, type FeatureExtractionOutput } from '@huggingface/inference';

/** Same family as previous Xenova model; 384-dim sentence embeddings (cosine). */
const DEFAULT_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

function getModel(): string {
  return process.env.HUGGINGFACE_EMBEDDING_MODEL ?? DEFAULT_MODEL;
}

/** HF routers may return pooled vectors, token matrices, or nested batches — normalize to row vectors. */
function vectorsFromFeatureOutput(raw: FeatureExtractionOutput): number[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Empty embedding response from inference API');
  }

  const first = raw[0];

  if (Array.isArray(first)) {
    const inner = first[0];
    if (typeof inner === 'number') {
      return raw as number[][];
    }
    return (raw as unknown as number[][][]).map(meanPoolRows);
  }

  if (typeof first === 'number') {
    return [raw as unknown as number[]];
  }

  throw new Error('Unexpected embedding response shape from inference API');
}

function meanPoolRows(tokens: number[][]): number[] {
  if (tokens.length === 0) return [];
  const dim = tokens[0]!.length;
  const acc = new Float64Array(dim);
  for (const row of tokens) {
    for (let i = 0; i < dim; i++) acc[i] += row[i]!;
  }
  const n = tokens.length;
  for (let i = 0; i < dim; i++) acc[i] /= n;
  return Array.from(acc);
}

const BATCH_SIZE = 16;

export async function embed(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text]);
  if (!vec) throw new Error('No embedding returned');
  return vec;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = getModel();
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const raw = await hf.featureExtraction({
      model,
      inputs: slice,
      normalize: true,
    });
    const rows = vectorsFromFeatureOutput(raw);
    for (const row of rows) {
      if (row.length !== EMBEDDING_DIM) {
        throw new Error(
          `Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${row.length}. Check HUGGINGFACE_EMBEDDING_MODEL matches LanceDB schema.`,
        );
      }
    }
    out.push(...rows);
  }

  return out;
}
