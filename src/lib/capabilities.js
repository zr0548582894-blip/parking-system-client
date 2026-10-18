// מפת היכולות: כל נקודת קצה של השרת, איפה היא בשימוש בלקוח, ומה נדרש כדי לאמת אותה.
// נבנתה מקריאת הקונטרולרים וה-DTOs של השרת. השדה unitTested אומר רק שיש בדיקת יחידה בלקוח (api.test.js, fetch מדומה)
// לקריאה הזו. זו אינה בדיקה מול שרת חי: אימות מול שרת חי נעשה ב-npm run e2e ובבדיקה ידנית.

export const CAPABILITIES = [
  {
    id: 'register', method: 'POST', path: '/api/users', auth: 'ללא', screen: 'התחברות > הרשמה',
    success: '200 + token. נוצר עובד (Employee) ונכנסים אוטומטית.',
    failures: '400 שדות לא תקינים (מוצגים לפי שדה) · 409 אימייל קיים · 429 הגבלת קצב',
    verify: 'להירשם עם אימייל חדש; לנסות שוב את אותו אימייל כדי לראות 409.',
    unitTested: true,
  },
  {
    id: 'login', method: 'POST', path: '/api/tokens', auth: 'ללא', screen: 'התחברות',
    success: '200 + token ופרטי משתמש. ה-token נשמר ב-sessionStorage.',
    failures: '400 · 401 פרטים שגויים · 429 הגבלת קצב (מוצג זמן המתנה)',
    verify: 'להתחבר עם סיסמה שגויה (401), ואז עם הנכונה.',
    unitTested: true,
  },
  {
    id: 'spots-list', method: 'GET', path: '/api/parking-spots', auth: 'כל משתמש מחובר', screen: 'מפת החניון, ניהול מקומות',
    success: 'עמוד מקומות עם isAvailable לתאריך. המפה טוענת את כל העמודים (100 בכל פעם); ניהול מקומות מסנן וממיין בשרת.',
    failures: '400 פרמטרים לא תקינים · 401',
    verify: 'לשנות תאריך ולראות שהמצב משתנה; בניהול מקומות לסנן לפי קומה, מאפיין, חיפוש.',
    unitTested: true,
  },
  {
    id: 'spot-get', method: 'GET', path: '/api/parking-spots/{id}', auth: 'כל משתמש מחובר', screen: 'אין מסך ייעודי (מוגדר בלקוח, לא בשימוש בממשק)',
    success: 'מקום בודד.', failures: '401 · 404',
    verify: 'דרך Swagger של השרת.', unitTested: false, unused: true,
  },
  {
    id: 'spot-create', method: 'POST', path: '/api/parking-spots', auth: 'Admin', screen: 'ניהול מקומות > מקום חדש',
    success: '201. הרשימה מתרעננת.', failures: '400 · 403 לא מנהל · 409 קוד קיים',
    verify: 'ליצור מקום עם קוד קיים כדי לראות 409.', unitTested: true,
  },
  {
    id: 'spot-update', method: 'PUT', path: '/api/parking-spots/{id}', auth: 'Admin', screen: 'ניהול מקומות > עריכה',
    success: '200, כולל הפעלה והשבתה של מקום.', failures: '400 · 403 · 404 · 409 קוד תפוס או עדכון מקביל (הרשימה מתרעננת)',
    verify: 'לערוך את אותו מקום משני דפדפנים.', unitTested: true,
  },
  {
    id: 'spot-delete', method: 'DELETE', path: '/api/parking-spots/{id}', auth: 'Admin', screen: 'ניהול מקומות > הוצאה משימוש',
    success: '204. המקום נשמר כלא פעיל.', failures: '403 · 404 · 409 יש הזמנות עתידיות',
    verify: 'להוציא משימוש מקום שיש לו הזמנה עתידית.', unitTested: true,
  },
  {
    id: 'features', method: 'GET', path: '/api/features', auth: 'כל משתמש מחובר', screen: 'מסנן מאפיינים במפה ובניהול; טופס מקום',
    success: 'רשימת מאפיינים.', failures: '401. כישלון אינו חוסם את המפה.',
    verify: 'לפתוח את מסנן המאפיינים.', unitTested: false,
  },
  {
    id: 'res-create', method: 'POST', path: '/api/reservations', auth: 'Employee', screen: 'מפת החניון > הזמנה',
    success: '201 + Location. מוצג כרטיס אישור עם מספר ההזמנה.',
    failures: '400 תאריך עבר או רחוק מדי · 403 מנהל · 404 · 409 המקום נתפס או שכבר יש לך הזמנה באותו יום (הנתונים מתרעננים)',
    verify: 'לפתוח שני דפדפנים, לבחור אותו מקום ואותו יום, ולהזמין בשניהם: אחד מקבל 409.', unitTested: true,
  },
  {
    id: 'res-get', method: 'GET', path: '/api/reservations/{id}', auth: 'בעלים או Admin', screen: 'ההזמנות שלי > פרטים',
    success: 'פרטי הזמנה עדכניים.', failures: '403 · 404', verify: 'ללחוץ "פרטים" על הזמנה.', unitTested: true,
  },
  {
    id: 'res-mine', method: 'GET', path: '/api/reservations/mine', auth: 'Employee', screen: 'ההזמנות שלי; סימון "ההזמנה שלי" במפה',
    success: 'עמוד הזמנות, מהחדשה לישנה. המפה משתמשת ב-100 הראשונות.', failures: '400 · 403 מנהל',
    verify: 'להזמין ולראות את ההזמנה ברשימה ובמפה.', unitTested: true,
  },
  {
    id: 'res-all', method: 'GET', path: '/api/reservations', auth: 'Admin', screen: 'כל ההזמנות',
    success: 'עמוד של כל ההזמנות.', failures: '400 · 403 עובד', verify: 'להתחבר כמנהל ולפתוח "כל ההזמנות".', unitTested: true,
  },
  {
    id: 'res-cancel', method: 'DELETE', path: '/api/reservations/{id}', auth: 'בעלים או Admin', screen: 'ההזמנות שלי, מפה, כל ההזמנות',
    success: '204. המקום מתפנה והנתונים מתרעננים.', failures: '403 · 404',
    verify: 'לבטל הזמנה ולראות את המקום חוזר להיות פנוי.', unitTested: true,
  },
  {
    id: 'health', method: 'GET', path: '/healthz', auth: 'ללא', screen: 'בדיקת חיבור',
    success: '200 כשהשרת חי.', failures: 'שגיאת רשת או 5xx', verify: 'ללחוץ "בדיקת חיבור".', unitTested: true,
  },
];

export const UNSUPPORTED = [
  'מחיר או תשלום: השרת אינו שומר מחיר למקום, ולכן אין מחיר בממשק.',
  'עדכון הזמנה (שינוי תאריך או מקום): אין endpoint כזה. מבטלים ומזמינים מחדש.',
  'מצב בזמן אמת: השרת אינו מספק push, ולכן המפה מציגה את המצב בעת הטעינה האחרונה ויש כפתור רענון.',
  'סינון או חיפוש הזמנות לפי מקום, משתמש או סטטוס: אין תמיכה בשרת (רק עימוד).',
  'הוספת מנהל מהממשק: ההרשמה יוצרת עובד בלבד.',
  'תוכנית קומה אמיתית: השרת אינו מחזיר מיקומים. הציור סכמטי ונגזר מקוד, קומה ומאפיינים.',
];
