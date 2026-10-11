// FAQ, grouped like courses on a menu.
const COURSES = [
  {
    course: 'Starters',
    questions: [
      {
        q: 'What is the Hungrr pilot?',
        a: 'It is the first run of Hungrr, made just for BIT Mesra, Patna. During the pilot you order and pay on the pilot menu of this website, and we deliver on campus.',
      },
      {
        q: 'What are the ordering timings?',
        a: 'Orders are open from 11:00 AM to 8:30 PM. Message us any time within these hours and we will get your food moving.',
      },
    ],
  },
  {
    course: 'Main course',
    questions: [
      {
        q: 'How do I place an order?',
        a: 'Open the pilot menu. Turn the table and tap a dish, or open the menu and search. Add your dishes and tap Review to check GST and delivery. Confirm, add your name, phone and delivery address, then scan the QR and pay by UPI. Tap Confirm payment, enter the 12-digit UPI reference number, and send us your bill on WhatsApp.',
      },
      {
        q: 'How does multi-restaurant ordering work?',
        a: 'Add dishes from one restaurant, then pick more under “Also in this cluster”. They are on the same route, so one rider brings it all for one delivery charge. You can add a restaurant from another cluster too. Each cluster has its own rider, so the delivery charge goes up.',
      },
    ],
  },
  {
    course: 'Desserts',
    questions: [
      {
        q: 'How do I pay?',
        a: 'For now we accept UPI payments only. Scan the QR code: the grand total with GST and delivery is already filled in. Then tap Confirm payment and enter the 12-digit UPI reference number from your UPI app. We check the payment and send your order to the restaurants.',
      },
      {
        q: 'What if something goes wrong with my order?',
        a: 'If a dish is not available, we will tell you and help you pick another or change your order. If you get the wrong dish or something is off with your order, message us on WhatsApp. We will send you a fresh dish at our cost, or refund your money if we cannot replace it.',
      },
    ],
  },
];

// Each question gets its number (1, 2, 3…) in the order it appears on the page.
let count = 0;
export const FAQ_GROUPS = COURSES.map((group) => ({
  ...group,
  questions: group.questions.map((question) => ({ ...question, number: ++count })),
}));

export const FAQ_QUESTIONS = FAQ_GROUPS.flatMap((group) => group.questions);
