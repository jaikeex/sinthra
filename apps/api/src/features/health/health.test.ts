import { HealthResponse } from '@sinthra/types';
import { Value } from 'typebox/value';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.ts';

describe('GET /api/health', () => {
    it('reports ok and the configured version, shaped by the contract', async () => {
        const app = buildApp({ version: '1.2.3+abc1234' });

        const response = await app.inject({
            method: 'GET',
            url: '/api/health'
        });

        await app.close();

        expect(response.statusCode).toBe(200);

        const body: unknown = response.json();

        expect(Value.Check(HealthResponse, body)).toBe(true);
        expect(body).toEqual({ status: 'ok', version: '1.2.3+abc1234' });
    });
});
