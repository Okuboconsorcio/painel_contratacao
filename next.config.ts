import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Currículo em PDF passa de 1 MB com facilidade; o padrão do Next corta antes.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
