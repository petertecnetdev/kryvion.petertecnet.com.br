import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules\/(react|react-dom)\// },
            { name: 'charts-vendor', test: /node_modules\/(recharts|d3-|victory-vendor)/ },
            { name: 'icons-vendor', test: /node_modules\/react-icons\// },
            { name: 'http-vendor', test: /node_modules\/axios\// },
          ],
        },
      },
    },
  },
});
