// Brings up the production-like stack, building images stamped with the exact build version.
//
// A script rather than a one-line package.json command: the version needs the commit SHA from git,
// and command substitution has no syntax shared by Windows `cmd` and POSIX `sh`.

import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { buildVersion, root } from './build-version.js';

const compose = spawnSync(
    'docker',
    [
        'compose',
        '--project-directory',
        root,
        '--file',
        'infra/compose.yaml',
        '--profile',
        'stack',
        'up',
        '--build',
        '--detach',
        '--wait'
    ],
    {
        cwd: root,
        stdio: 'inherit',
        env: {
            ...process.env,
            SINTHRA_IMAGE_VERSION: buildVersion()
        }
    }
);

process.exitCode = compose.status ?? 1;
