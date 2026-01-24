import { defineConfig } from 'vitest/config'
import path from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Use jsdom for React component tests, node for pure unit tests
    environment: 'jsdom',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: [
      'node_modules',
      '.next',
    ],
    // Setup file for React Testing Library and global mocks
    setupFiles: ['./src/test/setup.ts'],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/lib/**/*.ts',
        'src/features/**/*.ts',
        'src/components/**/*.tsx',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/test/**/*',
        'src/lib/supabase/types.ts',
        'src/**/*.d.ts',
      ],
      // Coverage thresholds - will enforce these after Phase 2
      // thresholds: {
      //   lines: 60,
      //   branches: 50,
      //   functions: 60,
      //   statements: 60,
      // },
    },
    // Timeout for async tests
    testTimeout: 10000,
    // Pool settings for performance
    pool: 'forks',
    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
