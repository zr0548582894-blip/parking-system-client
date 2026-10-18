// !!! כלי פיתוח בלבד !!! שרת מדומה שמחקה את החוזה של ParkingSystem.API, כדי לבדוק את הלקוח כשאין שרת אמיתי זמין
// (למשל בלי Docker/PostgreSQL). הנתונים בזיכרון, והוא אינו חלק מהבנייה או מהפריסה.
// אינו מוכיח התנהגות של השרת האמיתי: את זה בודקים ב-`npm run e2e` מול שרת חי.
// הרצה: node scripts/dev-mock-api.mjs   (פורט 5258, או MOCK_PORT). משתמשים: employee@mock.local / admin@mock.local, סיסמה MockPass123
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 5258);
const features = [{ id: 1, name: 'נגיש' }, { id: 2, name: 'מקורה' }, { id: 3, name: 'טעינה לרכב חשמלי' }];
const spots = [];
let spotId = 1;
const floors = [['B', -1, true], ['G', 0, false], ['L1', 1, true], ['L2', 2, false]];
for (const [prefix, floor, covered] of floors) {
  for (let n = 1; n <= 5; n += 1) {
    const f = covered ? [features[1]] : [];
    spots.push({ id: spotId++, code: `${prefix}-${String(n).padStart(2, '0')}`, floor, isActive: true, features: [...f] });
  }
}
const addFeature = (code, feature) => spots.find((s) => s.code === code).features.push(features[feature - 1]);
addFeature('G-01', 1); addFeature('G-02', 1); addFeature('L1-01', 3); addFeature('L1-02', 3); addFeature('L2-01', 3);

const users = [
  { id: 1, fullName: 'Admin', email: 'admin@mock.local', password: 'MockPass123', role: 'Admin' },
  { id: 2, fullName: 'Employee', email: 'employee@mock.local', password: 'MockPass123', role: 'Employee' },
  { id: 3, fullName: 'Noa Cohen', email: 'noa@mock.local', password: 'MockPass123', role: 'Employee' },
];
const reservations = [];
let reservationId = 1;
const iso = (d) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
// הזמנות לדוגמה של עובדת אחרת, כדי שיהיו מקומות תפוסים
for (const [code, day] of [['G-01', 1], ['L1-01', 1], ['B-02', 1], ['G-03', 2]]) {
  reservations.push({ id: reservationId++, userId: 3, spotId: spots.find((s) => s.code === code).id, date: iso(day), status: 'Active', createdAtUtc: new Date().toISOString() });
}
spots.find((s) => s.code === 'L2-05').isActive = false;

const problem = (res, status, title, extra = {}) => send(res, status, { status, title, correlationId: 'mock0001', ...extra }, 'application/problem+json');
function send(res, status, body, type = 'application/json', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, ...cors, ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'Location,Retry-After' };

