// בדיקה מקצה לקצה של הלקוח מול שרת חי. משתמשת באותה שכבת API שהדפדפן משתמש בה (src/api.js).
// הרצה: הפעילי את השרת, ואז `npm run e2e` (כתובת ברירת מחדל http://localhost:5258, או E2E_API_URL).
// הסקריפט יוצר משתמשים והזמנות בבסיס הנתונים של השרת, ולכן מריצים אותו מול בסיס נתונים לבדיקות.
import http from 'node:http';
import { ApiError, createApi } from '../src/api.js';
import { conflictMessage } from '../src/errors.js';

const baseUrl = (process.env.E2E_API_URL ?? 'http://localhost:5258').replace(/\/$/, '');
const clientOrigin = process.env.E2E_CLIENT_ORIGIN ?? 'http://localhost:5173';
const PARALLEL_USERS = 6;

let failures = 0;
function check(name, condition, details = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition || !details ? '' : ` -> ${details}`}`);
  if (!condition) failures += 1;
}

const isoDate = (daysFromToday) => {
  const date = new Date(Date.now() + daysFromToday * 86_400_000);
  return date.toISOString().slice(0, 10);
};

// משתמש עם token משלו (כמו דפדפן נפרד)
async function newUser(label) {
  let token = null;
  const api = createApi({ baseUrl, getToken: () => token });
  const email = `e2e-${label}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@test.local`;
  const auth = await api.register(`E2E ${label}`, email, 'Passw0rd!E2E');
  token = auth.token;
  return { api, auth };
}

function preflight(origin) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/reservations`);
    const request = http.request(
      url,
      {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
      },
      (response) => {
        response.resume();
        resolve(response.headers);
      },
    );
    request.on('error', reject);
    request.end();
  });
}

const date = isoDate(14);
console.log(`Server: ${baseUrl} | reservation date: ${date}\n`);

// 1. בלי התחברות
const anonymous = createApi({ baseUrl });
const unauthorized = await anonymous.listSpots().catch((error) => error);
check('without a token the server answers 401', unauthorized instanceof ApiError && unauthorized.isUnauthorized);

// 2. הרשמה והתחברות (אותו קוד כמו במסך ההתחברות)
const alice = await newUser('alice');
const bob = await newUser('bob');
check('register returns a token and the Employee role', Boolean(alice.auth.token) && alice.auth.role === 'Employee');

const relogin = await createApi({ baseUrl }).login(alice.auth.email, 'Passw0rd!E2E');
check('login with the same credentials returns a token', Boolean(relogin.token) && relogin.userId === alice.auth.userId);

const wrongPassword = await createApi({ baseUrl }).login(alice.auth.email, 'wrong').catch((error) => error);
check('a wrong password is rejected with 401', wrongPassword instanceof ApiError && wrongPassword.status === 401);

// 3. pagination אמיתי מול השרת
const first = await alice.api.listSpots({ page: 1, pageSize: 5, date });
const second = await alice.api.listSpots({ page: 2, pageSize: 5, date });
const firstIds = first.items.map((spot) => spot.id);
check('page 1 has 5 items and the server reports the totals', first.items.length === 5 && first.totalCount >= 20 && first.totalPages >= 4);
check('page 2 returns different items than page 1', second.page === 2 && second.items.every((spot) => !firstIds.includes(spot.id)));
check('items carry availability for the requested date', first.items.every((spot) => typeof spot.isAvailable === 'boolean'));

// 4. הזמנה (ה-Location מצביע על ההזמנה)
// בוחרים מקום שפנוי בפועל בתאריך הזה, כדי שהרצה חוזרת לא תתנגש בהזמנות של הרצות קודמות
const freeOnDate = await alice.api.listSpots({ page: 1, pageSize: 50, date, available: true });
const target = freeOnDate.items[0];
const alicesReservation = await alice.api.reserve(target.id, date);
check('reservation succeeds (201) and returns a Location', alicesReservation.reservation.id > 0 && Boolean(alicesReservation.location));

const viaLocation = await fetch(alicesReservation.location, { headers: { Authorization: `Bearer ${alice.auth.token}` } });
check('the Location header leads to the reservation', viaLocation.status === 200);

// 5. התחרות: משתמש שני על אותו מקום ואותו יום
const conflict = await bob.api.reserve(target.id, date).catch((error) => error);
check('a second user on the same spot and day gets 409', conflict instanceof ApiError && conflict.isConflict);
check('the 409 message is clear and readable', typeof conflict.message === 'string' && conflictMessage(conflict).includes('ההזמנה לא נקלטה'), conflict.message);

const stillAvailable = await bob.api.listSpots({ page: 1, pageSize: 50, date, available: true });
check('the taken spot disappears from the available list', stillAvailable.items.every((spot) => spot.id !== target.id));

// 6. ביטול משחרר את המקום
const mine = await alice.api.myReservations({ page: 1, pageSize: 5 });
check('my reservations lists it with pagination data', mine.items.some((item) => item.id === alicesReservation.reservation.id) && mine.totalCount >= 1);
await alice.api.cancelReservation(alicesReservation.reservation.id);
const afterCancel = await bob.api.reserve(target.id, date).catch((error) => error);
check('after cancelling, the other user can take the spot', !(afterCancel instanceof Error) && afterCancel.reservation.id > 0);
if (!(afterCancel instanceof Error)) await bob.api.cancelReservation(afterCancel.reservation.id); // ניקוי: ההזמנה נשמרת בהיסטוריה כמבוטלת

// 7. כמה משתמשים בו-זמנית על אותו מקום: בדיוק אחד מצליח
const racers = await Promise.all(Array.from({ length: PARALLEL_USERS }, (_, index) => newUser(`racer${index}`)));
const raceDate = isoDate(15);
const raceSpot = (await alice.api.listSpots({ page: 1, pageSize: 50, date: raceDate, available: true })).items[0];
const winners = [];
const outcomes = await Promise.all(
  racers.map(({ api }) => api.reserve(raceSpot.id, raceDate).then((result) => { winners.push({ api, id: result.reservation.id }); return 'won'; }, (error) => (error.isConflict ? 'conflict' : `error:${error.status}`))),
);
check(
  `${PARALLEL_USERS} users at once: exactly one wins and the rest get 409`,
  outcomes.filter((outcome) => outcome === 'won').length === 1 && outcomes.filter((outcome) => outcome === 'conflict').length === PARALLEL_USERS - 1,
  outcomes.join(','),
);

// ניקוי: מבטלים את ההזמנה של המנצח, כדי שהרצות חוזרות יתחילו ממצב נקי
await Promise.all(winners.map(({ api, id }) => api.cancelReservation(id)));

// 8. CORS: הדפדפן רשאי לקרוא ל-API מהכתובת של הלקוח, ולא מכתובת אחרת
const allowed = await preflight(clientOrigin);
const denied = await preflight('https://evil.example.com');
check('CORS allows the client origin', allowed['access-control-allow-origin'] === clientOrigin, JSON.stringify(allowed['access-control-allow-origin']));
check('CORS does not allow another website', denied['access-control-allow-origin'] === undefined);

console.log(failures === 0 ? '\nAll client end-to-end checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
