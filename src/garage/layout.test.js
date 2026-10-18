import { describe, expect, it } from 'vitest';
import { countStates, featureKind, floorLabel, groupByFloor, layoutFloor, spotState, STATE } from './layout.js';

const spot = (id, code, floor, extra = {}) => ({ id, code, floor, isActive: true, features: [], isAvailable: true, ...extra });

describe('spotState', () => {
  it('maps the server flags to a visual state', () => {
    expect(spotState(spot(1, 'A', 0))).toBe(STATE.AVAILABLE);
    expect(spotState(spot(1, 'A', 0, { isAvailable: false }))).toBe(STATE.OCCUPIED);
    expect(spotState(spot(1, 'A', 0, { isActive: false, isAvailable: false }))).toBe(STATE.UNAVAILABLE);
    expect(spotState(spot(1, 'A', 0, { isAvailable: null }))).toBe(STATE.UNKNOWN);
  });

  it('marks my own reservation on the chosen date only', () => {
    const mineByDate = new Map([['2030-01-02', new Set([1])]]);
    const taken = spot(1, 'A', 0, { isAvailable: false });
    expect(spotState(taken, { date: '2030-01-02', mineByDate })).toBe(STATE.MINE);
    expect(spotState(taken, { date: '2030-01-03', mineByDate })).toBe(STATE.OCCUPIED);
  });
});

describe('groupByFloor', () => {
  it('orders floors top to bottom and codes naturally', () => {
    const groups = groupByFloor([spot(1, 'L1-10', 1), spot(2, 'B-01', -1), spot(3, 'L1-02', 1), spot(4, 'G-01', 0)]);
    expect(groups.map((g) => g.floor)).toEqual([1, 0, -1]);
    expect(groups[0].spots.map((s) => s.code)).toEqual(['L1-02', 'L1-10']);
  });

  it('labels floors in Hebrew', () => {
    expect(floorLabel(0)).toBe('קומת קרקע');
    expect(floorLabel(-1)).toBe('מרתף 1');
    expect(floorLabel(2)).toBe('קומה 2');
  });
});

describe('layoutFloor', () => {
  const five = [1, 2, 3, 4, 5].map((n) => spot(n, `G-0${n}`, 0));
  const thirty = Array.from({ length: 30 }, (_, i) => spot(i + 1, `X-${i + 1}`, 0));

  it('places every spot exactly once, two rows around a lane', () => {
    const layout = layoutFloor(five, { perSide: 6 });
    expect(layout.slots).toHaveLength(5);
    expect(new Set(layout.slots.map((s) => s.spot.id)).size).toBe(5);
    expect(layout.slots.filter((s) => s.row === 'top')).toHaveLength(3);
    expect(layout.slots.filter((s) => s.row === 'bottom')).toHaveLength(2);
  });

  it('never overlaps spots', () => {
    const { slots } = layoutFloor(thirty, { perSide: 4 });
    expect(new Set(slots.map((s) => `${s.x}:${s.y}`)).size).toBe(30);
  });

  it('opens another block when a floor has more spots than fit', () => {
    expect(layoutFloor(thirty, { perSide: 4 }).blocks).toBe(4);
    expect(layoutFloor(thirty, { perSide: 8 }).blocks).toBe(2);
  });

  it('puts the first spot on the right in RTL and on the left in LTR', () => {
    const rtl = layoutFloor(five, { rtl: true }).slots;
    const ltr = layoutFloor(five, { rtl: false }).slots;
    expect(rtl[0].x).toBeGreaterThan(rtl[1].x);
    expect(ltr[0].x).toBeLessThan(ltr[1].x);
  });

  it('handles an empty floor', () => {
    expect(layoutFloor([]).slots).toEqual([]);
  });
});

describe('misc', () => {
  it('counts states', () => {
    const counts = countStates([spot(1, 'A', 0), spot(2, 'B', 0, { isAvailable: false }), spot(3, 'C', 0, { isActive: false })]);
    expect(counts).toMatchObject({ available: 1, occupied: 1, unavailable: 1 });
  });

  it('recognises the seeded feature names without guessing unknown ones', () => {
    expect(featureKind('טעינה לרכב חשמלי')).toBe('ev');
    expect(featureKind('נגיש')).toBe('accessible');
    expect(featureKind('מקורה')).toBe('covered');
    expect(featureKind('משהו אחר')).toBe('other');
  });
});
