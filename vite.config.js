import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Endre 'puslevenn' til ditt repo-navn hvis det er annerledes
  base: '/puslevenn/',
});
