import type { HealthResponse } from '@sinthra/types';
import { useEffect, useState } from 'react';

type HealthState =
    | { kind: 'loading' }
    | { kind: 'loaded'; health: HealthResponse }
    | { kind: 'failed'; reason: string };

/** Shows the API's health status and version, or why it could not be fetched. */
export function Health() {
    const [state, setState] = useState<HealthState>({ kind: 'loading' });

    useEffect(() => {
        const controller = new AbortController();

        fetchHealth(controller.signal).then(
            (health) => {
                setState({ kind: 'loaded', health });
            },
            (error: unknown) => {
                // Aborted by the cleanup below: the component is gone, so nothing is left to show.
                if (controller.signal.aborted) return;

                setState({
                    kind: 'failed',
                    reason:
                        error instanceof Error ? error.message : String(error)
                });
            }
        );

        return () => {
            controller.abort();
        };
    }, []);

    switch (state.kind) {
        case 'loading':
            return <p>Checking API health…</p>;
        case 'failed':
            return <p>API health check failed: {state.reason}</p>;
        case 'loaded':
            return (
                <dl>
                    <dt>Status</dt>
                    <dd>{state.health.status}</dd>
                    <dt>Version</dt>
                    <dd>{state.health.version}</dd>
                </dl>
            );
    }
}

/**
 * Fetches `/api/health`.
 *
 * @throws {Error} when the request fails or the API answers with a non-2xx status.
 */
async function fetchHealth(signal: AbortSignal): Promise<HealthResponse> {
    const response = await fetch('/api/health', { signal });

    if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
    }

    // Trusted, not re-validated: the API serializes this body through the same contract schema.
    return (await response.json()) as HealthResponse;
}
