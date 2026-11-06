import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, normalizePath, type Plugin } from 'vite'

/**
 * index.html preloads the Archivo font by its path in node_modules, which the
 * build turns into the same hashed /assets URL the CSS uses. The dev server
 * serves that file from /@fs/ instead, so point the preload there in dev too.
 */
function devNodeModulesPreload(): Plugin {
  const root = fileURLToPath(new URL('.', import.meta.url))
  return {
    name: 'orbit:dev-node-modules-preload',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(
          /(<link[^>]*rel="preload"[^>]*href=")((?:\.\.\/)+node_modules\/[^"]+)"/gs,
          (_match, prefix: string, href: string) =>
            `${prefix}/@fs/${normalizePath(resolve(root, href))}"`,
        ),
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devNodeModulesPreload()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replaceAll('\\', '/')
          if (!moduleId.includes('/node_modules/')) return undefined

          if (
            ['/react/', '/react-dom/', '/react-router/', '/scheduler/'].some((dependency) =>
              moduleId.includes(`/node_modules${dependency}`),
            )
          ) {
            return 'vendor-react'
          }
          if (
            ['/i18next/', '/react-i18next/'].some((dependency) =>
              moduleId.includes(`/node_modules${dependency}`),
            )
          ) {
            return 'vendor-i18n'
          }
          if (
            ['/node_modules/@tanstack/', '/node_modules/zustand/'].some((dependency) =>
              moduleId.includes(dependency),
            )
          ) {
            return 'vendor-data'
          }
          // Everything else (Radix, forms, cmdk, framer-motion, recharts) is left to
          // Rollup so each route preloads only the libraries it actually imports.
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Same-origin API in development: the Vite dev server proxies
      // /api to the Express backend, mirroring the NGINX production setup.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
