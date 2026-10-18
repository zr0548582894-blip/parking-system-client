import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, ClipboardList, LogOut, Map as MapIcon, Warehouse } from 'lucide-react';
import { api } from './apiClient.js';
import { clearSession, loadSession, saveSession } from './session.js';
import { useRoute } from './lib/router.js';
import Logo from './components/Logo.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import GarageScreen from './garage/GarageScreen.jsx';
import MyReservationsScreen from './screens/MyReservationsScreen.jsx';
import AdminSpotsScreen from './screens/AdminSpotsScreen.jsx';
import AdminReservationsScreen from './screens/AdminReservationsScreen.jsx';

const roleLabel = { Admin: 'מנהל', Employee: 'עובד' };

// הניווט לפי תפוקיד. ההרשאה האמיתית נאכפת בשרת: כאן רק מציגים מה שרלוונטי לתפקיד
const NAV = [
  { path: '/', label: 'חניון', icon: MapIcon, roles: ['Employee', 'Admin'] },
  { path: '/reservations', label: 'ההזמנות שלי', icon: CalendarCheck, roles: ['Employee'] },
  { path: '/admin/spots', label: 'ניהול מקומות', icon: Warehouse, roles: ['Admin'] },
  { path: '/admin/reservations', label: 'כל ההזמנות', icon: ClipboardList, roles: ['Admin'] },
];

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [notice, setNotice] = useState(null);
  const [route, navigate] = useRoute();

  const logout = useCallback((message) => {
    clearSession();
    setSession(null);
    setNotice(message ? { type: 'warning', text: message } : null);
  }, []);

  // 401 מהשרת: ההתחברות פגה
  const handleUnauthorized = useCallback(() => logout('ההתחברות פגה. יש להתחבר מחדש.'), [logout]);

  // התנתקות אוטומטית ברגע שה-token פג (ולא רק כשהקריאה הבאה נכשלת)
  useEffect(() => {
    if (!session) return undefined;
    const msLeft = Date.parse(session.expiresAtUtc) - Date.now();
    const timer = setTimeout(handleUnauthorized, Math.min(Math.max(msLeft, 0), 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [session, handleUnauthorized]);

  function handleAuthenticated(auth) {
    setSession(saveSession(auth));
    setNotice(null);
    navigate('/');
  }

  if (!session) {
    return (
      <ToastProvider>
        <AuthScreen api={api} onAuthenticated={handleAuthenticated} notice={notice} />
      </ToastProvider>
    );
  }

  const links = NAV.filter((item) => item.roles.includes(session.role));
  const current = links.find((item) => item.path === route) ?? null;
  const screenProps = { api, session, onUnauthorized: handleUnauthorized, onNavigate: navigate };

  let screen;
  if (!current) {
    // כתובת לא קיימת או לא מתאימה לתפקיד: חוזרים לחניון (השרת בכל מקרה היה עונה 403)
    screen = <GarageScreen {...screenProps} />;
  } else if (current.path === '/') screen = <GarageScreen {...screenProps} />;
  else if (current.path === '/reservations') screen = <MyReservationsScreen {...screenProps} />;
  else if (current.path === '/admin/spots') screen = <AdminSpotsScreen {...screenProps} />;
  else screen = <AdminReservationsScreen {...screenProps} />;

  return (
    <ToastProvider>
      <a className="skip-link" href="#main">דילוג לתוכן</a>
      <div className="shell">
        <header className="topbar">
          <a href="#/" className="brand" aria-label="ParkingSystem, לדף הראשי"><Logo /></a>
          <nav className="nav" aria-label="ניווט ראשי">
            {links.map((item) => (
              <a key={item.path} href={`#${item.path}`} className={`nav-link ${(current?.path ?? '/') === item.path ? 'is-active' : ''}`} aria-current={(current?.path ?? '/') === item.path ? 'page' : undefined}>
                <item.icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <div className="user">
            <div className="user-meta">
              <strong>{session.fullName}</strong>
              <span className="role-tag">{roleLabel[session.role] ?? session.role}</span>
            </div>
            <button type="button" className="icon-btn bordered" onClick={() => logout()} aria-label="התנתקות" title="התנתקות">
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>{screen}</main>
      </div>
    </ToastProvider>
  );
}
