import { useState } from 'react';
import clsx from 'clsx';
import { FAQ_QUESTIONS } from '@/content/faq';
import { useShopStatus } from '@/context/shopStatus';
import { Icon } from '@/components/ui/Icon/Icon';
import { FaqMenu, MenuDot, ToggleMark } from './FaqMenu';
import { ZIGZAG_DESKTOP } from './zigzag';
import styles from './FaqBoard.module.css';

const twoDigits = (n) => String(n).padStart(2, '0');

// Desktop FAQ: the question picked on the menu is served on the card next to it.
export function FaqBoard() {
  const [selected, setSelected] = useState(1);
  const current = FAQ_QUESTIONS.find((q) => q.number === selected);
  const { hours } = useShopStatus();

  return (
    <div className={styles.board} data-reveal="">
      <FaqMenu
        renderQuestion={(question) => {
          const isOn = question.number === selected;
          return (
            <button
              key={question.number}
              type="button"
              onClick={() => setSelected(question.number)}
              aria-pressed={isOn}
              className={clsx(styles.question, isOn ? styles.questionOn : 'btn-row-dark')}
            >
              <MenuDot />
              <span className={styles.questionText}>{question.q}</span>
              <span className={styles.leader} />
              <ToggleMark isOn={isOn} iconSize={20} />
            </button>
          );
        }}
      />

      <div className={styles.plate}>
        <div className={styles.plateHead}>
          <span className={styles.serving}>
            <Icon name="cutlery" size={24} color="var(--color-black)" />
            Now serving
          </span>
          <span className={styles.questionNumber}>Question {twoDigits(selected)}</span>
        </div>
        <div className={styles.plateBody}>
          <div className={styles.answer}>
            <span className={styles.cloche}>
              <Icon name="cloche" size={44} color="var(--color-black)" />
            </span>
            <h3 className={styles.answerTitle}>{current.q}</h3>
            <p className={styles.answerText}>{current.a.replace('{hours}', hours.sentence)}</p>
          </div>
          <div className={styles.more}>
            <div className={styles.divider} />
            <div className={styles.moreRow}>
              <Icon name="whatsapp" size={30} color="var(--color-green)" />
              <span className={styles.moreText}>Still hungry for more? Message us on WhatsApp.</span>
            </div>
          </div>
        </div>
        <svg
          width="592"
          height="14"
          viewBox={ZIGZAG_DESKTOP.viewBox}
          preserveAspectRatio="none"
          aria-hidden="true"
          className={styles.zigzag}
        >
          <path fill="#FFFFFF" d={ZIGZAG_DESKTOP.d} />
        </svg>
      </div>
    </div>
  );
}
