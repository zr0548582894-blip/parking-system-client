import { describe, expect, it } from 'vitest';
import { clearSession, loadSession, saveSession } from './session.js';

// sessionStorage מדומה
function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    size: () => data.size,
  };
}

const auth = {
  token: 'jwt-token',
  expiresAtUtc: '2030-01-01T10:00:00Z',
  userId: 7,
  fullName: 'Dana Levi',
  email: 'dana@example.com',
  role: 'Employee',
  extra: 'not stored',
};

describe('session', () => {
  it('saves the login and loads it back (only the needed fields)', () => {
    const storage = fakeStorage();

    saveSession(auth, storage);
    const session = loadSession(storage, Date.parse('2029-12-31T10:00:00Z'));

    expect(session).toEqual({
      token: 'jwt-token',
      expiresAtUtc: '2030-01-01T10:00:00Z',
      userId: 7,
      fullName: 'Dana Levi',
      email: 'dana@example.com',
      role: 'Employee',
    });
  });

  it('returns null when nothing was saved', () => {
    expect(loadSession(fakeStorage())).toBeNull();
  });

  it('drops an expired login, so an old token is never sent', () => {
    const storage = fakeStorage();
    saveSession(auth, storage);

    expect(loadSession(storage, Date.parse('2030-01-01T10:00:01Z'))).toBeNull();
    expect(storage.size()).toBe(0);
  });

  it('drops a corrupted value instead of crashing', () => {
    const storage = fakeStorage();
    storage.setItem('parking.session', '{not json');

    expect(loadSession(storage)).toBeNull();
    expect(storage.size()).toBe(0);
  });

  it('logout removes the login', () => {
    const storage = fakeStorage();
    saveSession(auth, storage);

    clearSession(storage);

    expect(storage.size()).toBe(0);
  });
});
