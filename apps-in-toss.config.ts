import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gongmoalarm',
  brand: {
    primaryColor: '#6D28D9', // 앱 대표색(바이올렛) — src/styles/tokens.css의 --color-accent와 같은 값
  },
  permissions: [],
  webBundleDir: 'dist',
});
