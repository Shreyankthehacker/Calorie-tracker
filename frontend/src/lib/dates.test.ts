import { describe, expect, it } from 'vitest';
import { reportRangeForPreset } from './dates';

describe('reportRangeForPreset', () => {
  it('does not extend this week past today', () => {
    const range = reportRangeForPreset('this_week', 'UTC', new Date('2026-09-15T12:00:00.000Z'));
    expect(range.startDate).toBe('2026-09-14');
    expect(range.endDate).toBe('2026-09-15');
  });
});
