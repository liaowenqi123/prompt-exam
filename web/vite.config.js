import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // 相对路径，方便部署到任意子路径
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 开发环境下，把 /api 转发给本地后端（server 在 6666 端口）
      '/api': {
        target: 'http://localhost:6666',
        changeOrigin: true,
      },
    },
  },
});
