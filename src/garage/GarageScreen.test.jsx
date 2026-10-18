// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api.js';
import { isoDate } from '../lib/dates.js';
import { ToastProvider } from '../components/Toasts.jsx';
import GarageScreen from './GarageScreen.jsx';

afterEach(cleanup);

const spots = [
  { id: 1, code: 'G-01', floor: 0, isActive: true, isAvailable: true, features: [{ id: 3, name: 'טעינה לרכב חשמלי' }] },
  { id: 2, code: 'G-02', floor: 0, isActive: true, isAvailable: false, features: [] },
  { id: 3, code: 'G-03', floor: 0, isActive: false, isAvailable: false, features: [] },
];

function fakeApi(overrides = {}) {
  return {
    listAllSpots: vi.fn().mockResolvedValue({ items: spots, totalCount: 3 }),
    myReservations: vi.fn().mockResolvedValue({ items: [] }),
    listFeatures: vi.fn().mockResolvedValue([{ id: 3, name: 'טעינה לרכב חשמלי' }]),
    reserve: vi.fn().mockResolvedValue({
      reservation: { id: 77, date: isoDate(0), createdAtUtc: '2030-01-01T10:00:00Z', parkingSpot: spots[0] },
    }),
    cancelReservation: vi.fn(),
    ...overrides,
  };
}

function setup(api, role = 'Employee') {
  const onUnauthorized = vi.fn();
  render(
    <ToastProvider>
      <GarageScreen api={api} session={{ role, fullName: 'Dana' }} onUnauthorized={onUnauthorized} />
    </ToastProvider>,
  );
  return { onUnauthorized, user: userEvent.setup() };
}

const slot = (code) => screen.findByRole('button', { name: new RegExp(`מקום ${code}`) });

describe('GarageScreen', () => {
  it('defaults to today and asks the server for that date', async () => {
    const api = fakeApi();
    setup(api);

    await slot('G-01');
    expect(api.listAllSpots).toHaveBeenCalledWith({ date: isoDate(0) }, expect.anything());
    expect(screen.getByLabelText('תאריך').value).toBe(isoDate(0));
  });

  it('maps server flags to visible states in the accessible names', async () => {
    setup(fakeApi());

    expect((await slot('G-01')).getAttribute('aria-label')).toMatch(/פנוי/);
    expect((await slot('G-02')).getAttribute('aria-label')).toMatch(/תפוס/);
    expect((await slot('G-03')).getAttribute('aria-label')).toMatch(/לא פעיל/);
  });

  it('reserves the selected spot and shows the server confirmation', async () => {
    const api = fakeApi();
    const { user } = setup(api);

    await user.click(await slot('G-01'));
    await user.click(screen.getByRole('button', { name: /הזמנת/ }));

    expect(api.reserve).toHaveBeenCalledWith(1, isoDate(0));
    expect(await screen.findByText('ההזמנה נקלטה בשרת')).toBeTruthy();
    expect(screen.getByText('#77')).toBeTruthy();
    // הנתונים נטענים מחדש אחרי הצלחה
    await waitFor(() => expect(api.listAllSpots).toHaveBeenCalledTimes(2));
  });

  it('explains a 409 conflict and refreshes the data', async () => {
    const api = fakeApi({ reserve: vi.fn().mockRejectedValue(new ApiError(409, 'המקום כבר תפוס בתאריך זה.')) });
    const { user } = setup(api);

    await user.click(await slot('G-01'));
    await user.click(screen.getByRole('button', { name: /הזמנת/ }));

    expect(await screen.findByText(/ההזמנה לא נקלטה: המקום כבר תפוס בתאריך זה/)).toBeTruthy();
    await waitFor(() => expect(api.listAllSpots).toHaveBeenCalledTimes(2));
  });

  it('sends only one request when the button is clicked twice quickly', async () => {
    let release;
    const api = fakeApi({ reserve: vi.fn().mockReturnValue(new Promise((resolve) => { release = resolve; })) });
    const { user } = setup(api);

    await user.click(await slot('G-01'));
    const button = screen.getByRole('button', { name: /הזמנת/ });
    await user.dblClick(button);

    expect(api.reserve).toHaveBeenCalledTimes(1);
    release({ reservation: { id: 1, date: isoDate(0), createdAtUtc: '2030-01-01T10:00:00Z', parkingSpot: spots[0] } });
  });

  it('logs out on 401 from the server', async () => {
    const api = fakeApi({ reserve: vi.fn().mockRejectedValue(new ApiError(401, 'נדרשת התחברות.')) });
    const { user, onUnauthorized } = setup(api);

    await user.click(await slot('G-01'));
    await user.click(screen.getByRole('button', { name: /הזמנת/ }));

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });

  it('does not offer reserving to an admin', async () => {
    const { user } = setup(fakeApi(), 'Admin');

    await user.click(await slot('G-01'));

    expect(screen.queryByRole('button', { name: /הזמנת/ })).toBeNull();
    expect(screen.getByText(/אינו מזמין/)).toBeTruthy();
  });

  it('selects with the keyboard and moves between spots with arrow keys', async () => {
    const { user } = setup(fakeApi());

    const first = await slot('G-01');
    first.focus();
    await user.keyboard('{Enter}');
    expect(first.getAttribute('aria-pressed')).toBe('true');

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement.getAttribute('data-spot-id')).toBeTruthy();
  });

  it('shows the same spots in the accessible list view', async () => {
    const { user } = setup(fakeApi());
    await slot('G-01');

    await user.click(screen.getByRole('button', { name: /רשימה/ }));

    const list = document.querySelector('.spot-list');
    expect(within(list).getByText('G-01')).toBeTruthy();
    expect(within(list).getByText('G-02')).toBeTruthy();
  });
});
