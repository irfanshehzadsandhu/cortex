import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@lancedb/lancedb', '@xenova/transformers', 'pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
