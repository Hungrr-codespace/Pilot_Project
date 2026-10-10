import styles from './OrderSteps.module.css';

// Numbered steps joined by a yellow line.
export function OrderSteps({ steps }) {
  return (
    <ol className={styles.steps}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li
            key={step.title}
            className={styles.step}
            data-reveal=""
            style={{ '--reveal-delay': `${i * 90}ms` }}
          >
            <div className={styles.rail}>
              <span className={styles.number}>{i + 1}</span>
              {!isLast && <span aria-hidden="true" className={styles.line} />}
            </div>
            <div className={styles.text}>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.description}>{step.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
