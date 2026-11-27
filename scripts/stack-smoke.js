// Checks the running stack the way a browser sees it: over HTTP, through nginx on WEB_PORT.
//
// It neither starts nor stops the stack; run it after `pnpm stack:up` has returned. Every check
// runs even when an earlier one fails, so one run reports everything that is broken.

import console from 'node:console';
import process from 'node:process';

import { buildVersion } from './build-version.js';

const port = process.env.WEB_PORT;

if (!port) {
    throw new Error('WEB_PORT must be set in the root .env.');
}

// 127.0.0.1, not localhost: compose publishes nginx on IPv4 loopback only, and localhost may
// resolve to ::1 first.
const origin = `http://127.0.0.1:${port}`;

// The SPA's mount point; the landing page has none, so this tells the two entry pages apart.
const spaMarker = '<div id="root"></div>';

// Exact values, not mere presence: a weakened policy must fail too.
// Keep in step with apps/web/nginx.conf.
const securityHeaders = {
    'content-security-policy':
        "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
};

/**
 * Fetches a path from the stack without following redirects, so a redirect fails the status check
 * instead of being hidden by it.
 *
 * @returns {Promise<{ path: string, status: number, headers: Headers, body: string }>}
 */
async function get(path) {
    const response = await fetch(origin + path, {
        redirect: 'manual',
        signal: AbortSignal.timeout(5000)
    });

    return {
        path,
        status: response.status,
        headers: response.headers,
        body: await response.text()
    };
}

// Fetched once up front; each check awaits the responses it needs, so a failed request fails only
// the checks that depend on it.
const health = get('/api/health');
const spaRoot = get('/app/');
const spaDeepLink = get('/app/smoke/deep/link');
const otlpTraces = get('/v1/traces');
const responses = [health, spaRoot, spaDeepLink, otlpTraces];

// A request can fail before the check that awaits it runs; without a handler attached now, Node
// would treat that as an unhandled rejection and crash before the remaining checks report.
for (const response of responses) {
    response.catch(() => undefined);
}

/**
 * @param {{ path: string, status: number }} response
 * @param {number} expected
 */
function expectStatus(response, expected) {
    if (response.status !== expected) {
        throw new Error(
            `${response.path} returned ${String(response.status)}, expected ${String(expected)}`
        );
    }
}

/** @param {{ path: string, status: number, headers: Headers, body: string }} response */
function expectSpa(response) {
    expectStatus(response, 200);

    if (!response.headers.get('content-type')?.startsWith('text/html')) {
        throw new Error(`${response.path} is not HTML`);
    }

    if (!response.body.includes(spaMarker)) {
        throw new Error(`${response.path} is not the SPA's entry page`);
    }
}

/**
 * Asserts a header on every fetched response: nginx adds them at server level, so static files,
 * proxied API responses and error pages must all carry them.
 *
 * @param {string} name
 * @param {string} expected
 */
async function expectHeaderEverywhere(name, expected) {
    for (const response of await Promise.all(responses)) {
        const actual = response.headers.get(name);

        if (actual !== expected) {
            throw new Error(
                `${response.path} sent ${name}: ${String(actual)}, expected ${expected}`
            );
        }
    }
}

/** @type {[string, () => Promise<void>][]} */
const checks = [
    [
        'GET /api/health reports ok and the current build version',
        async () => {
            const response = await health;

            expectStatus(response, 200);

            const body = JSON.parse(response.body);
            const expected = { status: 'ok', version: buildVersion() };

            if (
                body.status !== expected.status ||
                body.version !== expected.version
            ) {
                throw new Error(
                    `body was ${response.body}, expected ${JSON.stringify(expected)}`
                );
            }
        }
    ],
    ['GET /app/ serves the SPA', async () => expectSpa(await spaRoot)],
    [
        'A deep link under /app/ serves the SPA',
        async () => expectSpa(await spaDeepLink)
    ],
    ...Object.entries(securityHeaders).map(([name, value]) => [
        `Every response carries ${name}`,
        () => expectHeaderEverywhere(name, value)
    ]),
    [
        'The Server header is nginx, with no version',
        () => expectHeaderEverywhere('server', 'nginx')
    ],
    [
        'The reserved OTLP traces path returns 404',
        async () => expectStatus(await otlpTraces, 404)
    ]
];

/**
 * fetch reports every network failure as "fetch failed" and keeps the reason, such as a refused
 * connection, in `cause`.
 */
function errorMessage(error) {
    if (!(error instanceof Error)) {
        return String(error);
    }

    return error.cause instanceof Error
        ? `${error.message}: ${error.cause.message}`
        : error.message;
}

let failed = 0;

for (const [name, check] of checks) {
    try {
        await check();
        console.log(`PASS  ${name}`);
    } catch (error) {
        failed += 1;
        console.log(`FAIL  ${name}`);
        console.log(`      ${errorMessage(error)}`);
    }
}

console.log(
    `\n${String(checks.length - failed)} passed, ${String(failed)} failed`
);
process.exitCode = failed === 0 ? 0 : 1;
