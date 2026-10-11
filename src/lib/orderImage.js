// Draws the order bill (a handwritten-looking notepad page) and returns it as a PNG data URL.
// The customer saves it and sends it to us on WhatsApp. It shows who ordered, where to deliver, the dishes,
// the totals and the UPI reference number of the payment.
import { formatIndianPhone, formatUpiRef } from './checkout';
import { formatRupees } from './format';

const WIDTH = 520;
const HEADER_TOP = 170; // first ruled line when there is no address
const ADDRESS_LINE = 24;
const LINE = 34; // ruled line height
const SCALE = 2; // retina-sharp
const INK = '#1B2A6B';
const INK_SOFT = '#4A5A8A';
const GRAY = '#8A8A8A';

// Splits text into lines that fit `maxWidth` with the context's current font (at most `maxLines`).
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

export function drawOrderSummary({ summary, orderId, customer, timestamp, upiRef }) {
  const rows = [];
  summary.lines.forEach(({ restaurant, items }) => {
    rows.push({ heading: restaurant.name });
    items.forEach(({ dish, qty, lineTotal }) =>
      rows.push({ text: `${qty} × ${dish.name}`, price: formatRupees(lineTotal) }),
    );
  });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const left = 74;
  const right = WIDTH - 28;

  // The delivery address can take up to three lines under the name.
  ctx.font = '400 18px Kalam, cursive';
  const address = wrapText(ctx, `Deliver to: ${customer?.address || ''}`, right - left, 3);
  const firstLine = HEADER_TOP + address.length * ADDRESS_LINE;
  const height = firstLine + rows.length * LINE + 4 * LINE + 120 + (upiRef ? 40 : 0);

  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  ctx.scale(SCALE, SCALE);

  // Paper with a torn top edge
  ctx.fillStyle = '#FFFEF4';
  ctx.beginPath();
  ctx.moveTo(0, 16);
  for (let i = 0; i <= 52; i++) ctx.lineTo(i * 10, 4 + ((i * 7) % 11));
  ctx.lineTo(WIDTH, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Ruled lines and the red margin
  ctx.strokeStyle = '#D6E2F3';
  ctx.lineWidth = 1;
  for (let y = firstLine - 8; y < height - 40; y += LINE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WIDTH, y + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = '#F0A8A8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(54, 14);
  ctx.lineTo(54, height);
  ctx.stroke();

  const textAt = (text, x, y, align = 'left') => {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  };

  // Heading
  ctx.fillStyle = GRAY;
  ctx.font = '700 13px Afacad, sans-serif';
  ctx.fillText('HUNGRR  ·  ORDER BILL' + (orderId ? '  ·  ' + orderId : ''), left, 54);
  ctx.font = '500 13px Afacad, sans-serif';
  textAt(timestamp || '', right, 54, 'right');
  ctx.fillStyle = INK;
  ctx.font = '700 36px Kalam, cursive';
  ctx.fillText('Your order', left, 98);
  ctx.fillStyle = INK_SOFT;
  ctx.font = '400 18px Kalam, cursive';
  const who = [customer?.name, formatIndianPhone(customer?.phone)].filter(Boolean).join('  ·  ');
  ctx.fillText(who, left, 128);
  address.forEach((text, i) => ctx.fillText(text, left, 128 + (i + 1) * ADDRESS_LINE));

  // Dishes, grouped by restaurant
  let y = firstLine + 16;
  rows.forEach((row) => {
    ctx.fillStyle = INK;
    if (row.heading) {
      ctx.font = '700 20px Kalam, cursive';
      ctx.fillText(row.heading, left, y);
      ctx.fillRect(left, y + 5, ctx.measureText(row.heading).width, 1.5);
    } else {
      ctx.font = '400 19px Kalam, cursive';
      ctx.fillText(row.text, left, y);
      textAt(row.price, right, y, 'right');
    }
    y += LINE;
  });

  // Charges
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(left, y - 22);
  ctx.lineTo(right, y - 22);
  ctx.stroke();
  ctx.setLineDash([]);
  const charges = [
    ['Item total', formatRupees(summary.itemTotal)],
    [`GST (${summary.gstRate}%)`, formatRupees(summary.gst)],
    [summary.deliveryLabel, formatRupees(summary.delivery)],
  ];
  ctx.font = '400 18px Kalam, cursive';
  charges.forEach(([label, value]) => {
    ctx.fillText(label, left, y);
    textAt(value, right, y, 'right');
    y += LINE;
  });
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y - 22);
  ctx.lineTo(right, y - 22);
  ctx.stroke();
  ctx.font = '700 26px Kalam, cursive';
  ctx.fillText('Grand total', left, y + 6);
  textAt(formatRupees(summary.grandTotal), right, y + 6, 'right');
  y += LINE + 16;

  ctx.fillStyle = INK_SOFT;
  ctx.font = '400 17px Kalam, cursive';
  ctx.fillText('Paid by UPI · ' + formatRupees(summary.grandTotal), left, y);
  if (upiRef) {
    // The UPI reference number, boxed so it is easy to read and match with the payment.
    y += 40;
    ctx.font = '700 22px Afacad, sans-serif';
    const label = 'UPI ref no.  ' + formatUpiRef(upiRef);
    const boxWidth = ctx.measureText(label).width + 28;
    ctx.fillStyle = '#FFF3B8';
    ctx.fillRect(left - 14, y - 26, boxWidth, 36);
    ctx.fillStyle = '#000000';
    ctx.fillText(label, left, y);
  }
  ctx.fillStyle = GRAY;
  ctx.font = '500 14px Afacad, sans-serif';
  ctx.fillText('hungrr · Multiple restaurants, one delivery.', left, height - 26);

  return canvas.toDataURL('image/png');
}
