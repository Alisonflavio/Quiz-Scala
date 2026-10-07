import type { NextConfig } from "next";

/** Cabeçalhos para todas as páginas. HSTS só vale em HTTPS (o navegador ignora em http://localhost). */
const BASE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** Telas de acesso e painel: proibido embutir em outro site (clickjacking). A página pública do formulário continua embutível. */
const NO_FRAMING = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: BASE_HEADERS },
      ...["/dash/:path*", "/login", "/cadastro", "/confirmar", "/setup"].map((source) => ({
        source,
        headers: NO_FRAMING,
      })),
    ];
  },
  // o banco embutido (PGlite) carrega arquivos .wasm e não pode ser empacotado
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // endereço amigável: a raiz do subdomínio abre direto o diagnóstico (a rota "/" do app só redireciona ao painel)
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "scala.personaltraineracademy.com.br" }],
          destination: "/f/A6BNBSMsX6",
        },
        { source: "/", has: [{ type: "host", value: "diagnostico-scala.vercel.app" }], destination: "/f/A6BNBSMsX6" },
        // o formulário salvo ainda aponta para a foto antiga em PNG; ela agora é a WebP leve, sem mexer no formulário
        { source: "/quiz/falta.png", destination: "/quiz/falta.webp" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
