import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // No default address: the proxy target comes from the environment only. A build needs no target.
  const target = env.AGENT_BUILDER_URL
  if (command === 'serve' && !target) {
    throw new Error('AGENT_BUILDER_URL is not set. Copy .env.example to .env and set it to the Agent Builder API address.')
  }
  const apiKey = env.AGENT_BUILDER_API_KEY || ''
  const trustedUser = env.AGENT_BUILDER_USER || ''

  const proxy = {
    '/api': {
      target: target ?? '',
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
