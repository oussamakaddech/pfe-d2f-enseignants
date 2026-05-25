/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      utils: path.resolve(__dirname, 'src/utils'),
    },
  },
  base: '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    testTimeout: 60000,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/setupTests.ts',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/styles/themes/tokens.ts',
        'public/**',
        'dist/**',
        'node_modules/**',
      ],
    },
  },
  build: {
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons', '@ant-design/v5-patch-for-react-19'],
          'vendor-chart': ['chart.js', 'react-chartjs-2', 'chartjs-plugin-datalabels'],
          'vendor-xlsx': ['xlsx'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'pdf-lib'],
          'vendor-calendar': ['@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/react'],
          'vendor-animation': ['framer-motion'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'antd',
      '@ant-design/icons',
      '@ant-design/v5-patch-for-react-19',
      'chart.js',
      'react-chartjs-2',
      'chartjs-plugin-datalabels',
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/react',
      'react-big-calendar',
      'framer-motion',
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'react-hook-form',
      '@hookform/resolvers',
      'yup',
      'axios',
      'date-fns',
      'jwt-decode',
      'immer',
      'use-immer',
    ],
  },
  server: {
    fs: {
      strict: true,
    },
  },
});
