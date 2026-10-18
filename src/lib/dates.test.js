import { describe, expect, it } from 'vitest';
import { formatStamp, isValidIso, isoDate, parseIso, toIso } from './dates.js';

describe('dates', () => {
  it('formats and parses yyyy-MM-dd round trip', () => {
    expect(toIso(parseIso('2030-02-09'))).toBe('2030-02-09');
  });

  it('adds days across a month boundary', () => {
    expect(isoDate(2, new Date(2030, 0, 30))).toBe('2030-02-01');
  });

  it('validates real calendar dates only', () => {
    expect(isValidIso('2030-02-30')).toBe(false);
    expect(isValidIso('2030-2-3')).toBe(false);
    expect(isValidIso('')).toBe(false);
    expect(isValidIso('2030-02-28')).toBe(true);
  });

  it('treats a server timestamp without a zone as UTC', () => {
    expect(formatStamp('2030-01-01T10:00:00')).toBe(formatStamp('2030-01-01T10:00:00Z'));
  });
});
