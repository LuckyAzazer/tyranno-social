import { type NostrEvent, type NostrFilter } from '@nostrify/nostrify';

/** Minimal structural type for the parts of the Nostr pool we use here. */
interface QueryableRelay {
  query(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<NostrEvent[]>;
}
interface NostrPoolLike extends QueryableRelay {
  group(relays: string[]): QueryableRelay;
}

/**
 * Batches events that reference other events via an `#e` tag.
 *
 * Reactions (kind 7) and replies (kind 1) are both fetched per-post with
 * `{ kinds:[k], '#e':[eventId] }`. On a feed that's one subscription per
 * visible post, per kind. This batcher collects many event IDs over a short
 * window and resolves them all with a single
 * `{ kinds:[k], '#e':[...manyIds] }` query, then distributes the results back
 * to each requester by inspecting each returned event's `e` tags.
 *
 * Same idea as the AuthorBatcher — one query instead of N.
 */

const BATCH_WINDOW_MS = 80;   // collect requests for this long before flushing
const MAX_BATCH = 100;        // cap IDs per query so relays stay happy

interface Pending {
  resolve: (events: NostrEvent[]) => void;
  reject: (err: unknown) => void;
}

export class EventTagBatcher {
  private nostr: NostrPoolLike;
  private relayUrls: string[];
  private kind: number;
  private perEventLimit: number;
  private queue = new Map<string, Pending[]>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(nostr: NostrPoolLike, relayUrls: string[], kind: number, perEventLimit: number) {
    this.nostr = nostr;
    this.relayUrls = relayUrls;
    this.kind = kind;
    this.perEventLimit = perEventLimit;
  }

  /** Request all `kind` events referencing `eventId` via an `#e` tag. */
  fetch(eventId: string): Promise<NostrEvent[]> {
    return new Promise<NostrEvent[]>((resolve, reject) => {
      const existing = this.queue.get(eventId);
      if (existing) {
        existing.push({ resolve, reject });
      } else {
        this.queue.set(eventId, [{ resolve, reject }]);
      }

      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), BATCH_WINDOW_MS);
      }

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

    const batch = this.queue;
    this.queue = new Map<string, Pending[]>();

    const ids = [...batch.keys()];

    try {
      const relayGroup = this.relayUrls.length > 0
        ? this.nostr.group(this.relayUrls)
        : this.nostr;

      const events = await relayGroup.query(
        [{
          kinds: [this.kind],
          '#e': ids,
          // Scale the limit with the number of referenced events so a large
          // batch doesn't starve individual posts of their reactions/replies.
          limit: Math.min(ids.length * this.perEventLimit, 2000),
        }],
        { signal: AbortSignal.timeout(4000) },
      );

      // Group the returned events by each referenced event ID. A single
      // reaction/reply can reference multiple events, so push to every match.
      const byTarget = new Map<string, NostrEvent[]>();
      for (const id of ids) byTarget.set(id, []);

      for (const event of events) {
        for (const tag of event.tags) {
          if (tag[0] === 'e' && byTarget.has(tag[1])) {
            byTarget.get(tag[1])!.push(event);
          }
        }
      }

      for (const [id, waiters] of batch) {
        const result = byTarget.get(id) ?? [];
        for (const w of waiters) w.resolve(result);
      }
    } catch (err) {
      for (const waiters of batch.values()) {
        for (const w of waiters) w.reject(err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton management — one batcher per (kind, relay-set) combination.
// ---------------------------------------------------------------------------

const batchers = new Map<string, EventTagBatcher>();

export function getEventTagBatcher(
  nostr: NostrPoolLike,
  relayUrls: string[],
  kind: number,
  perEventLimit: number,
): EventTagBatcher {
  const key = `${kind}:${relayUrls.slice().sort().join(',')}`;
  let batcher = batchers.get(key);
  if (!batcher) {
    batcher = new EventTagBatcher(nostr, relayUrls, kind, perEventLimit);
    batchers.set(key, batcher);
    // Keep the map from growing unbounded if the relay set changes often.
    if (batchers.size > 8) {
      const firstKey = batchers.keys().next().value;
      if (firstKey && firstKey !== key) batchers.delete(firstKey);
    }
  }
  return batcher;
}
