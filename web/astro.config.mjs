import { defineConfig } from 'astro/config';

const SITE = process.env.AHR999_SITE ?? 'https://ahr999.aix4u.com';
const BASE = process.env.AHR999_BASE ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      sourcemap: false,
    },
  },
});
