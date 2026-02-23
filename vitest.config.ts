import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['src/**/__tests__/**/*.test.ts'],
        exclude: ['node_modules', '.next'],
        environment: 'node',
        api: {
            host: '127.0.0.1',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
