import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
    globalIgnores([
        '**/node_modules/',
        '**/dist/',
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
    }
);
