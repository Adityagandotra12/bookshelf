import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ignoreBadDtsPlugin = () => ({
  name: 'ignore-bad-dts',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id.includes('.test.d.ts') || id.includes('.d.ts.map')) {
      return '\0empty-dts'
    }
    return null
  },
  load(id: string) {
    if (id === '\0empty-dts') return 'export {}'
    return null
  },
})

// https://vite.dev/config/
export default defineConfig({
  appType: 'spa',
  build: {
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Remove /api prefix; keep leading slash so backend gets /auth/login
        rewrite: (path) => '/' + (path.replace(/^\/api\/?/, '') || ''),
      },
    },
  },
  plugins: [
    ignoreBadDtsPlugin(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
