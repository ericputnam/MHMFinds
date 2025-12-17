import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./__tests__/setup/setup.ts'],
        include: ['__tests__/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', '.next', 'newapp_musthavemods'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/**',
                '.next/**',
                '**/*.d.ts',
                'scripts/**',
                'prisma/**',
                'newapp_musthavemods/**',
                '__tests__/**',
                '*.config.*',
            ],
            thresholds: {
                // Start with lower thresholds, increase as coverage improves
                lines: 50,
                branches: 50,
                functions: 50,
                statements: 50,
            }
        },
        alias: {
            '@': path.resolve(__dirname, '.'),
            '@/lib': path.resolve(__dirname, './lib'),
            '@/components': path.resolve(__dirname, './components'),
            '@/app': path.resolve(__dirname, './app'),
        },
        // Timeout for async tests
        testTimeout: 10000,
        hookTimeout: 10000,
    },
})
