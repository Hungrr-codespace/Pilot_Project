import { BUSINESS, CONTACT_DETAILS } from './business';

// Privacy Policy. Text blocks: a string is a paragraph, { list } a bulleted list, { details } the contact block.
// {email}, {whatsapp}, {campus}, {hours}, {privacy}, {terms} and {refunds} are filled in by the page;
// [square brackets] are details still to be filled in (see business.js).
export const PRIVACY_POLICY = {
  id: 'privacy',
  title: 'Privacy Policy',
  lead: 'What we collect when you order from Hungrr, why we need it, who sees it, and the choices you have.',
  summary: [
    'We collect only what we need to deliver your order: your name, phone number, delivery address, your order and your UPI reference number.',
    'To order, you open an account (your khata) with your phone number and a 6-digit PIN. We never store the PIN as you typed it.',
    'We never see your UPI PIN or bank login, and this website uses no advertising or tracking cookies.',
    'We do not sell your data. Restaurants see your order; our riders see what they need to deliver it.',
    'If you rate an order, your review appears on the website only if you agree, and you can ask us to remove it.',
    'You can ask us to show, correct or delete your data at any time.',
  ],
  sections: [
    {
      id: 'who-we-are',
      title: 'Who we are',
      blocks: [
        `Hungrr is a food delivery service that lets you order from several nearby restaurants in one go. It is run by ${BUSINESS.legalName}, ${BUSINESS.address} ("Hungrr", "we", "us"). Our first run, the pilot, delivers to the {campus} campus.`,
        'This policy explains how we handle your personal data when you use this website and order through the pilot menu. We follow the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000, and the rules made under them.',
      ],
    },
    {
      id: 'what-we-collect',
      title: 'What we collect',
      blocks: [
        'When you open an account and order, we collect:',
        {
          list: [
            'Your account: your name and phone number, a scrambled form of your PIN (never the PIN itself), when you opened the account and last signed in, and how many wrong PINs were entered in a row.',
            'Your details: your name, phone number and delivery address.',
            'Your order: the dishes and restaurants you chose, the amounts, your order ID and the time.',
            "Your payment: the 12-digit UPI reference number you enter, and what our bank shows us when your payment arrives (the amount, the time and the payer's name or UPI ID).",
            'Your messages: anything you send us on WhatsApp or by email, including the bill you share.',
            'Your review, if you rate an order: your stars, the tags you pick, what you write, your suggestions for us, the name you choose to show and whether you agree to show it on the website.',
            'Your device type: whether you ordered on a phone or tablet, or on a computer.',
          ],
        },
        'We do not collect your UPI PIN, bank or card details, or your location.',
      ],
    },
    {
      id: 'why-we-use-it',
      title: 'Why we use it',
      blocks: [
        {
          list: [
            'To keep your account: to sign you in, to list your orders in your khata, and to keep it safe (for example, by locking it for 15 minutes after five wrong PINs).',
            'To take your order, send it to the restaurants and deliver it to you.',
            'To check your payment against your UPI reference number.',
            'To contact you about your order: a delay, a dish that is not available, the delivery or a refund.',
            'To show you where your order is when you track it with your order ID and phone number.',
            'To learn from your review what to improve, and to show it on our website if you agree.',
            'To handle cancellations, refunds, complaints and disputes.',
            'To keep the records that tax and accounting laws require.',
            'To improve Hungrr, using totals such as the number of orders per restaurant, not profiles of individual people.',
          ],
        },
        'We use your data only for these purposes. We do not sell it and we do not use it for advertising. We will send you offers or news only if you ask us to.',
      ],
    },
    {
      id: 'consent',
      title: 'Your consent',
      blocks: [
        'When you open an account, enter your details and place an order, you agree to us using them as this policy describes. You can withdraw your consent at any time by contacting us. We will then stop using your data, except for the order records the law requires us to keep. Without a phone number and an address we cannot deliver an order.',
      ],
    },
    {
      id: 'sharing',
      title: 'Who we share it with',
      blocks: [
        {
          list: [
            'Restaurants in your order receive the dishes you ordered and your order ID.',
            'Our delivery riders receive your name, phone number and delivery address, to bring you your order.',
            'If you agree to show your review, anyone who visits our website can see your stars, tags and words, the name you chose, the month, and the restaurants you ordered from. Your phone number, your order ID and your suggestions for us are never shown.',
            'Google stores our order records (in Google Sheets, through Google Apps Script). This website also loads its fonts from Google Fonts, so Google receives your IP address when you open it.',
            `${BUSINESS.websiteHost} hosts this website and may keep standard server logs, such as your IP address and browser type.`,
            'WhatsApp (Meta) carries the messages you send us there.',
            'If our team uses Telegram for order alerts, those alerts carry your order ID, amount, UPI reference number and restaurants, but not your name, phone number or address. An alert about a low rating carries the order ID, the stars and the tags you picked.',
            'Your bank and UPI app process your payment under their own terms and privacy policies.',
            'Government authorities or courts, when the law requires us to.',
          ],
        },
        'Some of these providers may store data on servers outside India. We share only what each of them needs.',
      ],
    },
    {
      id: 'on-your-device',
      title: 'What is saved on your device',
      blocks: [
        "This website does not use cookies. It saves four things in your browser's storage:",
        {
          list: [
            'Your sign-in: a code that keeps you signed in on this device for up to 60 days, with your name and phone number. Signing out removes it.',
            'Your name, phone number and address from your last order, so you do not have to type them again.',
            'The IDs, dates and totals of orders paid for on this phone, so you can track them.',
            'A copy of the menu, so it opens quickly.',
          ],
        },
        "The bill for your order is downloaded to your device. To remove the saved details, clear this website's data in your browser settings.",
      ],
    },
    {
      id: 'how-long',
      title: 'How long we keep it',
      blocks: [
        'We keep your order records, with your details, for as long as we need them to deliver your order, deal with refunds and complaints, and meet tax and accounting laws. After that we delete them, or remove the details that identify you.',
        'We keep your review until you ask us to remove it, or until we stop showing pilot reviews.',
        'We keep your account until you ask us to close it.',
      ],
    },
    {
      id: 'security',
      title: 'How we protect it',
      blocks: [
        'Your order records and account are kept in a Google Sheet that only the Hungrr team can open, and we take reasonable security measures to protect your data. Your PIN is stored only in a scrambled form, made with a secret key kept apart from the sheet, so it cannot be read from our records. No system is completely secure: if a data breach affects you, we will tell you without delay, as the law requires.',
      ],
    },
    {
      id: 'your-rights',
      title: 'Your rights',
      blocks: [
        'You can ask us to:',
        {
          list: [
            'Tell you what personal data we hold about you and how we use it.',
            'Correct or update your details.',
            'Delete your data, once we no longer need it for your order or by law.',
            'Take your review off our website, or delete it.',
            'Close your account and delete its details.',
            'Stop using your data (withdraw your consent).',
            'Let someone you nominate use these rights for you, for example if you are ill.',
          ],
        },
        'To do this, message us on WhatsApp at {whatsapp} or email {email}, from the phone number you ordered with or with your order ID, so we can check it is you. We acknowledge requests within 48 hours and respond within one month.',
        'If you are not happy with our response, you can complain to the Data Protection Board of India.',
      ],
    },
    {
      id: 'children',
      title: 'Children',
      blocks: [
        'Hungrr is for people aged 18 and over. We do not knowingly collect personal data from children. If you think a child has given us their details, contact us and we will delete them.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      blocks: [
        'We may update this policy as Hungrr grows. We will change the date at the top of this page, and tell you on the website if a change is important.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact and Grievance Officer',
      blocks: [
        'For questions or complaints about your personal data, contact our Grievance Officer:',
        { details: CONTACT_DETAILS },
      ],
    },
  ],
};
