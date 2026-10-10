// UPI payment link (what the QR code holds). Any UPI app opens it with the amount and note filled in.
export function buildUpiLink({ upiId, upiName, amount, orderId }) {
  const params = [
    'pa=' + encodeURIComponent(upiId).replace(/%40/g, '@'), // UPI IDs keep their @
    'pn=' + encodeURIComponent(upiName),
    'am=' + amount.toFixed(2),
    'cu=INR',
    // The order ID goes in the payment note, so it shows on the customer's payment screenshot.
    'tn=' + encodeURIComponent('Hungrr ' + (orderId || 'order')),
  ];
  return 'upi://pay?' + params.join('&');
}
