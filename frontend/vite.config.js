import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '')
  if (command === 'build') {
    const apiBase = String(env.VITE_API_BASE_URL || '').trim()
    // Validation removed for Capacitor local network testing
  }
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'guardx-icon.svg', 'favicon.svg'],
        manifest: {
          name: 'GuardX',
          short_name: 'GuardX',
          theme_color: '#15BCDF',
          background_color: '#F2F1F0',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              urlPattern: /^\/api/,
              handler: 'NetworkOnly'
            }
          ]
        },
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw.js',
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    // NOTE: This allows any host for local tunnels. Review before any real production deployment.
    preview: {
      allowedHosts: true,
    },
  }
})
