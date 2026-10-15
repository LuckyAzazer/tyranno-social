// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import React, { Suspense, useEffect, useState } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { NostrSync } from '@/components/NostrSync';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { DMProvider } from '@/components/DMProvider';
import { WebRTCCallProvider } from '@/contexts/WebRTCCallContext';
import { AppConfig } from '@/contexts/AppContext';
import { PROTOCOL_MODE } from '@/lib/dmConstants';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

// ---------------------------------------------------------------------------
// Query-cache persistence
// ---------------------------------------------------------------------------
// We hand-roll a lightweight persister instead of using the @tanstack persist
// packages, which have a version incompatibility with the query-core in this
// environment.  The logic is the same: serialise the in-memory cache to
// localStorage on every update and hydrate it back on startup.
// ---------------------------------------------------------------------------

const CACHE_KEY = 'tyrannosocial-query-cache-v2'; // v2: infinite queries excluded
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const CACHE_MAX_BYTES = 4 * 1024 * 1024; // 4 MB guard (localStorage limit is ~5 MB)

/** Read a previously persisted cache and restore it into the QueryClient. */
function hydrateQueryCache(client: QueryClient) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      timestamp: number;
      queries: Array<{ queryKey: unknown; queryHash: string; state: unknown }>;
    };

    // Discard if older than TTL
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    // Restore each query into the cache, skipping any infinite-query entries
    // that may have been persisted by an older version of the app.
    const cache = client.getQueryCache();
    for (const entry of parsed.queries) {
      try {
        const state = entry.state as { data?: { pages?: unknown } };
        // Skip infinite query blobs — they don't hydrate correctly
        if (state?.data && typeof state.data === 'object' && 'pages' in state.data) continue;

        const query = cache.build(client, { queryKey: entry.queryKey as Parameters<typeof cache.build>[1]['queryKey'] });
        query.setState(entry.state as Parameters<typeof query.setState>[0]);
      } catch {
        // Skip malformed entries
      }
    }
  } catch {
    // Corrupted storage — start fresh
    localStorage.removeItem(CACHE_KEY);
  }
}

/** Serialise the current QueryClient cache to localStorage. */
function persistQueryCache(client: QueryClient) {
  try {
    const queries = client
      .getQueryCache()
      .getAll()
      // Only persist regular (non-infinite) queries.
      // Infinite query state (pages/pageParams) doesn't round-trip cleanly
      // through JSON serialisation and causes feeds to appear empty on
      // restore. Fast-loading metadata like follows and author profiles is
      // what actually benefits from persistence.
      .filter((q) => {
        if (q.state.status !== 'success') return false;
        // Infinite queries store their data as { pages, pageParams }
        const data = q.state.data as { pages?: unknown } | undefined;
        if (data && typeof data === 'object' && 'pages' in data) return false;
        return true;
      })
      .map((q) => ({
        queryKey: q.queryKey,
        queryHash: q.queryHash,
        state: q.state,
      }));

    const payload = JSON.stringify({ timestamp: Date.now(), queries });

    // Skip write if payload exceeds size guard
    if (payload.length > CACHE_MAX_BYTES) return;

    localStorage.setItem(CACHE_KEY, payload);
  } catch {
    // Quota exceeded or serialisation error — skip silently
  }
}

// ---------------------------------------------------------------------------
// QueryClient
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Show cached data immediately; revalidate in the background after 5 min
      staleTime: 1000 * 60 * 5,
      // Keep unused cache entries for 24 h so navigating back is instant
      gcTime: CACHE_TTL,
    },
  },
});

// Hydrate from localStorage before first render
hydrateQueryCache(queryClient);

// Persist the cache periodically rather than on every cache mutation.
// Serialising the whole cache is expensive, and on an active feed the cache
// changes many times per second — debouncing on every change still fired
// constant JSON.stringify work on the main thread. A gentle interval (plus a
// flush on unload, below) keeps persistence cheap without the UI jank.
//
// We also only write when the tab is idle (via requestIdleCallback when
// available) so serialisation never competes with scrolling/navigation.
const PERSIST_INTERVAL_MS = 15000;
type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void) => number;
};
const scheduleIdle = (cb: () => void) => {
  const ric = (window as IdleWindow).requestIdleCallback;
  if (ric) ric(cb);
  else setTimeout(cb, 0);
};
let cacheDirty = false;
queryClient.getQueryCache().subscribe(() => {
  cacheDirty = true;
});
setInterval(() => {
  if (!cacheDirty) return;
  cacheDirty = false;
  scheduleIdle(() => persistQueryCache(queryClient));
}, PERSIST_INTERVAL_MS);

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

const defaultConfig: AppConfig = {
  theme: "dark",
  relayMetadata: {
    // Every read query fans out to ALL read relays, so reading from fewer,
    // fast, well-connected aggregating relays keeps the feed snappy. We still
    // WRITE to all of them so posts propagate as widely as possible.
    relays: [
      { url: 'wss://relay.primal.net', read: true, write: true },
      { url: 'wss://relay.damus.io', read: true, write: true },
      { url: 'wss://relay.ditto.pub', read: true, write: true },
      { url: 'wss://nos.lol', read: false, write: true },
      { url: 'wss://relay.nostr.band', read: false, write: true },
    ],
    updatedAt: 0,
  },
  dmInboxRelays: {
    relays: [
      'wss://relay.ditto.pub',
      'wss://relay.primal.net',
      'wss://relay.damus.io',
    ],
    updatedAt: 0,
  },
  showContentWarnings: true,
};

/**
 * Mounts the DM + WebRTC-call machinery but defers their heavy startup work
 * (persistent relay subscriptions, DM history decryption, incoming-call
 * listener) until the browser is idle after first paint. The providers are
 * always mounted so their context stays available to consumers — only the
 * expensive background work is delayed, keeping initial load fast.
 */
function useDeferredReady(timeout = 2500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const win = window as IdleWindow;
    let idleHandle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mark = () => setReady(true);

    if (win.requestIdleCallback) {
      idleHandle = win.requestIdleCallback(mark, { timeout });
    } else {
      timer = setTimeout(mark, timeout);
    }
    return () => {
      if (idleHandle !== undefined && win.cancelIdleCallback) win.cancelIdleCallback(idleHandle);
      if (timer) clearTimeout(timer);
    };
  }, [ready, timeout]);

  return ready;
}

function DeferredRealtimeProviders({ children }: { children: React.ReactNode }) {
  const ready = useDeferredReady();

  return (
    <DMProvider config={{ enabled: ready, protocolMode: PROTOCOL_MODE.NIP04_OR_NIP17 }}>
      <WebRTCCallProvider enabled={ready}>
        {children}
      </WebRTCCallProvider>
    </DMProvider>
  );
}

export function App() {
  // Also persist when the user leaves / closes the tab
  useEffect(() => {
    const handleUnload = () => persistQueryCache(queryClient);
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <NostrSync />
              <NWCProvider>
                <DeferredRealtimeProviders>
                  <TooltipProvider>
                    <Toaster />
                    <Suspense>
                      <AppRouter />
                    </Suspense>
                  </TooltipProvider>
                </DeferredRealtimeProviders>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
