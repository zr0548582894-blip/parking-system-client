import { describe, expect, it } from 'vitest';
import { validateAuthForm, validateSpotForm } from './validation.js';

describe('validateAuthForm', () => {
  const ok = { fullName: 'Dana Levi', email: 'dana@example.com', password: 'Passw0rd!x' };

  it('accepts a valid registration', () => {
    expect(validateAuthForm(ok, true)).toEqual({});
  });

  it('mirrors the server rules for registration', () => {
    const errors = validateAuthForm({ fullName: 'D', email: 'nope', password: 'short' }, true);
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password']);
  });

  it('counts password bytes, not characters (BCrypt limit is 72 bytes)', () => {
    expect(validateAuthForm({ ...ok, password: 'א'.repeat(40) }, true).password).toContain('72');
    expect(validateAuthForm({ ...ok, password: 'a'.repeat(72) }, true).password).toBeUndefined();
  });

  it('login only needs an email and a password', () => {
    expect(validateAuthForm({ fullName: '', email: 'a@b.co', password: 'x' }, false)).toEqual({});
    expect(validateAuthForm({ fullName: '', email: 'a@b.co', password: '' }, false).password).toBeDefined();
  });
});

describe('validateSpotForm', () => {
  it('accepts the documented ranges', () => {
    expect(validateSpotForm({ code: 'G-01', floor: '-10' })).toEqual({});
    expect(validateSpotForm({ code: 'G-01', floor: '100' })).toEqual({});
  });

  it('rejects an empty or long code and an out of range floor', () => {
    expect(validateSpotForm({ code: '  ', floor: '0' }).code).toBeDefined();
    expect(validateSpotForm({ code: 'x'.repeat(21), floor: '0' }).code).toBeDefined();
    expect(validateSpotForm({ code: 'A', floor: '101' }).floor).toBeDefined();
    expect(validateSpotForm({ code: 'A', floor: '1.5' }).floor).toBeDefined();
    expect(validateSpotForm({ code: 'A', floor: '' }).floor).toBeDefined();
  });
});
