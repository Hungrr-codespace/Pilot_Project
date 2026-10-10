import { Fragment } from 'react';
import { BRAND, CAMPUS, LEGAL_LINKS, NAV_LINKS, ORDER_HOURS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import {
  BARCODE_DESKTOP,
  BARCODE_MOBILE,
  RECEIPT_EDGE_DESKTOP_BOTTOM,
  RECEIPT_EDGE_DESKTOP_TOP,
  RECEIPT_EDGE_MOBILE,
} from './shapes';
import styles from './Receipt.module.css';

const twoDigits = (n) => String(n).padStart(2, '0');

// The footer's site map, styled as a restaurant bill.
export function Receipt() {
  const { isMobile } = useLayout();
  const iconSize = isMobile ? 14 : 22;

  return (
    <div className={styles.receipt}>
      <ReceiptEdge position="top" />
      <div className={styles.paper}>
        <div className={styles.brand}>
          <Wordmark className={styles.logo} />
          <span className={styles.tagline}>{BRAND.tagline}</span>
        </div>
        <div className={styles.rule} />

        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.detailLabel}>
              <Icon
                name="mapMarkerOutline"
                size={iconSize}
                color="var(--color-black)"
                className={styles.detailIcon}
              />
              <span className={styles.label}>Delivering to</span>
            </span>
            <span className={styles.detailValue}>{CAMPUS} campus</span>
          </div>
          <div className={styles.detail}>
            <span className={styles.detailLabel}>
              <Icon name="clock" size={iconSize} color="var(--color-black)" className={styles.detailIcon} />
              <span className={styles.label}>Orders open</span>
            </span>
            <span className={styles.detailValue}>{ORDER_HOURS}</span>
          </div>
        </div>
        <div className={styles.rule} />

        <div className={styles.explore}>
          <div className={styles.exploreHead}>
            <span className={styles.label}>Explore</span>
            <span className={styles.label}>Tap to visit</span>
          </div>
          <div className={styles.links}>
            {NAV_LINKS.map((link, i) => (
              <a key={link.href} href={link.href} className={styles.link}>
                <span className={styles.linkNumber}>{twoDigits(i + 1)}</span>
                <span className={styles.linkLabel}>{link.label}</span>
                <span className={styles.leader} />
                <span className={styles.linkArrow}>
                  <Icon name="arrowRight" size={isMobile ? 15 : 20} color="var(--color-black)" />
                </span>
              </a>
            ))}
          </div>
        </div>
        <div className={styles.doubleRule} />

        <div className={styles.thanks}>
          <span className={styles.thanksText}>Thank you! Visit again.</span>
          <Barcode />
        </div>

        <div className={styles.finePrint}>
          <span className={styles.label}>The fine print</span>
          <div className={styles.legalLinks}>
            {LEGAL_LINKS.map((link, i) => (
              <Fragment key={link.href}>
                {i > 0 && !isMobile && <span className={styles.separator}>·</span>}
                <a href={link.href} className={styles.legalLink}>
                  {link.label}
                </a>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      <ReceiptEdge position="bottom" />
      <PilotStamp />
    </div>
  );
}

function ReceiptEdge({ position }) {
  const { isMobile } = useLayout();
  if (isMobile) {
    return (
      <svg
        width="100%"
        height="10"
        viewBox={RECEIPT_EDGE_MOBILE.viewBox}
        preserveAspectRatio="none"
        aria-hidden="true"
        className={position === 'bottom' ? styles.edgeFlipped : styles.edge}
      >
        <path d={RECEIPT_EDGE_MOBILE.d} fill="#FFFFFF" />
      </svg>
    );
  }
  const shape = position === 'top' ? RECEIPT_EDGE_DESKTOP_TOP : RECEIPT_EDGE_DESKTOP_BOTTOM;
  return (
    <svg width="600" height="14" viewBox={shape.viewBox} aria-hidden="true" className={styles.edge}>
      <path fill="#FFFFFF" d={shape.d} />
    </svg>
  );
}

function Barcode() {
  const { isMobile } = useLayout();
  if (isMobile) {
    return (
      <div className={styles.barcode} aria-hidden="true">
        {BARCODE_MOBILE.map((width, i) => (
          <span key={i} className={styles.bar} style={{ width }} />
        ))}
      </div>
    );
  }
  return (
    <svg width="180" height="44" viewBox="0 0 180 44" aria-hidden="true" className={styles.barcodeSvg}>
      {BARCODE_DESKTOP.map(([x, width]) => (
        <rect key={x} x={x} y="0" width={width} height="44" fill="#000000" />
      ))}
    </svg>
  );
}

// "HUNGRR PILOT" rubber stamp.
function PilotStamp() {
  return (
    <span aria-hidden="true" className={styles.stamp}>
      <span className={styles.stampInner}>
        <span className={styles.stampBrand}>HUNGRR</span>
        <span className={styles.stampWord}>PILOT</span>
      </span>
    </span>
  );
}
