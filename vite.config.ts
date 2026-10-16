/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `--mode artifact` builds a self-contained guest-mode demo (relative paths, no service worker)
export default defineConfig(({ mode }) => ({
  base: mode === 'artifact' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Huayulah — Singaporean Mandarin',
        short_name: 'Huayulah',
        description: 'Learn the Mandarin Singaporeans actually speak.',
        theme_color: '#42805d',
        background_color: '#f5f6f1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Ah Tat's clips: fetched whole by the player, kept once played
            urlPattern: ({ url }) => url.pathname.startsWith('/otter/') && /\.(webm|mp4)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'otter-clips',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // stroke data copied into public/strokes at build time
            urlPattern: ({ url }) => url.pathname.startsWith('/strokes/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'strokes',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // hanzi-writer stroke data
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/hanzi-writer-data/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hanzi-strokes',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/rules/**', 'node_modules/**'],
  },
}))
