# Ask Your Documents — Project Plan (TypeScript)

A multi-document Q&A assistant using RAG, built entirely in TypeScript.

## 1. What you'll build

A web app where users upload PDFs and ask natural language questions. The system retrieves relevant passages and generates answers with source citations.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | One codebase for backend + frontend |
| Language | TypeScript (strict mode) | Type safety end-to-end |
| PDF parsing | `pdf-parse` + `pdfjs-dist` | `pdf-parse` for text, `pdfjs-dist` for pages |
| Chunking | LangChain.js `RecursiveCharacterTextSplitter` | Battle-tested |
| Embeddings (free) | `@xenova/transformers` | Local inference, no API cost |
| Vector DB | LanceDB | Pure TypeScript, embedded, no Docker |
| LLM | Anthropic SDK (`@anthropic-ai/sdk`) | Claude Sonnet 4 |
| UI | Next.js + Tailwind + shadcn/ui | Professional, fast to build |
| Deployment | Vercel | Free tier, one-click deploy |

## 3. Core types

\`\`\`ts
export interface Document {
  id: string;
  filename: string;
  uploadedAt: Date;
  pageCount: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'failed';
}

export interface Chunk {
  id: string;
  documentId: string;
  text: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  filename: string;
  pageNumber: number;
  chunkIndex: number;
  sectionTitle?: string;
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
\`\`\`

## 4. Project structure

\`\`\`
ask-your-documents/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── api/
│   │   │   ├── upload/route.ts
│   │   │   ├── query/route.ts
│   │   │   └── documents/route.ts
│   │   └── (dashboard)/
│   │       ├── documents/page.tsx
│   │       └── chat/page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── upload-zone.tsx
│   │   ├── chat-input.tsx
│   │   ├── message-list.tsx
│   │   └── source-citations.tsx
│   ├── lib/
│   │   ├── rag/
│   │   │   ├── pdf-parser.ts
│   │   │   ├── chunker.ts
│   │   │   ├── embedder.ts
│   │   │   ├── vector-store.ts
│   │   │   ├── retriever.ts
│   │   │   └── generator.ts
│   │   ├── anthropic.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── schemas/
│       └── index.ts
├── data/
│   ├── uploads/
│   └── lancedb/
├── eval/
│   ├── golden-questions.json
│   └── run-eval.ts
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## 5. Phase 1 — MVP (Week 1-2)

**Goal:** A working RAG pipeline end-to-end.

### Tasks:

1. **Project setup**
   - \`npx create-next-app@latest cortex --typescript --tailwind --app\`
3. Get Claude API key from console.anthropic.com
4. Build Phase 1, Task 1 by end of day 1
