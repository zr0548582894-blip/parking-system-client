# Parking System Client – לקוח React

לקוח React קטן שמדגים שהשרת ([parking-system-server](../project_dotnet), ASP.NET Core) עובד מקצה לקצה:
התחברות והרשמה, רשימת מקומות חניה עם pagination אמיתי מול השרת, הזמנת מקום, והודעה ברורה כשהשרת עונה **409** (המקום נתפס).

> הלקוח נבנה במינימום הנדרש להדגמת השרת. הדגש בפרויקט הוא על השרת.

## המסכים
| # | מסך | מה הוא עושה |
|---|---|---|
| 1 | **התחברות והרשמה** | מחובר ל-`POST /api/tokens` ול-`POST /api/users`. ה-JWT נשמר ב-`sessionStorage` ונשלח בכל בקשה בכותרת `Authorization: Bearer ...`. שגיאות ולידציה של השרת מוצגות על הטופס |
| 2 | **רשימת מקומות חניה** | `GET /api/parking-spots`. ה-pagination, הסינון (תאריך, "רק פנויים") והמיון מתבצעים **בשרת**, ובכל לחיצה על "הבא" או "הקודם" נטען עמוד חדש |
| 3 | **הזמנת מקום** | כפתור "הזמן" ליד כל מקום פנוי (`POST /api/reservations`). רק עובד (Employee) מזמין |
| 4 | **הודעת 409** | כשמשתמש אחר הקדים לתפוס את המקום, מוצגת הודעה כתומה בולטת: "ההזמנה לא נקלטה: המקום כבר תפוס בתאריך זה. אפשר לבחור מקום אחר מהרשימה", והרשימה מתרעננת |

בנוסף: לשונית **ההזמנות שלי** (רשימה עם pagination וביטול הזמנה).

## הפעלה מקומית
דרישות: **Node.js 22.12 ומעלה**, והשרת רץ (ראו את ה-README של השרת).

```bash
npm install
npm run dev          # http://localhost:5173
```

כתובת השרת נקבעת ב-`VITE_API_URL`. ללא הגדרה זו `http://localhost:5258` (השרת המקומי). להגדרה אחרת, העתיקו `.env.example` ל-`.env`.
השרת מתיר לקרוא לו מ-`http://localhost:5173` (הגדרת `Cors:AllowedOrigins` ב-`appsettings.Development.json` של השרת).

**משתמשי דמו** (נוצרים בשרת כשמגדירים להם סיסמה, ראו README של השרת): `employee@parking.local` (עובד) ו-`admin@parking.local` (מנהל, אינו מזמין).
אפשר גם להירשם כעובד חדש במסך ההתחברות.

## בדיקות
```bash
npm test             # 22 בדיקות יחידה (שכבת ה-API, ה-token, והודעות השגיאה). לא צריך שרת
npm run build        # בנייה לייצור, בודקת שהקוד מתקמפל
npm run e2e          # זרימה מלאה מול שרת חי (הרשמה, pagination, הזמנה, 409, 6 משתמשים במקביל, CORS)
```
`npm run e2e` יוצר משתמשים והזמנות בבסיס הנתונים של השרת, ולכן מומלץ להריץ אותו מול שרת שמחובר לבסיס נתונים לבדיקות. כתובת אחרת: `E2E_API_URL=https://... npm run e2e`.

## העלאה ל-Render (Static Site)
> הלקוח נפרס **אחרי** השרת, כי הוא צריך את כתובת השרת.

1. העלו את התיקייה הזו ל-repository נפרד ב-GitHub (ראו הוראות הגשה בסוף ה-README של השרת).
2. ב-Render: **New > Blueprint** ובחרו את ה-repository. הקובץ `render.yaml` מגדיר אתר סטטי (`npm ci && npm run build`, תיקיית פרסום `dist`).
3. כשתתבקשו, הזינו `VITE_API_URL` = הכתובת של שירות השרת ב-Render, בלי `/` בסוף.
4. אחרי שהלקוח עלה, העתיקו את כתובתו (`https://<שם>.onrender.com`) לשרת: **Environment > `Cors__AllowedOrigins`**, ושמרו (השרת יופעל מחדש). בלי זה הדפדפן יחסום את הקריאות לשרת (CORS).

או ידנית, בלי Blueprint: **New > Static Site**, Build Command `npm ci && npm run build`, Publish Directory `dist`, ומשתנה סביבה `VITE_API_URL`.

## אבטחה
- אין בקוד או ב-Git שום סוד. `VITE_API_URL` היא כתובת ציבורית, והיא נכנסת לקוד שרץ בדפדפן.
- ה-token נשמר ב-`sessionStorage` (נמחק בסגירת הלשונית) ופג בתוך שעה. כשהשרת עונה 401, הלקוח מנתק את המשתמש.
- ההרשאות נאכפות **בשרת**. הסתרת כפתורים בלקוח היא נוחות בלבד.

## מבנה
```
src/
├── api.js               # קריאות ל-API, ApiError, בניית query string
├── apiClient.js         # יוצר את ה-API עם כתובת השרת וה-token השמור
├── session.js           # שמירה, טעינה ופקיעה של ההתחברות
├── errors.js            # הודעות שגיאה ו-409 למשתמש
├── App.jsx              # שער התחברות, ניווט בין לשוניות
├── screens/             # AuthScreen, SpotsScreen, MyReservationsScreen
└── components/          # Pagination, Notice
scripts/e2e.mjs          # בדיקת זרימה מלאה מול שרת חי
```
