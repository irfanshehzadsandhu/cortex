import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@lancedb/lancedb",
    "@napi-rs/canvas",
    "apache-arrow",
    "pdf-parse",
    "pdfjs-dist",
  ],
  // Shrink serverless traces: pdfjs ships large cmap / font trees; text extraction for typical
  // PDFs does not need them. Drop from the deployment bundle to stay under Vercel's 250 MB cap.
  outputFileTracingExcludes: {
    "/api/upload": [
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/legacy/web/cmaps/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
    "/api/query": [
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/legacy/web/cmaps/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
  },
};

export default nextConfig;
