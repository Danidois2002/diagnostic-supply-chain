import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Publié sur GitHub Pages sous /diagnostic-supply-chain/ ; les images sont dans public/img (chemins relatifs « img/… »)
export default defineConfig({
  base: '/diagnostic-supply-chain/',
  plugins: [react()],
});
