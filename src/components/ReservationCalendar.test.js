import { describe, expect, it } from 'vitest';
import { buildMonth } from './ReservationCalendar.jsx';

describe('buildMonth', () => {
  it('pads to the weekday of the 1st (Sunday first) and lists every day', () => {
    const cells = buildMonth(2026, 9); // October 2026 starts on a Thursday
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toBe('2026-10-01');
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells.at(-1)).toBe('2026-10-31');
  });

  it('handles leap-year February', () => {
    expect(buildMonth(2028, 1).filter(Boolean)).toHaveLength(29);
  });
});
