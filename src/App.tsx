// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense, useEffect } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { NostrSync } from '@/components/NostrSync';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { DMProvider } from '@/components/DMProvider';
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

const CACHE_KEY = 'tyrannosocial-query-cache';
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

    // Restore each query into the cache
    const cache = client.getQueryCache();
    for (const entry of parsed.queries) {
      try {
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
      .filter((q) => q.state.status === 'success')
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

// Persist to localStorage whenever the cache updates (debounced 1 s)
let persistTimer: ReturnType<typeof setTimeout> | null = null;
queryClient.getQueryCache().subscribe(() => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => persistQueryCache(queryClient), 1000);
});

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

const defaultConfig: AppConfig = {
  theme: "dark",
  relayMetadata: {
    relays: [
      { url: 'wss://relay.ditto.pub', read: true, write: true },
      { url: 'wss://relay.primal.net', read: true, write: true },
      { url: 'wss://relay.damus.io', read: true, write: true },
      { url: 'wss://nos.lol', read: true, write: true },
      { url: 'wss://relay.nostr.band', read: true, write: true },
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
                <DMProvider config={{ enabled: true, protocolMode: PROTOCOL_MODE.NIP04_OR_NIP17 }}>
                  <TooltipProvider>
                    <Toaster />
                    <Suspense>
                      <AppRouter />
                    </Suspense>
                  </TooltipProvider>
                </DMProvider>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
