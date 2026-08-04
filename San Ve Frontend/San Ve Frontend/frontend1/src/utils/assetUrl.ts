import { API_BASE_URL } from '../config/env';

export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';

  if (/^(https?:|blob:|data:)/i.test(path)) return path;

  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export default resolveAssetUrl;
