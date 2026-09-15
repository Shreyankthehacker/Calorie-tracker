import { describe, expect, it } from 'vitest';
import { displayTimeZone } from './timezones';

describe('displayTimeZone', () => {
  it('maps the Calcutta alias to Kolkata', () => {
    expect(displayTimeZone('Asia/Calcutta')).toBe('Asia/Kolkata');
  });

  it('passes other IANA names through', () => {
    expect(displayTimeZone('UTC')).toBe('UTC');
    expect(displayTimeZone('America/New_York')).toBe('America/New_York');
  });
});
