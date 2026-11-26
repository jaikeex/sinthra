import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Health } from './Health.tsx';

const root = document.getElementById('root');

if (!root) {
    throw new Error('app/index.html has no #root element to render into.');
}

createRoot(root).render(
    <StrictMode>
        <main>
            <h1>Sinthra</h1>
            <Health />
        </main>
    </StrictMode>
);
