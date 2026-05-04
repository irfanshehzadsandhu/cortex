# Cortex - PDF RAG Assistant

Cortex is a Next.js-based Retrieval-Augmented Generation (RAG) app that lets you upload PDF documents and ask questions grounded in their contents.

## Node.js version

This repo targets **Node.js 24.x** (see `.nvmrc` and `package.json` → `engines`). With [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install   # if you don’t have 24.x yet
nvm use
```

## Features

- Upload PDF files for ingestion
- Automatic PDF parsing and text chunking
- Local vector search with LanceDB
- Retrieval-augmented question answering with citations
- Document listing and deletion UI

## Models Used

- Generation model: `Qwen/Qwen2.5-7B-Instruct` (via Hugging Face Inference API)
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2` (via Hugging Face Inference API, 384-dim)

## Tech Stack

- Framework: Next.js 16, React 19, TypeScript
- Vector DB: LanceDB (local `data/lancedb`, or `/tmp` on Vercel)
- PDF parsing: `pdf-parse`
- Chunking: in-repo recursive character splitter (same separator order as LangChain defaults)
- Embeddings & LLM: `@huggingface/inference`
- Document metadata (Vercel / multi-instance): **Upstash Redis** via `@upstash/redis`

## How It Works

1. User uploads a PDF via `/api/upload`
2. Server parses PDF text page-by-page
3. Text is chunked (`chunkSize: 512`, `chunkOverlap: 64`)
4. Chunks are embedded (HF API) and stored in LanceDB
5. User submits a query via `/api/query`
6. Query embedding retrieves top-k relevant chunks
7. LLM generates grounded response from retrieved context

## Project Structure

- `app/(dashboard)/documents/page.tsx`: Upload/list documents
- `app/(dashboard)/chat/page.tsx`: Chat UI
- `app/api/upload/route.ts`: Ingestion endpoint
- `app/api/query/route.ts`: RAG query endpoint
- `app/api/documents/route.ts`: List documents (`GET`)
- `app/api/documents/[id]/route.ts`: Delete document + vectors (`DELETE`)
- `src/lib/rag/`: Parser, chunker, embedder, retriever, generator, vector store
- `src/lib/document-store.ts`: Document metadata (in-memory locally, **Upstash Redis** when env is set)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `HUGGINGFACE_API_KEY` | Yes | Hugging Face token for embeddings + chat |
| `UPSTASH_REDIS_REST_URL` | For Vercel / shared list | **HTTPS** REST URL only (`https://…upstash.io`). Do **not** use the `redis://…:6379` “Redis URL” from Upstash — that is for TCP clients, not `@upstash/redis`. |
| `UPSTASH_REDIS_REST_TOKEN` | For Vercel / shared list | Same **REST API** panel as the URL (long token, not the password embedded in `redis://`) |
| `HUGGINGFACE_EMBEDDING_MODEL` | No | Override embedding model (must stay 384-dim for current LanceDB schema) |

Legacy `KV_REST_API_URL` / `KV_REST_API_TOKEN` are still read if the Upstash-prefixed vars are unset.

On **Vercel**, add the same variables under Project → Settings → Environment Variables, then redeploy.

## Upstash Redis (free tier)

1. Sign up at [Upstash](https://upstash.com/) and create a **Redis** database (same region as Vercel helps latency).
2. Open the database → **REST API** (not “Connect” / `redis://`) → copy the **https://** endpoint and the **REST token** into `.env.local` and Vercel.
3. Redeploy. The documents list uses Redis so uploads appear regardless of which serverless instance handles the request.

## Local Development

```bash
nvm use
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Upstash env vars, metadata stays in-memory (fine for a single local process).

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new) (Next.js preset).
3. Set `HUGGINGFACE_API_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` for Production (and Preview if needed).
4. Deploy.

### Vercel runtime notes

- **Document metadata** is durable across instances when Upstash env vars are set.
- **LanceDB vectors** on Vercel use `/tmp` per instance and are ephemeral; chat retrieval may miss chunks if upload and query hit different instances. For a portfolio, low traffic often masks this; for reliable RAG on serverless, use a hosted vector DB (e.g. pgvector, Pinecone).

## API Endpoints

### `POST /api/upload`

Upload PDF as `multipart/form-data` with `file`.

Response (HTTP 200 after ingestion finishes on the server):

```json
{ "documentId": "...", "status": "ready" }
```

If ingestion fails (PDF parse, Hugging Face API, LanceDB, etc.):

```json
{ "documentId": "...", "status": "failed", "error": "…message…" }
```

The same error is stored on the document as `errorMessage` for the list UI. On Vercel Hobby, function time is limited (~10s); large PDFs may need a higher limit (see `maxDuration` in `app/api/upload/route.ts`) or a Pro plan.

### `GET /api/documents`

List all uploaded document metadata.

### `DELETE /api/documents/<documentId>`

Delete document metadata and vectors for one document (path segment, URL-encoded id).

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

- Move vectors from local LanceDB to a managed vector DB for reliable serverless RAG
- Add auth/authorization for upload/query endpoints
- Add upload limits and PDF validation safeguards
- Add retry/queue for ingestion jobs
- Add observability (logs, tracing, error monitoring)
