import { useState } from 'react';
import { timeAgo } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import a from './admin.module.css';

// "Updated just now · Refresh" for a panel that reloads from the sheet.
export function RefreshButton({ at, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    await onRefresh();
    setBusy(false);
  };
  return (
    <span className={a.updated}>
      {at > 0 && <span>Updated {timeAgo(new Date(at))}</span>}
      <button
        type="button"
        onClick={run}
        aria-busy={busy || undefined}
        className={`${a.button} ${a.small} btn-light`}
      >
        {busy ? (
          <Spinner size={16} color="var(--color-black)" />
        ) : (
          <Icon name="refresh" size={16} color="var(--color-black)" />
        )}
        {busy ? 'Refreshing…' : 'Refresh'}
      </button>
    </span>
  );
}
