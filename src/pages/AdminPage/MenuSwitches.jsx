import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { menuBook } from '@/lib/staff';
import { useStaffData } from '@/features/staff/useStaff';
import { MenuService } from './MenuService';
import { MenuIndex } from './MenuIndex';
import { MenuPage } from './MenuPage';
import a from './admin.module.css';
import styles from './MenuSwitches.module.css';

// Menu & notice, laid out like the menu book on the pilot page.
//  - Left page: today's service (the pause switch and its message), the notice at the top of the site, and the
//    restaurants by cluster, each with its "open today" switch.
//  - Right page: the chosen restaurant's menu, each dish with its "in stock" switch where ADD would be.
// Phones show the service page, then the restaurants or one restaurant's menu. Each switch writes TRUE/FALSE into
// the sheet (Settings, Restaurants.active, Dishes.available); customers see the change within about a minute.
export function MenuSwitches({ call }) {
  const { isMobile } = useLayout();
  const menu = useStaffData(call, 'menu');
  const [query, setQuery] = useState('');
  const [chosenId, setChosenId] = useState('');
  const [phoneView, setPhoneView] = useState('index'); // phones: the restaurants, or one restaurant's menu
  const [pending, setPending] = useState({}); // 'dish:bt10' → the value being saved, shown straight away
  const [problem, setProblem] = useState('');
  const menuPageRef = useRef(null);

  const data = useMemo(() => withPending(menu.data, pending), [menu.data, pending]);
  const book = useMemo(() => menuBook(data || undefined, query), [data, query]);

  if (menu.phase === 'loading') return <div className={a.loading} />;
  if (menu.phase === 'failed')
    return <p className={a.problem}>The menu couldn&apos;t load. Refresh to try again.</p>;

  const chosen = book.restaurants.find((r) => r.id === chosenId) || book.restaurants[0] || null;
  const cluster = chosen && book.groups.find((g) => g.restaurants.includes(chosen))?.cluster;
  const closedCount = data.restaurants.filter((r) => !r.active).length;

  const flip = async (kind, id, on) => {
    const key = `${kind}:${id}`;
    setProblem('');
    setPending((p) => ({ ...p, [key]: on }));
    const res = await call('menu_set', { kind, id, on });
    if (!res.ok) setProblem("That switch didn't save. Check the connection and try again.");
    await menu.load({ quiet: true });
    setPending((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  };
  const isSaving = (kind, id) => `${kind}:${id}` in pending;

  const choose = (id) => {
    setChosenId(id);
    if (isMobile) {
      setPhoneView('menu');
      requestAnimationFrame(() => menuPageRef.current?.scrollIntoView({ block: 'start' }));
    }
  };

  const service = <MenuService data={data} call={call} reload={menu.load} />;
  const index = (
    <MenuIndex
      book={book}
      total={data.restaurants.length}
      closed={closedCount}
      query={query}
      onQuery={setQuery}
      chosenId={isMobile ? '' : chosen?.id}
      onChoose={choose}
      onFlip={flip}
      isSaving={isSaving}
    />
  );
  const page = chosen ? (
    <MenuPage
      restaurant={chosen}
      cluster={cluster}
      searching={query.trim() !== ''}
      onFlip={flip}
      isSaving={isSaving}
      onBack={isMobile ? () => setPhoneView('index') : undefined}
    />
  ) : (
    <p className={styles.blank}>
      {query.trim() ? 'Nothing on the menu matches your search.' : 'No restaurants in the sheet yet.'}
    </p>
  );

  return (
    <>
      {problem && (
        <p role="alert" className={`${a.problem} ${styles.problem}`}>
          {problem}
        </p>
      )}
      <div className={styles.book}>
        {isMobile ? (
          <>
            <Sheet side="left">{service}</Sheet>
            <Sheet side="right" sheetRef={menuPageRef}>
              {phoneView === 'menu' && chosen ? page : index}
            </Sheet>
          </>
        ) : (
          <>
            <Sheet side="left" number={1}>
              {service}
              {index}
            </Sheet>
            <Sheet side="right" number={2}>
              {page}
            </Sheet>
          </>
        )}
      </div>
    </>
  );
}

// A cream menu page with a printed double border, like BookPage on the pilot page but growing with its content.
function Sheet({ side, number, sheetRef, children }) {
  const { isMobile } = useLayout();
  return (
    <section ref={sheetRef} className={clsx(styles.page, styles[side])}>
      <div aria-hidden="true" className={styles.border} />
      {!isMobile && <div aria-hidden="true" className={styles.innerBorder} />}
      <div className={styles.content}>{children}</div>
      {!isMobile && number && <span className={styles.number}>— {number} —</span>}
    </section>
  );
}

// The menu with the switches still being saved already flipped
function withPending(data, pending) {
  if (!data || !Object.keys(pending).length) return data;
  const pick = (key, value) => (key in pending ? pending[key] : value);
  return {
    ...data,
    restaurants: data.restaurants.map((r) => ({ ...r, active: pick(`restaurant:${r.id}`, r.active) })),
    dishes: data.dishes.map((d) => ({ ...d, available: pick(`dish:${d.id}`, d.available) })),
  };
}
