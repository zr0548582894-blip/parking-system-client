// שכבת התצוגה של מפת החניון. השרת אינו מחזיר תוכנית קומה או מיקומים, ולכן המיקום של כל מקום על הציור
// נגזר כאן בלבד מהנתונים האמיתיים (קוד, קומה, מאפיינים). הציור הוא ייצוג סכמטי, לא מיקום פיזי.
// כל הפונקציות כאן טהורות, ולכן ניתנות לבדיקה בלי דפדפן.

export const STATE = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  UNAVAILABLE: 'unavailable',
  MINE: 'mine',
  UNKNOWN: 'unknown',
};

// מצב מקום בתאריך שנבחר, לפי מה שהשרת אמר:
// isActive=false -> לא זמין (הוסר מהשימוש). isAvailable=false -> תפוס. isAvailable=true -> פנוי.
// "המקום שלי" נגזר מההזמנות של המשתמש עצמו (GET /api/reservations/mine) באותו תאריך
export function spotState(spot, { date, mineByDate = new Map() } = {}) {
  if (!spot.isActive) return STATE.UNAVAILABLE;
  if (date && mineByDate.get(date)?.has(spot.id)) return STATE.MINE;
  if (spot.isAvailable === true) return STATE.AVAILABLE;
  if (spot.isAvailable === false) return STATE.OCCUPIED;
  return STATE.UNKNOWN;
}

export function floorLabel(floor) {
  if (floor === 0) return 'קומת קרקע';
  return floor < 0 ? `מרתף ${Math.abs(floor)}` : `קומה ${floor}`;
}

export function floorShort(floor) {
  return floor === 0 ? 'G' : floor < 0 ? `B${Math.abs(floor)}` : String(floor);
}

// קומות מלמעלה למטה, ובתוך כל קומה המקומות ממוינים לפי קוד (מספרי: L1-02 לפני L1-10)
export function groupByFloor(spots) {
  const byFloor = new Map();
  for (const spot of spots) {
    if (!byFloor.has(spot.floor)) byFloor.set(spot.floor, []);
    byFloor.get(spot.floor).push(spot);
  }
  return [...byFloor.entries()]
    .sort(([a], [b]) => b - a)
    .map(([floor, list]) => ({
      floor,
      label: floorLabel(floor),
      spots: [...list].sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true })),
    }));
}

export function countStates(spots, options) {
  const counts = { available: 0, occupied: 0, unavailable: 0, mine: 0, unknown: 0 };
  for (const spot of spots) counts[spotState(spot, options)] += 1;
  return counts;
}

export const GEOMETRY = {
  slotW: 66,
  slotH: 108,
  laneH: 92,
  padX: 36,
  padTop: 70,
  padBottom: 40,
  blockGap: 56,
};

// מחלק את מקומות הקומה ל"אגפים": כל אגף הוא שתי שורות מקומות משני צדי נתיב נסיעה.
// perSide = כמה מקומות בשורה אחת. מקומות נוספים נפתחים באגף נוסף מתחת (גם בקומה גדולה וגם במסך צר).
// rtl=true: המקום הראשון בצד ימין, כמו כיוון הקריאה בעברית
export function layoutFloor(spots, { perSide = 6, rtl = true } = {}) {
  const { slotW, slotH, laneH, padX, padTop, padBottom, blockGap } = GEOMETRY;
  const perBlock = perSide * 2;
  const blocks = [];
  for (let start = 0; start < spots.length; start += perBlock) blocks.push(spots.slice(start, start + perBlock));

  const columns = Math.max(Math.min(4, perSide), Math.min(perSide, Math.ceil(Math.min(spots.length, perBlock) / 2)));
  const width = padX * 2 + columns * slotW;
  const blockH = slotH * 2 + laneH;

  const slots = [];
  const lanes = [];
  blocks.forEach((block, blockIndex) => {
    const top = padTop + blockIndex * (blockH + blockGap);
    const topCount = Math.ceil(block.length / 2);
    const laneY = top + slotH;
    lanes.push({ y: laneY, height: laneH, x: padX - 14, width: columns * slotW + 28 });

    block.forEach((spot, index) => {
      const inTop = index < topCount;
      const column = inTop ? index : index - topCount;
      const x = rtl ? width - padX - (column + 1) * slotW : padX + column * slotW;
      slots.push({ spot, x, y: inTop ? top : laneY + laneH, w: slotW, h: slotH, row: inTop ? 'top' : 'bottom' });
    });
  });

  const height = padTop + blocks.length * blockH + Math.max(0, blocks.length - 1) * blockGap + padBottom;
  return { width, height, slots, lanes, columns, blocks: blocks.length };
}

// סוג מאפיין לפי השם שהשרת החזיר. מאפיין לא מוכר מוצג כתווית בלבד (בלי ניחוש)
export function featureKind(name) {
  if (name.includes('חשמל') || name.toLowerCase().includes('ev')) return 'ev';
  if (name.includes('נגיש')) return 'accessible';
  if (name.includes('מקור')) return 'covered';
  return 'other';
}
