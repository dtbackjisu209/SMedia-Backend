export function normalizePublicAssetUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^file:/i.test(trimmed)) {
    return null;
  }

  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return null;
  }

  if (/^\\\\/.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
