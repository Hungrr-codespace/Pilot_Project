import { BUSINESS, CONTACT_DETAILS, GRIEVANCE_PROMISE } from './business';

// Terms & Conditions. Same text format as privacy.js.
export const TERMS = {
  id: 'terms',
  title: 'Terms & Conditions',
  lead: 'The rules for using this website and ordering from Hungrr during the pilot.',
  summary: [
    'During the pilot we deliver only to the {campus} campus, from {hours}.',
    'Your total includes the dishes, GST and one delivery charge for each rider your order needs, less any offer or coupon (one per order).',
    'You pay by UPI and enter your UPI reference number. Your order is accepted once we have checked the payment.',
    'The restaurants prepare the food and we bring it to you. If something goes wrong, our {refunds} explains what happens.',
  ],
  sections: [
    {
      id: 'about',
      title: 'About these terms',
      blocks: [
        `These terms are an agreement between you and ${BUSINESS.legalName}, which runs Hungrr ("Hungrr", "we", "us"). They apply when you use this website and when you place an order.`,
        'By placing an order, you agree to these terms, our {privacy} and our {refunds}. If you do not agree, please do not order.',
      ],
    },
    {
      id: 'pilot',
      title: 'The pilot',
      blocks: [
        'Hungrr is in a pilot. During the pilot:',
        {
          list: [
            'We deliver only to the {campus} campus.',
            'Orders are open from {hours}, unless we say otherwise on the website or on WhatsApp.',
            'Restaurants, dishes, prices and features may change, and we may pause ordering at busy times or for maintenance.',
          ],
        },
      ],
    },
    {
      id: 'ordering',
      title: 'Placing an order',
      blocks: [
        {
          list: [
            'You choose dishes from one or more partner restaurants. Restaurants are grouped in clusters along the same route, and one rider brings everything from one cluster.',
            'Before you pay, the order note shows the item total, GST, the delivery charge and any discount. Please check it carefully.',
            'You sign in to your account, give your delivery address, scan the QR code and pay by UPI, then enter the 12-digit UPI reference number from your UPI app.',
            'We check your payment and send your order to the restaurants. Your order is accepted once we have checked your payment. If we cannot accept it, we will tell you and refund you in full.',
          ],
        },
      ],
    },
    {
      id: 'account',
      title: 'Your account',
      blocks: [
        {
          list: [
            'To order, you open an account (your khata) with your mobile number and a 6-digit PIN. Each number can have one account, and the number must be yours.',
            'Keep your PIN to yourself. Orders placed while signed in to your account are treated as yours.',
            'After five wrong PINs in a row, your account locks for 15 minutes. If you forget your PIN, message us from your number and we will reset it.',
            'You can change the name on your account. To change its phone number, message us.',
            'You can close your account at any time by messaging us. We may close or lock an account that is used to place fake orders or to misuse the website.',
          ],
        },
      ],
    },
    {
      id: 'prices-and-payment',
      title: 'Prices and payment',
      blocks: [
        {
          list: [
            'All prices are in Indian rupees. Your total includes GST at the rate shown on the order note and a delivery charge for each rider your order needs.',
            'For now we accept UPI only. Pay the exact total through the QR code on this website. We will never ask for your UPI PIN, an OTP or a bank password.',
            'Enter the UPI reference number of your own payment. If the number is wrong or the payment does not match, we may hold or cancel the order until it is sorted out.',
            'If a price on the website is clearly wrong (for example, a typing error), we will tell you before your food is prepared. You can then pay the correct price or cancel for a full refund.',
          ],
        },
      ],
    },
    {
      id: 'offers',
      title: 'Offers and coupons',
      blocks: [
        {
          list: [
            'Offers and coupons are for orders placed while signed in to your account. Each order can use one offer or coupon: if more than one applies, we use the one that saves you more.',
            'Each offer or coupon has its own conditions, shown on the website when you apply it, such as a minimum order, the dates it is valid, a cap on the discount and how many times it can be used.',
            'Offers based on your number of orders (for example, free delivery on every 5th order) count your paid orders in your account that were not cancelled.',
            'A discount on the food comes off before GST is added. We check the offer or coupon again when your order is saved. If it stopped being valid in the meantime (for example, the last use was taken a moment earlier), we will contact you before accepting the order.',
            'If an order is cancelled, its coupon use is returned and the order does not count towards an offer. Refunds are for the amount you paid.',
            'Offers and coupons have no cash value, cannot be exchanged or transferred, and can be changed or ended by us at any time without affecting orders already placed.',
            'If an offer or coupon is misused (for example, through several accounts for one person, or a code shared against its conditions), we may refuse it or cancel the order and refund what was paid.',
          ],
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Your details and delivery',
      blocks: [
        {
          list: [
            'Give your correct name, phone number and delivery address, and keep your phone with you until your order arrives.',
            'Delivery times are estimates. They depend on the restaurants, the riders available and the weather, and we will keep you posted if there is a delay.',
            'If our rider cannot reach you at your address, our {refunds} explains what happens.',
          ],
        },
      ],
    },
    {
      id: 'food',
      title: 'Food, allergies and quality',
      blocks: [
        {
          list: [
            'The partner restaurants prepare the food and are responsible for its ingredients, hygiene and preparation. We bring it to you.',
            'Veg and non-veg marks and dish descriptions come from the restaurants, and photos are for illustration. If you have a food allergy, ask us before you order: we cannot promise that a dish is free from any allergen.',
            'If something is wrong with your food, tell us as described in our {refunds}.',
          ],
        },
      ],
    },
    {
      id: 'cancellations',
      title: 'Cancellations and refunds',
      blocks: [
        'Cancellations, refunds and problems with an order are covered by our {refunds}, which is part of these terms.',
      ],
    },
    {
      id: 'fair-use',
      title: 'Using the website fairly',
      blocks: [
        'You agree not to:',
        {
          list: [
            'Place fake orders, or enter a UPI reference number that is not yours.',
            'Misuse the website, copy its content in bulk, or try to break or overload it.',
            'Abuse or threaten our riders, our team or restaurant staff.',
          ],
        },
        'If you do, we may refuse or cancel your orders.',
      ],
    },
    {
      id: 'reviews',
      title: 'Reviews and feedback',
      blocks: [
        'You can rate an order you paid for, with its order ID and the phone number you ordered with. Each order has one review: if you send another, it replaces the first.',
        "Your review should be honest and about your own order. Please do not include abuse, threats, other people's personal details, false claims or advertising.",
        'If you agree to share your review, you let us show your stars, tags and words, the name you choose, the month and the restaurants you ordered from, on this website. We check every review before it appears. We do not edit your words, and we do not leave a review out because its rating is low. We may leave out a review that breaks the rules above.',
        'The overall rating on our website counts every review, whether it is shown or not. Your suggestions for us are read only by our team, and we may use your ideas to improve Hungrr.',
        'You can ask us to take your review off the website at any time.',
      ],
    },
    {
      id: 'our-content',
      title: 'Our name and content',
      blocks: [
        'The Hungrr name, logo, website design and text belong to us. Restaurant names and logos belong to the restaurants. Please do not use them without permission.',
      ],
    },
    {
      id: 'responsibility',
      title: 'Our responsibility',
      blocks: [
        'We do our best to deliver every order correctly and on time. As far as the law allows, our responsibility for an order is limited to the amount you paid for it, and we are not responsible for losses we could not reasonably foresee. Nothing in these terms takes away your rights under the Consumer Protection Act, 2019.',
        'Your bank, your UPI app and WhatsApp are run by other companies under their own terms.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      blocks: [
        'We may update these terms as Hungrr grows. The terms in force when you place an order apply to that order. We will change the date at the top of this page when we update them.',
      ],
    },
    {
      id: 'law',
      title: 'Governing law and disputes',
      blocks: [
        'These terms are governed by the laws of India. If there is a problem, contact us first and we will try to sort it out quickly. Any dispute will be handled by the courts at Patna, Bihar. You can also contact the National Consumer Helpline on 1915.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact and Grievance Officer',
      blocks: [{ details: CONTACT_DETAILS }, GRIEVANCE_PROMISE],
    },
  ],
};
