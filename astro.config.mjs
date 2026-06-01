// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/consts';

// https://astro.build/config
export default defineConfig({
  // Used for absolute URLs (sitemap, RSS, canonical). Update to your domain.
  site: SITE.url,

  // Pure static output — builds plain files into ./dist for Cloudflare.
  // To switch to SSR on Cloudflare Workers later:
  //   pnpm add @astrojs/cloudflare
  //   import cloudflare from '@astrojs/cloudflare';
  //   add: output: 'server', adapter: cloudflare()
  output: 'static',

  integrations: [mdx(), sitemap()],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
