import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.AGENT_BUILDER_URL || 'http://16.79.174.151:8100'
  const apiKey = env.AGENT_BUILDER_API_KEY || ''
  const trustedUser = env.AGENT_BUILDER_USER || ''

  const proxy = {
    '/api': {
      target,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      configure: (proxy: any) => {
        proxy.on('proxyReq', (proxyReq: any) => {
          proxyReq.removeHeader('x-user')
          if (trustedUser) proxyReq.setHeader('X-User', trustedUser)
          if (!apiKey) proxyReq.removeHeader('authorization')
        })
      },
    },
  }

  return {
    plugins: [react()],
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
