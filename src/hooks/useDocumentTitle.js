import { useEffect } from 'react';

// Sets the browser tab title while a page is shown.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
