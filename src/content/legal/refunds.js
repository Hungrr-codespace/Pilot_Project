import { CONTACT_DETAILS, GRIEVANCE_PROMISE } from './business';

// Refund & Cancellation Policy. Same text format as privacy.js.
// The time limits here (2 hours to report a problem, a 10-minute wait at the door, refunds within 2 working
// days) are proposals: change them to what Hungrr can promise.
export const REFUND_POLICY = {
  id: 'refunds',
  title: 'Refund & Cancellation Policy',
  lead: 'What happens if you need to cancel, or if something goes wrong with your order or your payment.',
  summary: [
    'Cancel before the restaurants start preparing your food and you get a full refund. There is no cancellation fee.',
    'Wrong, missing or spoilt dish? Tell us within 2 hours of delivery and we will send a fresh one at our cost, or refund it.',
    'If we have to cancel your order, you get a full refund.',
    'Refunds go back by UPI to the account you paid from, within 2 working days of approval.',
  ],
  sections: [
    {
      id: 'cancelling',
      title: 'Cancelling your order',
      blocks: [
        {
          list: [
            'Before you pay: there is nothing to do. An order that has not been paid for is not sent to the restaurants.',
            'After you pay, before the restaurants start preparing your food: message us on WhatsApp at {whatsapp} with your order ID. We will cancel the order and refund you in full.',
            'Once a restaurant has started preparing your food, we cannot cancel that part of the order, because the food is being made for you. Message us anyway: if a restaurant in your order has not started yet, we will cancel and refund that part.',
          ],
        },
        'We do not charge a cancellation fee.',
      ],
    },
    {
      id: 'if-we-cancel',
      title: 'If we cancel your order',
      blocks: [
        'We may have to cancel an order if a restaurant is closed, a dish is not available, we cannot deliver to your address, or we cannot match your payment.',
        'If a dish is not available, we will tell you and help you pick another one or change your order. If you would rather not, or if we cancel the whole order, we refund you in full.',
      ],
    },
    {
      id: 'problems',
      title: 'Problems with your order',
      blocks: [
        'If you get the wrong dish, a dish is missing, or something is off with your food or its packing:',
        {
          list: [
            'Message us on WhatsApp at {whatsapp} within 2 hours of delivery.',
            'Send your order ID, what went wrong and a photo if you can.',
            'We will send you a fresh dish at our cost, or refund your money if we cannot replace it.',
          ],
        },
        'For a single dish, we refund the price of the dish and the GST on it. If the whole order goes wrong, we refund everything, including the delivery charge.',
      ],
    },
    {
      id: 'not-delivered',
      title: 'If your order does not arrive',
      blocks: [
        'If we cannot deliver your order because of a problem on our side, we refund you in full.',
        'If our rider reaches your address and cannot find you, we will call you and wait for 10 minutes. If we still cannot hand the order over, it counts as delivered and we cannot refund it, because the food has already been made.',
      ],
    },
    {
      id: 'payment-problems',
      title: 'Payment problems',
      blocks: [
        {
          list: [
            'You paid, but your order did not go through (for example, the page closed before you entered the UPI reference number): message us with the UPI reference number. We will find your payment and either place your order or refund you in full.',
            'You paid more than the total, or paid twice: we refund the extra amount.',
            'You paid less than the total: we will ask you to pay the rest, or refund what you paid and cancel the order.',
            'Money left your account but the payment failed: under RBI rules your bank reverses it on its own, usually by the next working day. If it does not, contact your UPI app or bank, and message us if you are not sure whether we received it.',
          ],
        },
      ],
    },
    {
      id: 'how-refunds-are-paid',
      title: 'How refunds are paid',
      blocks: [
        {
          list: [
            'We refund by UPI to the account you paid from.',
            'We send approved refunds within 2 working days. UPI transfers usually arrive within minutes.',
            'We will tell you on WhatsApp when we have sent your refund, with its amount.',
          ],
        },
      ],
    },
    {
      id: 'asking',
      title: 'How to ask for a refund',
      blocks: [
        'Message us on WhatsApp at {whatsapp} or email {email} with:',
        {
          list: [
            'Your order ID (it starts with HG and is on your bill).',
            'Your 12-digit UPI reference number.',
            'What went wrong, with a photo if it helps.',
          ],
        },
        GRIEVANCE_PROMISE,
      ],
    },
    {
      id: 'contact',
      title: 'Contact and Grievance Officer',
      blocks: [
        'Our {terms} and {privacy} also apply to your order. If you are not happy with how we handled a refund, contact our Grievance Officer:',
        { details: CONTACT_DETAILS },
        'You can also contact the National Consumer Helpline on 1915.',
      ],
    },
  ],
};
