/**
 * Central API client helper for SpectraSense.
 * Ensures consistent routing whether running in dev (Vite), preview,
 * directly served from FastAPI, or deployed on a remote host.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    return `${envUrl.replace(/\/+$/, '')}${cleanPath}`;
  }

  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    // When developing/testing locally on Vite dev or preview (e.g. 4173, 5173, 3000):
    if (port && port !== '8000' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return `http://${hostname}:8000${cleanPath}`;
    }
  }

  return cleanPath;
}
