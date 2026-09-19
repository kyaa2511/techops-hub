export function normalizeApiBaseUrl(configuredBaseUrl?: string): string {
  const trimmedBaseUrl = configuredBaseUrl?.trim() ?? '';

  if (trimmedBaseUrl === '') {
    return '';
  }

  const url = new URL(trimmedBaseUrl);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_API_BASE_URL must use http or https.');
  }

  return url.origin;
}

export const apiBaseUrl = normalizeApiBaseUrl(import.meta.env?.VITE_API_BASE_URL);