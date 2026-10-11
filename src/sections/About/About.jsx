import { ABOUT } from '@/content/about';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { Section } from '@/components/layout/Section/Section';
import { Highlight, SectionHeader } from '@/components/ui/SectionHeader/SectionHeader';
import styles from './About.module.css';

// What Hungrr is and what it strives to do: a mission card and three pillars.
export function About() {
  const { isMobile } = useLayout();
  const { intro, mission, pillars } = ABOUT;
  return (
    <Section id="about" className={styles.section}>
      <SectionHeader
        label="About Hungrr"
        title={
          <>
            Many kitchens,
            <br />
            <Highlight>one delivery.</Highlight>
          </>
        }
        intro={intro}
        introWidth={520}
      />
      <div className={styles.body}>
        <div className={styles.mission} data-reveal="">
          <svg aria-hidden="true" viewBox="0 0 600 120" preserveAspectRatio="none" className={styles.route}>
            <path d="M-10 114 C 140 118, 260 106, 360 82 S 540 30, 610 44" />
          </svg>
          <span className={styles.missionEyebrow}>{mission.eyebrow}</span>
          <p className={styles.missionText}>{mission.statement}</p>
          <span className={styles.missionNote}>
            <Icon name="mapMarker" size={isMobile ? 17 : 22} color="var(--color-black)" />
            {mission.note}
          </span>
        </div>
        <ul className={styles.pillars}>
          {pillars.map((pillar, i) => (
            <li
              key={pillar.title}
              className={styles.pillar}
              data-reveal=""
              style={{ '--reveal-delay': `${100 + i * 90}ms` }}
            >
              <span className={styles.pillarIcon}>
                <Icon name={pillar.icon} size={isMobile ? 21 : 28} color="var(--color-yellow)" />
              </span>
              <span className={styles.pillarCopy}>
                <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                <p className={styles.pillarText}>{pillar.text}</p>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
