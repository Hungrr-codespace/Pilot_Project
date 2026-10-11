// Small text helpers shared across the site.

// ₹120, ₹21.40 (paise shown only when there are any).
export function formatRupees(amount) {
  const paise = Math.round(amount * 100);
  return '₹' + (paise % 100 === 0 ? String(Math.round(amount)) : amount.toFixed(2));
}

// plural(1, 'item') → "1 item", plural(3, 'item') → "3 items"
export function plural(count, word, many = word + 's') {
  return `${count} ${count === 1 ? word : many}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => String(n).padStart(2, '0');

// "6 Oct 2026, 6:05 PM"
export function formatTimestamp(date) {
  const hours = date.getHours() % 12 || 12;
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hours}:${pad2(date.getMinutes())} ${ampm}`;
}

// "hungrr-bill-HG-261006-K7Q2.png"
export function billFileName(orderId) {
  return `hungrr-bill-${orderId || 'order'}.png`;
}

// How long ago something happened, for "Updated 5 min ago": "just now", "5 min ago", "2 h ago", or the date.
export function timeAgo(date, now = new Date()) {
  const minutes = Math.round((now - date) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return `on ${formatTimestamp(date)}`;
}
