/**
 * Centralized configuration for ui-core.
 *
 * - In development (`vite dev`): defaults to `http://localhost:8080`
 *   so every developer can start without manually creating .env files.
 * - In production builds (`vite build`): fails hard if `VITE_API_URL`
 *   is not set, preventing accidental use of a wrong API.
 */
export const API_BASE: string = (() => {
  const url = import.meta.env.VITE_API_URL;
  if (url && typeof url === 'string') return url;

  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }

  throw new Error(
    '[ui-core] VITE_API_URL is not configured. ' +
    'Set it in your .env file or build environment. ' +
    'Example: VITE_API_URL=https://api.kodan.software',
  );
})();