const page = (items, url) => {
  const p = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const size = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 10)));
  return { items: items.slice((p - 1) * size, p * size), page: p, pageSize: size, totalCount: items.length, totalPages: Math.ceil(items.length / size) };
};
const reservationDto = (r) => {
  const spot = spots.find((s) => s.id === r.spotId);
  return { id: r.id, date: r.date, status: r.status, createdAtUtc: r.createdAtUtc, userId: r.userId, userFullName: users.find((u) => u.id === r.userId).fullName, parkingSpot: { ...spot, isAvailable: null } };
};
const readBody = (req) => new Promise((resolve) => { let data = ''; req.on('data', (c) => (data += c)); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve(null); } }); });
const authOf = (req) => { const m = /^Bearer mock\.(\d+)$/.exec(req.headers.authorization ?? ''); return m ? users.find((u) => u.id === Number(m[1])) : null; };
const authResponse = (u) => ({ token: `mock.${u.id}`, expiresAtUtc: new Date(Date.now() + 30 * 60_000).toISOString(), userId: u.id, fullName: u.fullName, email: u.email, role: u.role });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/$/, '');
  if (req.method === 'OPTIONS') return send(res, 204);
  if (path === '/healthz') return send(res, 200, { status: 'Healthy' });

  const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : null;
  if (body === null && ['POST', 'PUT'].includes(req.method)) return problem(res, 400, 'גוף הבקשה אינו JSON תקין.');

  if (path === '/api/users' && req.method === 'POST') {
    const errors = {};
    if (!body.fullName || body.fullName.length < 2) errors.FullName = ['שם מלא באורך 2 עד 100 תווים.'];
    if (!/^\S+@\S+\.\S+$/.test(body.email ?? '')) errors.Email = ['כתובת אימייל לא תקינה.'];
    if (!body.password || body.password.length < 8) errors.Password = ['הסיסמה חייבת להכיל לפחות 8 תווים.'];
    if (Object.keys(errors).length) return problem(res, 400, 'אחד או יותר מהשדות אינם תקינים.', { errors });
    if (users.some((u) => u.email === body.email.toLowerCase())) return problem(res, 409, 'כתובת האימייל כבר רשומה במערכת.');
    const user = { id: users.length + 1, fullName: body.fullName, email: body.email.toLowerCase(), password: body.password, role: 'Employee' };
    users.push(user);
    return send(res, 200, authResponse(user));
  }
  if (path === '/api/tokens' && req.method === 'POST') {
    const user = users.find((u) => u.email === (body.email ?? '').toLowerCase() && u.password === body.password);
    return user ? send(res, 200, authResponse(user)) : problem(res, 401, 'האימייל או הסיסמה שגויים.');
  }

  const user = authOf(req);
  if (!user) return problem(res, 401, 'נדרשת התחברות.');
  const needs = (role) => (user.role === role ? true : (problem(res, 403, role === 'Admin' ? 'הפעולה מותרת למנהל בלבד.' : 'הפעולה מותרת לעובד בלבד.'), false));
  const takenOn = (id, date) => reservations.some((r) => r.spotId === id && r.date === date && r.status === 'Active');

  if (path === '/api/features' && req.method === 'GET') return send(res, 200, features);

  if (path === '/api/parking-spots' && req.method === 'GET') {
    const q = url.searchParams; const date = q.get('date');
    let list = spots.map((s) => ({ ...s, isAvailable: date ? s.isActive && !takenOn(s.id, date) : null }));
    if (q.get('floor') !== null) list = list.filter((s) => s.floor === Number(q.get('floor')));
    if (q.get('isActive') !== null) list = list.filter((s) => s.isActive === (q.get('isActive') === 'true'));
    if (q.get('featureId')) list = list.filter((s) => s.features.some((f) => f.id === Number(q.get('featureId'))));
    if (q.get('search')) list = list.filter((s) => s.code.toLowerCase().includes(q.get('search').toLowerCase()));
    if (q.get('available') === 'true') { if (!date) return problem(res, 400, 'available דורש date.'); list = list.filter((s) => s.isAvailable); }
    const dir = q.get('sortDir') === 'Desc' ? -1 : 1;
    list.sort((a, b) => (q.get('sortBy') === 'Floor' ? a.floor - b.floor || a.code.localeCompare(b.code) : a.code.localeCompare(b.code)) * dir);
    return send(res, 200, page(list, url));
  }
  const spotMatch = /^\/api\/parking-spots\/(\d+)$/.exec(path);
  if (spotMatch) {
    const spot = spots.find((s) => s.id === Number(spotMatch[1]));
    if (req.method === 'GET') return spot ? send(res, 200, { ...spot, isAvailable: null }) : problem(res, 404, 'מקום החניה לא נמצא.');
    if (req.method === 'PUT') {
      if (!needs('Admin')) return;
      if (!spot) return problem(res, 404, 'מקום החניה לא נמצא.');
      if (spots.some((s) => s.id !== spot.id && s.code === body.code)) return problem(res, 409, 'קוד המקום כבר קיים.');
      Object.assign(spot, { code: body.code, floor: body.floor, isActive: body.isActive, features: features.filter((f) => (body.featureIds ?? []).includes(f.id)) });
      return send(res, 200, { ...spot, isAvailable: null });
    }
    if (req.method === 'DELETE') {
      if (!needs('Admin')) return;
      if (!spot) return problem(res, 404, 'מקום החניה לא נמצא.');
      if (reservations.some((r) => r.spotId === spot.id && r.status === 'Active' && r.date >= iso(0))) return problem(res, 409, 'יש למקום הזמנות עתידיות, ולכן אי אפשר להסיר אותו.');
      spot.isActive = false;
      return send(res, 204);
    }
  }
  if (path === '/api/parking-spots' && req.method === 'POST') {
    if (!needs('Admin')) return;
    if (!body.code || body.code.length > 20) return problem(res, 400, 'אחד או יותר מהשדות אינם תקינים.', { errors: { Code: ['קוד באורך 1 עד 20 תווים.'] } });
    if (spots.some((s) => s.code === body.code)) return problem(res, 409, 'קוד המקום כבר קיים.');
    const spot = { id: spotId++, code: body.code, floor: body.floor, isActive: true, features: features.filter((f) => (body.featureIds ?? []).includes(f.id)) };
    spots.push(spot);
    return send(res, 201, { ...spot, isAvailable: null }, 'application/json', { Location: `/api/parking-spots/${spot.id}` });
  }

  if (path === '/api/reservations' && req.method === 'POST') {
    if (!needs('Employee')) return;
    const spot = spots.find((s) => s.id === body.parkingSpotId);
    if (!spot) return problem(res, 404, 'מקום החניה לא נמצא.');
    if (!body.date || body.date < iso(0)) return problem(res, 400, 'אי אפשר להזמין תאריך שעבר.');
    if (body.date > iso(30)) return problem(res, 400, 'אפשר להזמין עד 30 ימים מראש.');
    if (!spot.isActive) return problem(res, 400, 'מקום החניה אינו פעיל.');
    if (takenOn(spot.id, body.date)) return problem(res, 409, 'המקום כבר תפוס בתאריך זה.');
    if (reservations.some((r) => r.userId === user.id && r.date === body.date && r.status === 'Active')) return problem(res, 409, 'כבר יש לך הזמנה בתאריך זה.');
    const reservation = { id: reservationId++, userId: user.id, spotId: spot.id, date: body.date, status: 'Active', createdAtUtc: new Date().toISOString() };
    reservations.push(reservation);
    return send(res, 201, reservationDto(reservation), 'application/json', { Location: `/api/reservations/${reservation.id}` });
  }
  const sorted = () => [...reservations].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (path === '/api/reservations/mine' && req.method === 'GET') {
    if (!needs('Employee')) return;
    return send(res, 200, { ...page(sorted().filter((r) => r.userId === user.id), url), items: page(sorted().filter((r) => r.userId === user.id), url).items.map(reservationDto) });
  }
  if (path === '/api/reservations' && req.method === 'GET') {
    if (!needs('Admin')) return;
    const result = page(sorted(), url);
    return send(res, 200, { ...result, items: result.items.map(reservationDto) });
  }
  const resMatch = /^\/api\/reservations\/(\d+)$/.exec(path);
  if (resMatch) {
    const reservation = reservations.find((r) => r.id === Number(resMatch[1]));
    if (!reservation) return problem(res, 404, 'ההזמנה לא נמצאה.');
    if (reservation.userId !== user.id && user.role !== 'Admin') return problem(res, 403, 'ההזמנה אינה שלך.');
    if (req.method === 'GET') return send(res, 200, reservationDto(reservation));
    if (req.method === 'DELETE') { reservation.status = 'Cancelled'; return send(res, 204); }
  }
  return problem(res, 404, 'לא נמצא.');
}).listen(PORT, () => console.log(`MOCK API (dev only) on http://localhost:${PORT}`));
