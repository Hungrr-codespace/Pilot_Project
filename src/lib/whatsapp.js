// WhatsApp links and the order message the customer sends us.
import { formatRupees } from './format';

export function whatsappLink(number, text) {
  return `https://wa.me/${number}` + (text ? `?text=${encodeURIComponent(text)}` : '');
}

// 917979037042 → "+91 79790 37042"
export function formatPhoneNumber(number) {
  if (number.length === 12 && number.startsWith('91')) return `+91 ${number.slice(2, 7)} ${number.slice(7)}`;
  return '+' + number;
}

// The message prefilled in WhatsApp after paying.
export function buildOrderMessage(summary, orderId) {
  let text = 'Hi Hungrr! Here is my order from the website:\n';
  if (orderId) text += `Order ID: ${orderId}\n`;
  summary.lines.forEach(({ restaurant, items }) => {
    text += `\n${restaurant.name}\n`;
    text += items.map(({ dish, qty }) => `• ${qty}× ${dish.name}`).join('\n') + '\n';
  });
  const total = formatRupees(summary.grandTotal);
  text += `\nGrand total: ${total} (incl. GST and delivery)\n`;
  text += `Paid ${total} by UPI. Attaching the order summary photo and the payment screenshot.\n\nNote: `;
  return text;
}
