/**
 * Centralized configuration for ui-core.
 * Fail-fast: throws at module init if `VITE_API_URL` is not set.
 */
export const API_BASE: string = (() => {
  const url = import.meta.env.VITE_API_URL;
  if (!url || typeof url !== 'string') {
    throw new Error(
      '[ui-core] VITE_API_URL is not configured. ' +
      'Set it in your .env file or environment. ' +
      'Example: VITE_API_URL=http://localhost:8080',
    );
  }
  return url;
})();
