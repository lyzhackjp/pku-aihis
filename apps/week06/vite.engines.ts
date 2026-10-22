import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'src/assets/ocr',emptyOutDir:true,target:'es2022',assetsInlineLimit:0,rollupOptions:{preserveEntrySignatures:'strict',input:'src/engines/index.ts',output:{entryFileNames:'engines.js',chunkFileNames:'[name]-[hash].js',assetFileNames:'[name]-[hash][extname]'}}},worker:{format:'es'}});
