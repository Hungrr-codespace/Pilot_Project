// Opening hours and the open / closed / paused state of ordering, always in Indian time (IST, UTC+5:30, no
// daylight saving), whatever the time zone of the customer's phone.

const IST_OFFSET_MINUTES = 330;
const DAY = 24 * 60;

// "11:00 AM", "11 am", "11:00", "20:30", "8.30 pm" → minutes after midnight (660, 660, 660, 1230, 1230), or null.
export function parseClock(value) {
  const match = String(value ?? '')
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const half = match[3]?.[0];
  if (minutes > 59 || hours > 24 || (half && (hours < 1 || hours > 12))) return null;
  if (half === 'p' && hours !== 12) hours += 12;
  if (half === 'a' && hours === 12) hours = 0;
  return (hours * 60 + minutes) % DAY;
}

// 660 → "11:00 AM", 1230 → "8:30 PM"
export function formatClock(minutes) {
  const m = ((minutes % DAY) + DAY) % DAY;
  const hours = Math.floor(m / 60);
  const half = hours < 12 ? 'AM' : 'PM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(m % 60).padStart(2, '0')} ${half}`;
}

// The time now in India, as minutes after midnight.
export function minutesInIndia(now = new Date()) {
  return (now.getUTCHours() * 60 + now.getUTCMinutes() + IST_OFFSET_MINUTES) % DAY;
}

// The hours as shown on the site: { label: "11:00 AM – 8:30 PM", sentence: "11:00 AM to 8:30 PM", … }
export function describeHours({ opensAt, closesAt }) {
  const opens = formatClock(opensAt);
  const closes = formatClock(closesAt);
  return {
    opensAt,
    closesAt,
    opens,
    closes,
    label: `${opens} – ${closes}`,
    sentence: `${opens} to ${closes}`,
  };
}

const CLOSING_SOON = 30; // minutes before closing when the site starts saying "last orders"

// Whether orders can be placed now.
//   state: 'open' | 'closed' | 'paused'
//   closingSoon: open, with less than 30 minutes to go
//   opensToday: closed, and it opens later today (false: it opens tomorrow)
export function getShopStatus({ opensAt, closesAt, ordersPaused, pauseMessage }, now = new Date()) {
  const hours = describeHours({ opensAt, closesAt });
  const t = minutesInIndia(now);
  const overnight = closesAt <= opensAt; // e.g. 6 PM to 2 AM
  const isOpenTime = overnight ? t >= opensAt || t < closesAt : t >= opensAt && t < closesAt;
  const minutesLeft = isOpenTime ? (closesAt - t + DAY) % DAY : 0;

  if (ordersPaused) return { state: 'paused', message: pauseMessage || '', hours, closingSoon: false };
  if (!isOpenTime) {
    return { state: 'closed', message: '', hours, closingSoon: false, opensToday: overnight || t < opensAt };
  }
  return { state: 'open', message: '', hours, closingSoon: minutesLeft <= CLOSING_SOON, minutesLeft };
}

// What the status pill says: "Open now · till 8:30 PM", "Last orders at 8:30 PM", "Closed · opens at 11:00 AM",
// "Orders paused". `short` drops the times (for tight spots).
export function shopStatusText(status, short = false) {
  const { state, closingSoon, opensToday, hours } = status;
  if (state === 'paused') return 'Orders paused';
  if (state === 'closed') {
    if (short) return 'Closed now';
    return `Closed · opens ${opensToday ? '' : 'tomorrow '}at ${hours.opens}`;
  }
  if (short) return closingSoon ? 'Closing soon' : 'Open now';
  return closingSoon ? `Last orders at ${hours.closes}` : `Open now · till ${hours.closes}`;
}
