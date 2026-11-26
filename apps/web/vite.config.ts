import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const repoRoot = resolve(import.meta.dirname, '../..');

export default defineConfig(({ command, mode }) => ({
    plugins: [react()],
    build: {
        rolldownOptions: {
            input: {
                landing: resolve(import.meta.dirname, 'index.html'),
                app: resolve(import.meta.dirname, 'app/index.html')
            }
        }
    },

    // The proxy exists only in dev; in production nginx forwards /api. Building must not
    // require the API's address from .env, since the build runs without one.
    ...(command === 'serve' && { server: { proxy: apiProxy(mode) } })
}));

/**
 * Forwards /api to the host-run API, so the SPA calls it same-origin, as it does behind nginx.
 *
 * @throws {Error} when the root .env lacks the API's address.
 */
function apiProxy(mode: string) {
    const { API_HOST, API_PORT } = loadEnv(mode, repoRoot, 'API_');

    if (!API_HOST || !API_PORT) {
        throw new Error(
            'API_HOST and API_PORT must be set in the root .env for the dev proxy.'
        );
    }

    return { '/api': `http://${API_HOST}:${API_PORT}` };
}
