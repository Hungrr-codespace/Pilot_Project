import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { LegalText } from './LegalText';
import styles from './LegalDocument.module.css';

const twoDigits = (n) => String(n).padStart(2, '0');

// The text of a policy: "In short" first, then its numbered sections.
export function LegalDocument({ doc }) {
  return (
    <article className={styles.paper}>
      <InShort points={doc.summary} />
      {doc.sections.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          className={styles.section}
          aria-labelledby={`${section.id}-title`}
        >
          <h2 id={`${section.id}-title`} className={styles.heading}>
            <span className={styles.number}>{twoDigits(i + 1)}</span>
            {section.title}
          </h2>
          {section.blocks.map((block, j) => (
            <Block key={j} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}

function InShort({ points }) {
  const { isMobile } = useLayout();
  return (
    <div className={styles.inShort}>
      <span className={styles.inShortLabel}>In short</span>
      <ul className={styles.inShortList}>
        {points.map((point) => (
          <li key={point} className={styles.inShortItem}>
            <span className={styles.tick}>
              <Icon name="check" size={isMobile ? 14 : 16} color="var(--color-black)" />
            </span>
            <span>
              <LegalText text={point} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// A paragraph (string), a bulleted list ({ list }) or the contact details ({ details }).
function Block({ block }) {
  if (typeof block === 'string') {
    return (
      <p className={styles.paragraph}>
        <LegalText text={block} />
      </p>
    );
  }
  if (block.list) {
    return (
      <ul className={styles.list}>
        {block.list.map((item) => (
          <li key={item} className={styles.item}>
            <LegalText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.details) {
    return (
      <dl className={styles.details}>
        {block.details.map((row) => (
          <div key={row.label} className={styles.detail}>
            <dt className={styles.detailLabel}>{row.label}</dt>
            <dd className={styles.detailValue}>
              <LegalText text={row.value} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}
