import { describe, expect, it, vi } from 'vitest';
import { ApiError, buildQuery, createApi, isAbort } from './api.js';

// תגובת fetch מדומה, כמו שהשרת עונה
function reply(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name] ?? null },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

function setup(response, token = null) {
  const fetchImpl = vi.fn().mockResolvedValue(response);
  const api = createApi({ baseUrl: 'https://api.example.com/', getToken: () => token, fetchImpl });
  return { api, fetchImpl };
}

describe('buildQuery', () => {
  it('skips empty values and encodes the rest', () => {
    expect(buildQuery({ page: 2, pageSize: 5, date: '2030-01-02', available: undefined, search: '' })).toBe(
      '?page=2&pageSize=5&date=2030-01-02',
    );
  });

  it('returns an empty string when there is nothing to send', () => {
    expect(buildQuery({})).toBe('');
  });

  it('keeps false booleans (they are real values)', () => {
    expect(buildQuery({ available: false })).toBe('?available=false');
  });
});

describe('requests', () => {
  it('sends the token in the Authorization header when there is one', async () => {
    const { api, fetchImpl } = setup(reply(200, { items: [] }), 'abc.def.ghi');

    await api.listSpots();

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('sends no Authorization header without a token (login and register)', async () => {
    const { api, fetchImpl } = setup(reply(200, { token: 't' }));

    await api.login('a@b.com', 'secret-123');

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('calls the REST routes with the right methods and bodies', async () => {
    const { api, fetchImpl } = setup(reply(200, { token: 't' }));

    await api.register('Dana Levi', 'dana@example.com', 'Passw0rd!x');
    await api.login('dana@example.com', 'Passw0rd!x');

    const [register, login] = fetchImpl.mock.calls;
    expect(register[0]).toBe('https://api.example.com/api/users');
    expect(register[1].method).toBe('POST');
    expect(JSON.parse(register[1].body)).toEqual({ fullName: 'Dana Levi', email: 'dana@example.com', password: 'Passw0rd!x' });
    expect(login[0]).toBe('https://api.example.com/api/tokens');
  });

  it('asks the server for the requested page (server-side pagination)', async () => {
    const { api, fetchImpl } = setup(reply(200, { items: [], page: 3 }), 't');

    await api.listSpots({ page: 3, pageSize: 5, date: '2030-02-01', available: true });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://api.example.com/api/parking-spots?page=3&pageSize=5&date=2030-02-01&available=true&sortBy=Code&sortDir=Asc',
    );
  });

  it('returns the Location header of a created reservation', async () => {
    const { api } = setup(reply(201, { id: 7 }, { Location: 'https://api.example.com/api/reservations/7' }), 't');

    const { reservation, location } = await api.reserve(4, '2030-02-01');

    expect(reservation.id).toBe(7);
    expect(location).toBe('https://api.example.com/api/reservations/7');
  });

  it('treats 204 (cancel) as success without a body', async () => {
    const { api, fetchImpl } = setup(reply(204), 't');

    await expect(api.cancelReservation(7)).resolves.toBeNull();
    expect(fetchImpl.mock.calls[0][1].method).toBe('DELETE');
  });
});

describe('errors', () => {
  it('turns a 409 into an ApiError that is recognised as a conflict, with the server message', async () => {
    const { api } = setup(reply(409, { status: 409, title: 'המקום כבר תפוס בתאריך זה.', correlationId: 'abc123' }), 't');

    const error = await api.reserve(4, '2030-02-01').catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.isConflict).toBe(true);
    expect(error.message).toBe('המקום כבר תפוס בתאריך זה.');
    expect(error.correlationId).toBe('abc123');
  });

  it('keeps the field errors of a 400', async () => {
    const { api } = setup(reply(400, { title: 'invalid', errors: { Email: ['bad email'] } }));

    const error = await api.register('x', 'bad', 'short').catch((caught) => caught);

    expect(error.status).toBe(400);
    expect(error.errors).toEqual({ Email: ['bad email'] });
  });

  it('recognises 401 so the app can log the user out', async () => {
    const { api } = setup(reply(401, { title: 'נדרשת התחברות.' }), 'expired');

    const error = await api.listSpots().catch((caught) => caught);

    expect(error.isUnauthorized).toBe(true);
  });

  it('reports a network failure with status 0 and a readable message', async () => {
    const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });

    const error = await api.listSpots().catch((caught) => caught);

    expect(error.status).toBe(0);
    expect(error.message).toContain('לא ניתן להתחבר');
  });

  it('survives an error response that is not JSON', async () => {
    const response = { status: 502, ok: false, headers: { get: () => null }, text: async () => '<html>Bad gateway</html>' };
    const { api } = setup(response);

    const error = await api.listSpots().catch((caught) => caught);

    expect(error.status).toBe(502);
    expect(error.message).toContain('502');
  });
});

