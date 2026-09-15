import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './base-url';

describe('resolveApiBaseUrl', () => {
  it('defaults to the local backend', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:3001');
    expect(resolveApiBaseUrl('')).toBe('http://localhost:3001');
  });

  it('strips trailing slashes and does not duplicate the origin', () => {
    expect(resolveApiBaseUrl('https://calorie-trackerbackend-production-47d1.up.railway.app/')).toBe(
      'https://calorie-trackerbackend-production-47d1.up.railway.app',
    );
  });

  it('adds https when a host is pasted without a protocol', () => {
    expect(resolveApiBaseUrl('calorie-trackerbackend-production-47d1.up.railway.app')).toBe(
      'https://calorie-trackerbackend-production-47d1.up.railway.app',
    );
  });
});
