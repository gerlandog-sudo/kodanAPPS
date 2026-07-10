/**
 * Centralized configuration for ui-core.
 *
 * Reads `VITE_API_URL` from the Vite environment (.env file or build env).
 * Falls back gracefully:
 * - Dev (`vite dev`): `http://localhost:8080`
 * - Build/prod: `https://api.kodan.software` with a console warning
 *   (set `VITE_API_URL` explicitly to silence it).
 */
export const API_BASE: string = (() => {
  const url = import.meta.env.VITE_API_URL;
  if (url && typeof url === 'string') return url;

  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }

  console.warn(
    '[ui-core] VITE_API_URL no está configurado. Usando https://api.kodan.software como fallback. ' +
    'Define VITE_API_URL en tu .env o entorno de build.',
  );
  return 'https://api.kodan.software';
})();
