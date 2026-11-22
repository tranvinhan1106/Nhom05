export function validateBuildApiUrl(value, { publicDeployment = false } = {}) {
  if (!value?.trim()) throw new Error('Missing VITE_API_BASE_URL. Set the backend URL before building.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query or fragment.');
  }
  if (url.pathname.replace(/\/+$/, '') !== '') throw new Error('VITE_API_BASE_URL must be the backend origin without /api.');
  const host = url.hostname.toLowerCase();
  const privateHost = host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  if (publicDeployment && (url.protocol !== 'https:' || privateHost)) {
    throw new Error('Vercel requires a public HTTPS backend URL; localhost and private IPs are not reachable by visitors.');
  }
  return url.origin;
}
