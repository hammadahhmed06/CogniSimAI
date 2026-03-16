import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
    proxy: {
      // Proxy API requests to the FastAPI backend in dev to avoid CORS
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Performance optimizations
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Conservative manual chunk splitting for stability in prod builds
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          auth: ['@supabase/supabase-js']
        },
        // Add hash to filenames to bust cache
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    },
    // Enable source maps for debugging but optimize for production
    sourcemap: mode === 'development',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000
  },
  // Performance hints
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion'],
    exclude: ['@vite/client', '@vite/env']
  }
}));
