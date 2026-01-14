import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/finage': {
        target: 'https://api.finage.co.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/finage/, ''),
        secure: true,
        headers: {
          'Origin': 'https://api.finage.co.uk',
        },
      },
      '/api/cmc': {
        target: 'https://pro-api.coinmarketcap.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cmc/, ''),
        secure: true,
        headers: {
          'X-CMC_PRO_API_KEY': '537cba8100914c7f8b2de2cb147c3772',
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
