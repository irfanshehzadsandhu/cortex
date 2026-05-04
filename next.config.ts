import type { NextConfig } from "next";

/** Paths dropped from server output traces (Vercel 250 MB unzipped cap). Picomatch globs from repo root. */
const tracePrune = [
  "./node_modules/pdfjs-dist/cmaps/**/*",
  "./node_modules/pdfjs-dist/legacy/web/cmaps/**/*",
  "./node_modules/pdfjs-dist/standard_fonts/**/*",
  "./node_modules/pdfjs-dist/**/*.map",
  "./node_modules/pdfjs-dist/web/**/*",
  "./node_modules/pdfjs-dist/image_decoders/**/*",
  // Optional native wheels not used on typical Vercel Linux (glibc) runtimes:
  "./node_modules/@lancedb/lancedb-darwin-arm64/**/*",
  "./node_modules/@lancedb/lancedb-linux-x64-musl/**/*",
  "./node_modules/@lancedb/lancedb-linux-arm64-musl/**/*",
  "./node_modules/@lancedb/lancedb-win32-x64-msvc/**/*",
  "./node_modules/@lancedb/lancedb-win32-arm64-msvc/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@lancedb/lancedb",
    "@napi-rs/canvas",
    "apache-arrow",
    "pdf-parse",
    "pdfjs-dist",
  ],
  outputFileTracingExcludes: {
    "/*": tracePrune,
    "/api/upload": tracePrune,
    "/api/query": tracePrune,
  },
};

export default nextConfig;
