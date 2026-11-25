import { Type, type Static } from 'typebox';

export const HealthResponse = Type.Object(
    {
        status: Type.Literal('ok'),
        version: Type.String()
    },
    { additionalProperties: false }
);
export type HealthResponse = Static<typeof HealthResponse>;
