import './offline-guard.mjs';
import { fileURLToPath } from 'node:url';
// Explicit JSX config and no shared disk cache; no tsx CLI IPC server.
process.env.TSX_DISABLE_CACHE = '1';
const { register } = await import('tsx/esm/api');
register({ tsconfig: fileURLToPath(new URL('../tsconfig.app.json', import.meta.url)) });
