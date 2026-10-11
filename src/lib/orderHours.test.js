import { describe, expect, it } from 'vitest';
import {
  describeHours,
  formatClock,
  getShopStatus,
  minutesInIndia,
  parseClock,
  shopStatusText,
} from './orderHours';

// A moment given as Indian time
const ist = (hh, mm) => new Date(Date.UTC(2026, 9, 11, hh, mm) - 330 * 60 * 1000);
const HOURS = { opensAt: 660, closesAt: 1230, ordersPaused: false, pauseMessage: '' };

describe('orderHours', () => {
  it('reads clock times written in different ways', () => {
    expect(parseClock('11:00 AM')).toBe(660);
    expect(parseClock('11 am')).toBe(660);
    expect(parseClock('20:30')).toBe(1230);
    expect(parseClock('8.30 pm')).toBe(1230);
    expect(parseClock('12:00 AM')).toBe(0);
    expect(parseClock('12 PM')).toBe(720);
    expect(parseClock('')).toBeNull();
    expect(parseClock('soon')).toBeNull();
    expect(parseClock('13 pm')).toBeNull();
  });

  it('writes times and hours for the page', () => {
    expect(formatClock(660)).toBe('11:00 AM');
    expect(formatClock(1230)).toBe('8:30 PM');
    expect(formatClock(0)).toBe('12:00 AM');
    expect(describeHours({ opensAt: 660, closesAt: 1230 }).label).toBe('11:00 AM – 8:30 PM');
  });

  it('uses Indian time whatever the device time zone', () => {
    expect(minutesInIndia(ist(9, 15))).toBe(555);
    expect(minutesInIndia(ist(23, 50))).toBe(1430);
  });

  it('knows when ordering is open, closing soon, closed or paused', () => {
    expect(getShopStatus(HOURS, ist(10, 59))).toMatchObject({ state: 'closed', opensToday: true });
    expect(getShopStatus(HOURS, ist(11, 0))).toMatchObject({ state: 'open', closingSoon: false });
    expect(getShopStatus(HOURS, ist(20, 10))).toMatchObject({
      state: 'open',
      closingSoon: true,
      minutesLeft: 20,
    });
    expect(getShopStatus(HOURS, ist(20, 30))).toMatchObject({ state: 'closed', opensToday: false });
    expect(
      getShopStatus({ ...HOURS, ordersPaused: true, pauseMessage: 'Back at 6 PM' }, ist(13, 0)),
    ).toMatchObject({ state: 'paused', message: 'Back at 6 PM' });
  });

  it('handles hours that run past midnight', () => {
    const late = { opensAt: 1080, closesAt: 120, ordersPaused: false };
    expect(getShopStatus(late, ist(23, 0)).state).toBe('open');
    expect(getShopStatus(late, ist(1, 30))).toMatchObject({ state: 'open', closingSoon: true });
    expect(getShopStatus(late, ist(3, 0))).toMatchObject({ state: 'closed', opensToday: true });
  });

  it('describes the status for the pill', () => {
    expect(shopStatusText(getShopStatus(HOURS, ist(13, 0)))).toBe('Open now · till 8:30 PM');
    expect(shopStatusText(getShopStatus(HOURS, ist(20, 15)))).toBe('Last orders at 8:30 PM');
    expect(shopStatusText(getShopStatus(HOURS, ist(9, 0)))).toBe('Closed · opens at 11:00 AM');
    expect(shopStatusText(getShopStatus(HOURS, ist(22, 0)))).toBe('Closed · opens tomorrow at 11:00 AM');
    expect(shopStatusText(getShopStatus({ ...HOURS, ordersPaused: true }, ist(13, 0)))).toBe('Orders paused');
    expect(shopStatusText(getShopStatus(HOURS, ist(9, 0)), true)).toBe('Closed now');
    expect(shopStatusText(getShopStatus(HOURS, ist(20, 15)), true)).toBe('Closing soon');
  });
});
