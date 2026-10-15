import { type NostrEvent, type NostrFilter, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';

export interface AuthorData {
  event?: NostrEvent;
  metadata?: NostrMetadata;
}

/** Minimal structural type for the parts of the Nostr pool we use here. */
interface QueryableRelay {
  query(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<NostrEvent[]>;
}
interface NostrPoolLike extends QueryableRelay {
  group(relays: string[]): QueryableRelay;
}

/**
 * Batches kind-0 (profile metadata) requests.
 *
 * Instead of every PostCard firing its own `{ kinds:[0], authors:[pubkey] }`
 * subscription (which on a 100-post feed means 100+ simultaneous relay
 * queries), we collect all requested pubkeys over a short window and resolve
 * them with a *single* `{ kinds:[0], authors:[...manyPubkeys] }` query.
 *
 * This is the same strategy used by high-performance Nostr clients like
 * Ditto, and is the single biggest win for feed responsiveness.
 */

const BATCH_WINDOW_MS = 80;      // collect requests for this long before flushing
const MAX_BATCH = 300;           // cap authors per query so filters stay reasonable

interface Pending {
  resolve: (data: AuthorData) => void;
  reject: (err: unknown) => void;
}

export function parseMetadata(event: NostrEvent): AuthorData {
  try {
    const metadata = n.json().pipe(n.metadata()).parse(event.content);
    return { metadata, event };
  } catch {
    return { event };
  }
}

export class AuthorBatcher {
  private nostr: NostrPoolLike;
  private relayUrls: string[];
  private queue = new Map<string, Pending[]>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(nostr: NostrPoolLike, relayUrls: string[]) {
    this.nostr = nostr;
    this.relayUrls = relayUrls;
  }

  /** Request a single author's profile. Resolves when the batch flushes. */
  fetch(pubkey: string): Promise<AuthorData> {
    return new Promise<AuthorData>((resolve, reject) => {
      const existing = this.queue.get(pubkey);
      if (existing) {
        existing.push({ resolve, reject });
      } else {
        this.queue.set(pubkey, [{ resolve, reject }]);
      }

      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), BATCH_WINDOW_MS);
      }

      // Flush immediately if we've hit the cap
      if (this.queue.size >= MAX_BATCH) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.flush();
      }
    });
  }

  private async flush() {
    this.timer = null;
    if (this.queue.size === 0) return;

    // Snapshot and clear the queue so new requests start a fresh batch.
    const batch = this.queue;
    this.queue = new Map<string, Pending[]>();

    const pubkeys = [...batch.keys()];

    try {
      const relayGroup = this.relayUrls.length > 0
        ? this.nostr.group(this.relayUrls)
        : this.nostr;

      const events = await relayGroup.query(
        [{ kinds: [0], authors: pubkeys, limit: pubkeys.length }],
        { signal: AbortSignal.timeout(3000) },
      );

      // Keep only the newest profile per pubkey.
      const latest = new Map<string, NostrEvent>();
      for (const event of events) {
        const prev = latest.get(event.pubkey);
        if (!prev || event.created_at > prev.created_at) {
          latest.set(event.pubkey, event);
        }
      }

      for (const [pubkey, waiters] of batch) {
        const event = latest.get(pubkey);
        const data: AuthorData = event ? parseMetadata(event) : {};
        for (const w of waiters) w.resolve(data);
      }
    } catch (err) {
      for (const waiters of batch.values()) {
        for (const w of waiters) w.reject(err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton management — one batcher per (pool, relay-set) combination.
// ---------------------------------------------------------------------------

let currentBatcher: AuthorBatcher | null = null;
let currentKey = '';

export function getAuthorBatcher(nostr: NostrPoolLike, relayUrls: string[]): AuthorBatcher {
  const key = relayUrls.slice().sort().join(',');
  if (!currentBatcher || currentKey !== key) {
    currentBatcher = new AuthorBatcher(nostr, relayUrls);
    currentKey = key;
  }
  return currentBatcher;
}
