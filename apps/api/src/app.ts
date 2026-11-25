import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { Type, type Static } from 'typebox';

import { health } from './features/health/index.ts';

/** Everything the app needs to run; loaded and validated by the server entry point. */
export const AppConfig = Type.Object({
    version: Type.String()
});

export type AppConfig = Static<typeof AppConfig>;

/** Fastify options that only matter to how the process runs, not to what the app does. */
export type AppRuntimeOptions = Pick<FastifyServerOptions, 'logger'>;

/**
 * Builds a fully wired API without listening.
 *
 * @throws {AssertError} when `config` does not match {@link AppConfig}.
 */
export function buildApp(config: AppConfig, runtime: AppRuntimeOptions = {}) {
    const app = Fastify(runtime).withTypeProvider<TypeBoxTypeProvider>();

    // Every feature is registered here by hand: this list is the API's whole route surface.
    void app.register(health, { prefix: '/api', version: config.version });

    return app;
}
