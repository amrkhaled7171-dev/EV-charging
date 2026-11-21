'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher, POLL_MS } from './fetcher';
import type { ChargerSummary } from './types';

/** Polls GET /api/chargers every 3 s. On error SWR keeps the last known data. */
export function useChargers() {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const swr = useSWR<ChargerSummary[]>('/api/chargers', fetcher, {
    refreshInterval: POLL_MS,
    onSuccess: () => setLastRefresh(new Date()),
  });
  return { chargers: swr.data, error: swr.error as Error | undefined, lastRefresh };
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function timeAgo(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
