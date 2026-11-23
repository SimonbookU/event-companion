import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Deploy under a sub-path with: npm run build -- --base=/event-companion/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/*.png'],
      manifest: {
        name: 'bookU Event Companion',
        short_name: 'bookU Events',
        description: 'Delegate cards for the bookU team at events.',
        theme_color: '#1D126D',
        background_color: '#1D126D',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
