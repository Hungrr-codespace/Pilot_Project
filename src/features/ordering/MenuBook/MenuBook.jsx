import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { BookCover } from './BookCover';
import { BookLeaf } from './BookLeaf';
import { BookPage } from './BookPage';
import { IntroPage } from './IntroPage';
import { RestaurantIndex } from './RestaurantIndex';
import { RestaurantDetails } from './RestaurantDetails';
import { DishMenu } from './DishMenu';
import styles from './MenuBook.module.css';

// The menu as a book that opens and turns its pages.
//
// Desktop, a two-page spread (pages numbered as printed):
//   cover   front: the black cover          back: 1 · how clusters work
//   leaf    front: 2 · restaurant list       back: 3 · the open restaurant
//   base    4 · its dishes
// Opening the book swings the cover over to the left; picking a restaurant turns the leaf.
//
// Mobile, one page at a time: the cover, then the restaurant list, which turns to show the dishes.
export function MenuBook() {
  const { isMobile } = useLayout();
  const { state, actions } = useOrder();
  const { isOpen, coverBehind, page } = state.book;
  const coverStyle = { zIndex: coverBehind ? 1 : 3 };

  if (isMobile) {
    return (
      <div className={styles.book}>
        <div className={styles.base}>
          <BookPage>
            <DishMenu />
          </BookPage>
        </div>
        <BookLeaf
          isTurned={page === 'restaurant'}
          className={styles.leaf}
          front={
            <BookPage>
              <RestaurantIndex />
            </BookPage>
          }
        />
        <BookLeaf
          isTurned={isOpen}
          className={styles.cover}
          style={coverStyle}
          front={<BookCover onOpen={actions.openBook} />}
        />
      </div>
    );
  }

  return (
    <div className={clsx(styles.book, isOpen && styles.open)}>
      <div className={styles.base}>
        <BookPage number={4}>
          <DishMenu />
        </BookPage>
      </div>
      <BookLeaf
        isTurned={page === 'restaurant'}
        className={styles.leaf}
        front={
          <BookPage number={2}>
            <RestaurantIndex />
          </BookPage>
        }
        back={
          <BookPage side="left" number={3}>
            <RestaurantDetails />
          </BookPage>
        }
      />
      <BookLeaf
        isTurned={isOpen}
        className={styles.cover}
        style={coverStyle}
        front={<BookCover onOpen={actions.openBook} />}
        back={
          <BookPage side="left" number={1}>
            <IntroPage />
          </BookPage>
        }
      />
    </div>
  );
}
