import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ahr999.aix4u.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/zrender/')) return 'zrender';
            if (id.includes('/node_modules/echarts/')) return 'echarts';
          },
        },
      },
    },
  },
});
