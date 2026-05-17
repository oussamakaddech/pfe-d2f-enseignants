import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
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
      strict: false,
    },
  },
});
