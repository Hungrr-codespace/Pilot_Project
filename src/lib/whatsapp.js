// WhatsApp links and the order message the customer sends us with the bill.
import { formatIndianPhone, formatUpiRef } from './checkout';
import { formatRupees } from './format';

export function whatsappLink(number, text) {
  return `https://wa.me/${number}` + (text ? `?text=${encodeURIComponent(text)}` : '');
}

// 917979037042 → "+91 79790 37042"
export function formatPhoneNumber(number) {
  if (number.length === 12 && number.startsWith('91')) return `+91 ${number.slice(2, 7)} ${number.slice(7)}`;
  return '+' + number;
}

// The message prefilled in WhatsApp after the payment is confirmed. The customer attaches the bill.
export function buildOrderMessage({ summary, orderId, customer, upiRef }) {
  let text = "Hi Hungrr! I've paid for my order on the website.\n";
  if (orderId) text += `Order ID: ${orderId}\n`;
  if (upiRef) text += `UPI ref no.: ${formatUpiRef(upiRef)}\n`;
  if (customer?.name) text += `Name: ${customer.name}\n`;
  if (customer?.phone) text += `Phone: ${formatIndianPhone(customer.phone)}\n`;
  if (customer?.address) text += `Deliver to: ${customer.address}\n`;
  summary.lines.forEach(({ restaurant, items }) => {
    text += `\n${restaurant.name}\n`;
    text += items.map(({ dish, qty }) => `• ${qty}× ${dish.name}`).join('\n') + '\n';
  });
  text += `\nGrand total: ${formatRupees(summary.grandTotal)} (incl. GST and delivery), paid by UPI.\n`;
  text += 'Attaching my bill.';
  return text;
}
