import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.ts';
import { ConfigError, loadConfig } from './config.ts';

function loadConfigOrExit() {
    try {
        return loadConfig(process.env);
    } catch (error) {
        if (error instanceof ConfigError) {
            console.error(error.message);
            process.exit(1);
        }

        throw error;
    }
}

// Close stops accepting connections and lets in-flight requests finish before the process exits.
async function shutdown(signal: NodeJS.Signals, app: FastifyInstance) {
    app.log.info({ signal }, 'shutting down');
    try {
        await app.close();
    } catch (error) {
        app.log.error(error, 'error during shutdown');
        process.exitCode = 1;
    }
}

const config = loadConfigOrExit();
const app = buildApp(config.app, { logger: true });

process.once('SIGTERM', (signal) => void shutdown(signal, app));
process.once('SIGINT', (signal) => void shutdown(signal, app));

await app.listen({ host: config.host, port: config.port });
