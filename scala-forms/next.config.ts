import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o banco embutido (PGlite) carrega arquivos .wasm e não pode ser empacotado
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // endereço amigável: a raiz do subdomínio abre direto o diagnóstico (a rota "/" do app só redireciona ao painel)
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", has: [{ type: "host", value: "scala.personaltraineracademy.com.br" }], destination: "/f/A6BNBSMsX6" },
        { source: "/", has: [{ type: "host", value: "diagnostico-scala.vercel.app" }], destination: "/f/A6BNBSMsX6" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
