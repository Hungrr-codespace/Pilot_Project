import { useEffect, useState } from 'react';
import { fetchReviews } from '@/services/sheetApi';
import { readSummary } from '@/lib/reviews';

// The ratings summary and the approved reviews from the sheet. Fetched once per visit and shared.
//   { loading, summary: { count, average, stars, topTags }, reviews: [...] }
let cached = null;

export function useReviews() {
  const [data, setData] = useState(
    () => cached || { loading: true, summary: readSummary(null), reviews: [] },
  );
  useEffect(() => {
    if (cached) return undefined;
    let active = true;
    fetchReviews().then((fresh) => {
      const next = { loading: false, summary: readSummary(fresh?.summary), reviews: fresh?.reviews || [] };
      if (fresh) cached = next;
      if (active) setData(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return data;
}

// After a customer sends a review, the next visit to the main page asks the sheet again.
export function forgetReviews() {
  cached = null;
}
