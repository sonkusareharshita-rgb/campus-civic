import react   from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Campus Civic',
        short_name: 'CampusCivic',
        description: 'Crowdsourced campus issue reporting — report, track, and resolve campus problems.',
        theme_color: '#07070d',
        background_color: '#07070d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['education', 'utilities'],
        lang: 'en',
        dir: 'ltr'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache API calls for 5 minutes (stale-while-revalidate)
            urlPattern: /^http:\/\/localhost:5000\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'campus-civic-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60,
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
