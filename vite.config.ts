import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import { forwardedUser } from './src/utils/forwardedUser'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // No default address: the proxy target comes from the environment only. A build needs no target.
  const target = env.AGENT_BUILDER_URL
  if (command === 'serve' && !target) {
    throw new Error('AGENT_BUILDER_URL is not set. Copy .env.example to .env and set it to the Agent Builder API address.')
  }
  const apiKey = env.AGENT_BUILDER_API_KEY || ''
  const fallbackUser = env.AGENT_BUILDER_USER || ''

  const proxy: Record<string, ProxyOptions> = {
    '/api': {
      target: target ?? '',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      configure: (proxyServer) => {
        proxyServer.on('proxyReq', (proxyReq, req) => {
          // The signed-in user (temporary sign-in) is who saves, publishes and deploys; AGENT_BUILDER_USER is the
          // fallback for requests without one. The API key is only ever added here, never by the browser.
          const user = forwardedUser(req.headers['x-user'], fallbackUser)
          proxyReq.removeHeader('x-user')
          if (user) proxyReq.setHeader('X-User', user)
          if (!apiKey) proxyReq.removeHeader('authorization')
        })
      },
    },
  }

  return {
    plugins: [react()],
    resolve: {
      // Matches "paths" in tsconfig.json; shadcn components import from "@/…".
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
