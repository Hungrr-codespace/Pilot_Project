import { useState } from 'react';
import clsx from 'clsx';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { Icon } from '@/components/ui/Icon/Icon';
import motion from '@/styles/motion.module.css';
import { FaqMenu, MenuDot, ToggleMark } from './FaqMenu';
import { ZIGZAG_MOBILE } from './zigzag';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './FaqAccordion.module.css';

const twoDigits = (n) => String(n).padStart(2, '0');

// Mobile FAQ: tap a question to open its answer right under it (tap again to close).
export function FaqAccordion() {
  const [open, setOpen] = useState(1);
  const whatsapp = useWhatsAppContact();

  return (
    <>
      <FaqMenu
        data-reveal=""
        renderQuestion={(question) => {
          const isOpen = question.number === open;
          return (
            <div key={question.number} className={clsx(styles.item, isOpen && styles.itemOpen)}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? 0 : question.number)}
                aria-expanded={isOpen ? 'true' : 'false'}
                className={styles.question}
              >
                <MenuDot compact />
                <span className={styles.questionText}>{question.q}</span>
                <ToggleMark isOn={isOpen} iconSize={16} />
              </button>
              {isOpen && (
                <div className={clsx(styles.answer, motion.fadeIn)}>
                  <div className={styles.answerCard}>
                    <span className={styles.serving}>
                      <Icon name="cloche" size={15} color="var(--color-black)" />
                      Now serving · Question {twoDigits(question.number)}
                    </span>
                    <p className={styles.answerText}>{question.a}</p>
                  </div>
                  <svg
                    width="100%"
                    height="10"
                    viewBox={ZIGZAG_MOBILE.viewBox}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className={styles.zigzag}
                  >
                    <path d={ZIGZAG_MOBILE.d} fill="#FFFFFF" />
                  </svg>
                </div>
              )}
            </div>
          );
        }}
      />
      <ExternalLink href={whatsapp.href} className={styles.more} data-reveal="">
        <Icon name="whatsapp" size={19} color="var(--color-green)" />
        Still hungry for more? Message us on WhatsApp.
      </ExternalLink>
    </>
  );
}
