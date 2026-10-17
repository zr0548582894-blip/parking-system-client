import { useState } from 'react';
import { api } from './apiClient.js';
import { clearSession, loadSession, saveSession } from './session.js';
import AuthScreen from './screens/AuthScreen.jsx';
import SpotsScreen from './screens/SpotsScreen.jsx';
import MyReservationsScreen from './screens/MyReservationsScreen.jsx';

const roleLabel = { Admin: 'מנהל', Employee: 'עובד' };

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [tab, setTab] = useState('spots');

  // התחברות או הרשמה הצליחו: שומרים את ה-token ועוברים לאפליקציה
  function handleAuthenticated(auth) {
    setSession(saveSession(auth));
    setTab('spots');
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  // מסך 1: התחברות והרשמה
  if (!session) {
    return <AuthScreen api={api} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>הקצאת מקומות חניה</h1>
        <div className="user">
          <span>
            {session.fullName} ({roleLabel[session.role] ?? session.role})
          </span>
          <button type="button" className="link" onClick={handleLogout}>
            התנתקות
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button type="button" className={tab === 'spots' ? 'active' : ''} onClick={() => setTab('spots')}>
          מקומות חניה
        </button>
        {session.role === 'Employee' && (
          <button type="button" className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
            ההזמנות שלי
          </button>
        )}
      </nav>

      <main>
        {tab === 'spots' && <SpotsScreen api={api} session={session} onUnauthorized={handleLogout} />}
        {tab === 'mine' && <MyReservationsScreen api={api} onUnauthorized={handleLogout} />}
      </main>
    </div>
  );
}