describe('admin and reservation routes', () => {
  it('manages parking spots with the right methods, paths and bodies', async () => {
    const { api, fetchImpl } = setup(reply(200, { id: 1 }), 'admin-token');

    await api.createSpot({ code: 'G-06', floor: 0, featureIds: [1] });
    await api.updateSpot(4, { code: 'G-06', floor: 0, featureIds: [], isActive: false });
    await api.deleteSpot(4);

    const [create, update, remove] = fetchImpl.mock.calls;
    expect(create[0]).toBe('https://api.example.com/api/parking-spots');
    expect(create[1].method).toBe('POST');
    expect(update[0]).toBe('https://api.example.com/api/parking-spots/4');
    expect(update[1].method).toBe('PUT');
    expect(JSON.parse(update[1].body).isActive).toBe(false);
    expect(remove[1].method).toBe('DELETE');
  });

  it('sends every server-side filter of the spots list', async () => {
    const { api, fetchImpl } = setup(reply(200, { items: [] }), 't');

    await api.listSpots({ page: 2, pageSize: 8, floor: -1, isActive: false, featureId: 3, search: 'G-', sortBy: 'Floor', sortDir: 'Desc' });

    const url = fetchImpl.mock.calls[0][0];
    for (const part of ['floor=-1', 'isActive=false', 'featureId=3', 'search=G-', 'sortBy=Floor', 'sortDir=Desc']) {
      expect(url).toContain(part);
    }
  });

  it('listAllSpots walks every page of 100', async () => {
    const pages = [
      reply(200, { items: [{ id: 1 }], totalPages: 2, totalCount: 2 }),
      reply(200, { items: [{ id: 2 }], totalPages: 2, totalCount: 2 }),
    ];
    const fetchImpl = vi.fn().mockImplementation(async () => pages.shift());
    const api = createApi({ baseUrl: 'https://api.example.com', getToken: () => 't', fetchImpl });

    const { items } = await api.listAllSpots({ date: '2030-01-01' });

    expect(items.map((item) => item.id)).toEqual([1, 2]);
    expect(fetchImpl.mock.calls[1][0]).toContain('page=2&pageSize=100');
  });

  it('reads reservations: mine, all (admin) and one by id', async () => {
    const { api, fetchImpl } = setup(reply(200, { items: [] }), 't');

    await api.myReservations({ page: 1, pageSize: 100 });
    await api.allReservations({ page: 2, pageSize: 10 });
    await api.getReservation(9);

    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      'https://api.example.com/api/reservations/mine?page=1&pageSize=100',
      'https://api.example.com/api/reservations?page=2&pageSize=10',
      'https://api.example.com/api/reservations/9',
    ]);
  });

  it('exposes 403 and 429 (with Retry-After) as typed errors', async () => {
    const forbidden = await setup(reply(403, { title: 'אסור' }), 't').api.reserve(1, '2030-01-01').catch((e) => e);
    expect(forbidden.isForbidden).toBe(true);

    const limited = await setup(reply(429, { title: 'יותר מדי' }, { 'Retry-After': '42' })).api.login('a@b.co', 'x').catch((e) => e);
    expect(limited.isRateLimited).toBe(true);
    expect(limited.retryAfter).toBe(42);
  });

  it('does not wrap an aborted request as a network error', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: vi.fn().mockRejectedValue(abort) });

    const error = await api.listSpots({}, { signal: new AbortController().signal }).catch((e) => e);

    expect(isAbort(error)).toBe(true);
  });
});

describe('activity log and health', () => {
  it('reports method, path (without the query) and status, never the token or body', async () => {
    const seen = [];
    const fetchImpl = vi.fn().mockResolvedValue(reply(200, { items: [] }));
    const api = createApi({ baseUrl: 'https://api.example.com', getToken: () => 'secret-token', fetchImpl, onActivity: (e) => seen.push(e) });

    await api.listSpots({ search: 'private' });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ method: 'GET', path: '/api/parking-spots', status: 200 });
    expect(JSON.stringify(seen[0])).not.toContain('secret-token');
    expect(JSON.stringify(seen[0])).not.toContain('private');
  });

  it('health never throws', async () => {
    const down = createApi({ baseUrl: 'https://api.example.com', fetchImpl: vi.fn().mockRejectedValue(new TypeError('x')) });
    const up = createApi({ baseUrl: 'https://api.example.com', fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200 }) });

    expect(await down.health()).toEqual({ ok: false, status: 0 });
    expect(await up.health()).toEqual({ ok: true, status: 200 });
  });
});
