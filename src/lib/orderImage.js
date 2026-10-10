// Draws the order summary photo (a handwritten-looking notepad page) and returns it as a PNG data URL.
// The customer sends this photo to us on WhatsApp together with the payment screenshot.
import { formatRupees } from './format';

const WIDTH = 520;
const TOP = 170; // first ruled line
const LINE = 34; // ruled line height
const SCALE = 2; // retina-sharp
const INK = '#1B2A6B';
const INK_SOFT = '#4A5A8A';
const GRAY = '#8A8A8A';

export function drawOrderSummary({ summary, orderId, deliverTo, timestamp }) {
  const rows = [];
  summary.lines.forEach(({ restaurant, items }) => {
    rows.push({ heading: restaurant.name });
    items.forEach(({ dish, qty, lineTotal }) =>
      rows.push({ text: `${qty} × ${dish.name}`, price: formatRupees(lineTotal) }),
    );
  });
  const height = TOP + rows.length * LINE + 4 * LINE + 120;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
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
  for (let y = TOP - 8; y < height - 40; y += LINE) {
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

  const left = 74;
  const right = WIDTH - 28;
  const textAt = (text, x, y, align = 'left') => {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  };

  // Heading
  ctx.fillStyle = GRAY;
  ctx.font = '700 13px Afacad, sans-serif';
  ctx.fillText('HUNGRR  ·  ORDER SUMMARY' + (orderId ? '  ·  ' + orderId : ''), left, 54);
  ctx.fillStyle = INK;
  ctx.font = '700 36px Kalam, cursive';
  ctx.fillText('Your order', left, 98);
  ctx.fillStyle = INK_SOFT;
  ctx.font = '400 18px Kalam, cursive';
  ctx.fillText('Deliver to: ' + deliverTo, left, 128);
  textAt(timestamp || '', right, 128, 'right');

  // Dishes, grouped by restaurant
  let y = TOP + 16;
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
  ctx.fillStyle = GRAY;
  ctx.font = '500 14px Afacad, sans-serif';
  ctx.fillText('hungrr · Multiple restaurants, one delivery.', left, height - 26);

  return canvas.toDataURL('image/png');
}
