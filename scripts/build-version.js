import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';

import manifest from '../package.json' with { type: 'json' };

export const root = dirname(import.meta.dirname);

/**
 * The version the stack's images are stamped with: the root package version plus the short SHA of
 * the checked-out commit, e.g. `0.1.0+90ce11b`.
 */
export function buildVersion() {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: root,
        encoding: 'utf8'
    }).trim();

    return `${manifest.version}+${sha}`;
}
