// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

/** Published version for offline downloads; independent of the nightly base. */
const { version } = JSON.parse(
  readFileSync(new URL('./released-version.json', import.meta.url), 'utf8'),
);

// Tailwind v4 is applied through its Vite plugin; the legacy @astrojs/tailwind
// integration only supports Astro <= 5.
// https://astro.build/config
export default defineConfig({
  site: 'https://4gray.github.io',
  base: '/iptvnator',
  outDir: '../../dist/apps/website',
  integrations: [sitemap(), mdx()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      __IPTVNATOR_RELEASED_VERSION__: JSON.stringify(version),
    },
  },
});
