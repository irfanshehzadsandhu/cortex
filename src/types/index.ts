export interface Document {
  id: string;
  filename: string;
  uploadedAt: Date;
  pageCount: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'failed';
  /** Set when `status` is `failed` (e.g. PDF parse, HF API, or LanceDB error). */
  errorMessage?: string;
}

export interface ChunkMetadata {
  filename: string;
  pageNumber: number;
  chunkIndex: number;
  sectionTitle?: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  text: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
}

export interface Citation {
  filename: string;
  pageNumber: number;
  excerpt: string;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  retrievedChunks: RetrievalResult[];
}

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedPDF {
  filename: string;
  pageCount: number;
  pages: ParsedPage[];
  rawText: string;
}
