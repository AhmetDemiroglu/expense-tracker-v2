import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages repo adınıza göre burayı düzenleyin.
  // Eğer repo adınız 'expense-tracker-v2' ise:
  base: '/expense-tracker-v2/',
});