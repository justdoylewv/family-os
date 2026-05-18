import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};
const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? '';

export default defineConfig({
  plugins: [
    {
      name: 'inject-build-meta',
      transformIndexHtml(html) {
        return html.replace(
          '<title>',
          `<meta name="app-version" content="${pkg.version}" />\n    <meta name="app-commit" content="${commit}" />\n    <title>`,
        );
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Family OS',
        short_name: 'Family OS',
        description: 'Family scheduling, chores, meals, and groceries.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(`v${pkg.version}`),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
