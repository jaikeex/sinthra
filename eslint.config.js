import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
    globalIgnores([
        '**/node_modules/',
        '**/dist/',
        '**/.venv/',
        '.scratch/',
        'docs/comments/'
    ]),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    {
        // Plain JS config files sit outside every tsconfig, so type-aware rules cannot run on them.
        files: ['**/*.js'],
        extends: [tseslint.configs.disableTypeChecked]
    },
    {
        // The root scripts run on Node, whose web-platform globals have no module to import from.
        // Node-specific ones such as `process` and `console` are imported from `node:` instead.
        files: ['scripts/**/*.js'],
        languageOptions: {
            globals: { fetch: 'readonly', AbortSignal: 'readonly' }
        }
    }
);
