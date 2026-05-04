import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@lancedb/lancedb',
    '@napi-rs/canvas',
    'apache-arrow',
    'pdf-parse',
    'pdfjs-dist',
  ],
};

export default nextConfig;
