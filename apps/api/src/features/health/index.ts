import type { FastifyPluginCallbackTypebox } from '@fastify/type-provider-typebox';
import { HealthResponse } from '@sinthra/types';

export interface HealthOptions {
    version: string;
}

export const health: FastifyPluginCallbackTypebox<HealthOptions> = (
    app,
    { version },
    done
) => {
    app.get(
        '/health',
        { schema: { response: { 200: HealthResponse } } },
        () => ({
            status: 'ok' as const,
            version
        })
    );

    done();
};
