import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@lancedb/lancedb',
    'apache-arrow',
    'pdf-parse',
    'pdfjs-dist',
  ],
};

export default nextConfig;
