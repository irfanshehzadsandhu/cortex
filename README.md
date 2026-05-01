# Cortex - PDF RAG Assistant

Cortex is a Next.js-based Retrieval-Augmented Generation (RAG) app that lets you upload PDF documents and ask questions grounded in their contents.

## Features

- Upload PDF files for ingestion
- Automatic PDF parsing and text chunking
- Local vector search with LanceDB
- Retrieval-augmented question answering with citations
- Document listing and deletion UI

## Models Used

- Generation model: `Qwen/Qwen2.5-7B-Instruct` (via Hugging Face Inference API)
- Embedding model: `Xenova/all-MiniLM-L6-v2` (via `@xenova/transformers`)

## Tech Stack

- Framework: Next.js 16, React 19, TypeScript
- Vector DB: LanceDB (`data/lancedb`)
- PDF parsing: `pdf-parse`
- Chunking: LangChain `RecursiveCharacterTextSplitter`
- Embeddings: `@xenova/transformers`
- LLM calls: `@huggingface/inference`

## How It Works

1. User uploads a PDF via `/api/upload`
2. Server parses PDF text page-by-page
3. Text is chunked (`chunkSize: 512`, `chunkOverlap: 64`)
4. Chunks are embedded and stored in LanceDB
5. User submits a query via `/api/query`
6. Query embedding retrieves top-k relevant chunks
7. LLM generates grounded response from retrieved context

## Project Structure

- `app/(dashboard)/documents/page.tsx`: Upload/list documents
- `app/(dashboard)/chat/page.tsx`: Chat UI
- `app/api/upload/route.ts`: Ingestion endpoint
- `app/api/query/route.ts`: RAG query endpoint
- `app/api/documents/route.ts`: List/delete documents
- `src/lib/rag/`: Parser, chunker, embedder, retriever, generator, vector store
- `src/lib/document-store.ts`: In-memory document metadata

## Environment Variables

Create a `.env.local` file:

```bash
HUGGINGFACE_API_KEY=your_huggingface_token
```

In Vercel, add the same variable in Project Settings -> Environment Variables.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

### 1) Push repository to GitHub

Commit and push your project.

### 2) Import project in Vercel

- Go to [https://vercel.com/new](https://vercel.com/new)
- Import your GitHub repository
- Framework preset should auto-detect as Next.js

### 3) Configure environment variable

Set:

- `HUGGINGFACE_API_KEY`: Your Hugging Face token

### 4) Deploy

Trigger a deployment from Vercel or push to your production branch.

## Important Vercel Runtime Notes

This app currently uses:

- In-memory document metadata store (`src/lib/document-store.ts`)
- Local filesystem-backed LanceDB (`data/lancedb`)

On Vercel serverless runtimes, these are ephemeral and not durable across invocations/deployments. That means uploaded documents/chunks may be lost and metadata will not be reliably shared.

For production on Vercel, replace these with persistent services:

- Metadata store: Postgres/Neon/Supabase/PlanetScale
- Vector store: Pinecone/Qdrant/Weaviate/pgvector
- File storage (if needed): Vercel Blob/S3/R2

Without these changes, Vercel deployment is best treated as a demo/prototype.

## API Endpoints

### `POST /api/upload`

Upload PDF as `multipart/form-data` with `file`.

Response:

```json
{ "documentId": "...", "status": "processing" }
```

### `GET /api/documents`

List all uploaded document metadata.

### `DELETE /api/documents?id=<documentId>`

Delete document metadata and vectors for one document.

### `POST /api/query`

Request body:

```json
{
  "query": "What does the document say about refunds?",
  "topK": 5,
  "documentIds": ["optional-doc-id"]
}
```

Response includes:

- `answer`
- `citations`
- `retrievedChunks`

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build app
- `npm run start`: Run production build
- `npm run lint`: Run ESLint

## Production Hardening Checklist

- Move metadata from in-memory map to a persistent DB
- Move vectors from local LanceDB to a managed vector DB
- Add auth/authorization for upload/query endpoints
- Add upload limits and PDF validation safeguards
- Add retry/queue for ingestion jobs
- Add observability (logs, tracing, error monitoring)
