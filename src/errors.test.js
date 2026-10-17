import { describe, expect, it } from 'vitest';
import { ApiError } from './api.js';
import { conflictMessage, describeError } from './errors.js';

describe('describeError', () => {
  it('lists the field errors of a validation failure', () => {
    const error = new ApiError(400, 'אחד או יותר מהשדות אינם תקינים.', {
      errors: { Email: ['האימייל לא תקין'], Password: ['הסיסמה קצרה מדי'] },
    });

    expect(describeError(error)).toEqual({
      message: 'אחד או יותר מהשדות אינם תקינים.',
      details: ['האימייל לא תקין', 'הסיסמה קצרה מדי'],
    });
  });

  it('gives a generic message for an unexpected (non API) error', () => {
    expect(describeError(new Error('boom')).message).toContain('שגיאה לא צפויה');
  });
});

describe('conflictMessage', () => {
  it('explains that the reservation was not saved, with the server reason', () => {
    const message = conflictMessage(new ApiError(409, 'המקום כבר תפוס בתאריך זה.'));

    expect(message).toContain('ההזמנה לא נקלטה');
    expect(message).toContain('המקום כבר תפוס בתאריך זה.');
  });
});
