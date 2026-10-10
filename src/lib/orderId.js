// A short, readable order ID such as HG-261006-K7Q2. It appears on the order photo, in the WhatsApp message and
// in the UPI payment note, so a payment screenshot can be matched to its row in the Google Sheet.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, which are easy to mix up

export function newOrderId(date = new Date()) {
  const pad2 = (n) => String(n).padStart(2, '0');
  let tail = '';
  for (let i = 0; i < 4; i++) tail += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `HG-${String(date.getFullYear()).slice(2)}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${tail}`;
}
