export function getAppDownloadUrl(settings = {}) {
  const value = settings.appDownloadUrl || import.meta.env?.VITE_APP_DOWNLOAD_URL;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'exp:', 'exps:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
