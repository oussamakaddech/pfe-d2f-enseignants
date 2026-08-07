/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
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
    // kpi-test.spec.ts is a standalone Playwright e2e script, not a vitest unit test.
    exclude: [...configDefaults.exclude, '**/kpi-test.spec.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 20,
        statements: 30,
      },
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('antd') || id.includes('@ant-design')) return 'vendor-antd';
            if (id.includes('react-dom') || id.includes('react-router') || id.match(/node_modules[\\/]react[\\/]/)) return 'vendor-react';
            if (id.includes('chart.js') || id.includes('react-chartjs') || id.includes('chartjs-plugin-datalabels')) return 'vendor-chart';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('jspdf') || id.includes('pdf-lib')) return 'vendor-pdf';
            if (id.includes('@fullcalendar')) return 'vendor-calendar';
            if (id.includes('framer-motion')) return 'vendor-animation';
          }
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
    // Proxy les appels /api vers le API Gateway (port 8080) en dev.
    // Évite les erreurs CORS et permet au frontend Vite (port 3000) de
    // consommer les microservices via le gateway comme en production.
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
