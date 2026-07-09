import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // hashed precache + skipWaiting kills stale bundles on deploy
      manifest: {
        name: 'Pokédex Battle Sim',
        short_name: 'Pokédex',
        description: 'Pokédex, team builder and 3D battle simulator — league, journey, safari, tower and replays.',
        display: 'standalone',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell only — the heavy media (11MB of audio, scene
        // art) is runtime-cached on first use instead.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['audio/**', 'sounds/**', 'assets/backgrounds/**', 'assets/particles/**', 'assets/trainers/**', 'assets/sprites/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Fresh data while online; cache only as an offline fallback
            urlPattern: /^https:\/\/pokeapi\.co\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pokeapi',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 3600 },
            },
          },
          {
            // Sprite/cry CDNs are immutable — cache-first
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokeapi-cdn',
              expiration: { maxEntries: 1000, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // Bundled scene media (backgrounds, particles, trainers, audio)
            urlPattern: ({ url }) =>
              url.pathname.includes('/assets/backgrounds/') ||
              url.pathname.includes('/assets/particles/') ||
              url.pathname.includes('/assets/trainers/') ||
              url.pathname.includes('/assets/sprites/') ||
              url.pathname.includes('/audio/') ||
              url.pathname.includes('/sounds/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'scene-assets',
              expiration: { maxEntries: 700, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  base: '/pokedex-game-vibe/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
