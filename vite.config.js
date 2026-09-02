import { defineConfig } from 'vite';

// GitHub Pages hosts this repo at /abyssa/; Vercel (VERCEL=1) and any
// other root deployment get '/'. One build, both targets — zero config.
const base = process.env.VERCEL ? '/' : '/abyssa/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
});
