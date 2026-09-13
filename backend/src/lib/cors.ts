export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function assertSafeCorsOrigins(origins: string[]): void {
  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must include at least one origin');
  }
  if (origins.includes('*')) {
    throw new Error('CORS_ORIGIN must not include * when the API uses authentication');
  }
}

export function createCorsOriginDelegate(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins);

  return (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowed.has(origin));
  };
}
