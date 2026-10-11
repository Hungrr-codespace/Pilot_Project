import { Fragment } from 'react';
import { Link } from 'react-router';
import { CAMPUS, CONTACT_EMAIL, CONTACT_EMAIL_LINK, LEGAL_LINKS, ORDER_HOURS } from '@/config/site';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { splitLegalText } from '@/lib/legalText';
import styles from './LegalText.module.css';

// One line of policy text: {tokens} become links or values, [placeholders] are highlighted (still to fill in).
export function LegalText({ text }) {
  const whatsapp = useWhatsAppContact();

  const token = (name) => {
    if (name === 'email') {
      return (
        <ExternalLink href={CONTACT_EMAIL_LINK} className={styles.link}>
          {CONTACT_EMAIL}
        </ExternalLink>
      );
    }
    if (name === 'whatsapp') {
      return (
        <ExternalLink href={whatsapp.href} className={styles.link}>
          {whatsapp.displayNumber}
        </ExternalLink>
      );
    }
    if (name === 'hours') return ORDER_HOURS.replace(' – ', ' to ');
    if (name === 'campus') return CAMPUS;
    const policy = LEGAL_LINKS.find((link) => link.id === name);
    if (policy) {
      return (
        <Link to={policy.to} className={styles.link}>
          {policy.label}
        </Link>
      );
    }
    return `{${name}}`;
  };

  return splitLegalText(text).map((part, i) => (
    <Fragment key={i}>
      {part.type === 'token' && token(part.name)}
      {part.type === 'placeholder' && (
        <mark className={styles.placeholder} title="To be filled in">
          {part.text}
        </mark>
      )}
      {part.type === 'text' && part.text}
    </Fragment>
  ));
}
