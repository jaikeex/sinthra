import { Type, type Static } from 'typebox';
import { Value } from 'typebox/value';

import type { AppConfig } from './app.ts';

// Here rather than `@sinthra/types`: the environment is not needed anywhere else (at least in js).
const Env = Type.Object({
    API_HOST: Type.String({ minLength: 1 }),
    API_PORT: Type.Integer({ minimum: 1, maximum: 65535 }),
    SINTHRA_VERSION: Type.String({
        pattern: /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.source // semver
    })
});

type Env = Static<typeof Env>;

export interface ServerConfig {
    host: string;
    app: AppConfig;
    port: number;
}

/** Thrown when the environment is missing a variable or holds an invalid value. */
export class ConfigError extends Error {
    override name = 'ConfigError';
}

/**
 * Reads and validates the API's environment variables.
 *
 * @throws {ConfigError} listing every missing or invalid variable, so one run reports them all.
 */
export function loadConfig(source: NodeJS.ProcessEnv): ServerConfig {
    const names = Object.keys(Env.properties);

    // Checked before conversion, which would turn an unset variable into `""` or `0` and report a
    // confusing range error instead of the plain fact that it is missing.
    const missing = names.filter((name) => !source[name]);

    if (missing.length > 0) {
        throw new ConfigError(
            `Missing API environment variables:\n${missing.map((name) => `  ${name}`).join('\n')}`
        );
    }

    // Environment values are always strings; conversion turns `API_PORT` into a number.
    const env = Value.Convert(
        Env,
        Object.fromEntries(names.map((name) => [name, source[name]]))
    );

    if (!Value.Check(Env, env)) {
        const problems = Value.Errors(Env, env).map(
            (error) =>
                `  ${error.instancePath.replace(/^\//, '')}: ${error.message}`
        );

        throw new ConfigError(
            `Invalid API environment:\n${problems.join('\n')}`
        );
    }

    return toServerConfig(env);
}

function toServerConfig(env: Env): ServerConfig {
    return {
        app: { version: env.SINTHRA_VERSION },
        host: env.API_HOST,
        port: env.API_PORT
    };
}
