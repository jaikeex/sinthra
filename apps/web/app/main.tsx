import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Health } from './Health.tsx';

const root = document.getElementById('root');

if (!root) {
    throw new Error('app/index.html has no #root element to render into.');
}

createRoot(root).render(
    <StrictMode>
        <main className="space-y-4 p-4">
            <h1 className="text-3xl font-bold">Sinthra</h1>
            <Health />
        </main>
    </StrictMode>
);
