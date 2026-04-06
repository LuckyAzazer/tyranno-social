/**
 * usePublicFollowLists — discover public kind-30000 follow-set lists by keyword.
 *
 * Why specialist relays?
 * ──────────────────────
 * General-purpose relays (damus, primal, ditto…) only hold events from the
 * people you follow — they are NOT global indexes.  To find *any* user's
 * follow-list you need relays that index ALL kind-30000 events globally:
 *
 *   • wss://relay.nostr.band  — supports NIP-50 full-text search (search: "gaming")
 *   • wss://purplepag.es      — dedicated follow-list relay, huge kind-30000 index
 *   • wss://nos.lol           — broad open relay with good kind-30000 coverage
 *
 * Strategy (three parallel passes against specialist relays):
 *
 *  Pass A  NIP-50 search on nostr.band:
 *    { kinds: [30000], search: keyword, limit: 100 }
 *
 *  Pass B  Structural #t / #d filters on all three specialist relays:
 *    { kinds: [30000], '#t': [kw], limit: 100 }
 *    { kinds: [30000], '#d': slugVariants(kw), limit: 100 }
 *
 *  Pass C  Broad sweep on purplepag.es + client-side relevance filter:
 *    { kinds: [30000], limit: 500 }
 *
 * All passes are also sent to any user-configured read relays so personal
 * relays can contribute too.  Results are deduped, require ≥1 member, and
 * sorted by member-count descending.
 *
 * Each pass has a 10 s timeout; individual relay errors are silenced.
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

export interface PublicFollowList {
  event: NostrEvent;
  dTag: string;
  title: string;
  description: string;
  authorPubkey: string;
  pubkeys: string[];
  /** "30000:pubkey:dTag" coordinate */
  naddr: string;
}

function buildNaddr(pubkey: string, dTag: string): string {
  return `30000:${pubkey}:${dTag}`;
}

/** Specialist relays that index kind-30000 globally */
const SEARCH_RELAY  = 'wss://relay.nostr.band';   // NIP-50 search
const LIST_RELAY    = 'wss://purplepag.es';         // dedicated follow-list relay
const BROAD_RELAY   = 'wss://nos.lol';              // broad open relay

/** Common d-tag slug patterns for a given keyword */
function slugVariants(kw: string): string[] {
  return [
    kw,
    `${kw}-list`,
    `${kw}s`,
    `${kw}s-list`,
    `list-${kw}`,
    `my-${kw}`,
    `${kw}-people`,
    `${kw}-follows`,
    `follow-${kw}`,
    `the-${kw}`,
    `best-${kw}`,
    `top-${kw}`,
  ];
}

/** Race a promise against a timeout; returns fallback on timeout */
async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function isRelevant(e: NostrEvent, kw: string): boolean {
  const title = (e.tags.find(([t]) => t === 'title')?.[1]       ?? '').toLowerCase();
  const dTag  = (e.tags.find(([t]) => t === 'd')?.[1]           ?? '').toLowerCase();
  const desc  = (e.tags.find(([t]) => t === 'description')?.[1] ?? '').toLowerCase();
  const name  = (e.tags.find(([t]) => t === 'name')?.[1]        ?? '').toLowerCase();
  const tTags = e.tags.filter(([t]) => t === 't').map(([, v]) => v.toLowerCase());

  return (
    title.includes(kw) ||
    dTag.includes(kw)  ||
    desc.includes(kw)  ||
    name.includes(kw)  ||
    tTags.some((t) => t === kw || t.includes(kw))
  );
}

function mapToFollowList(e: NostrEvent): PublicFollowList {
  const dTag    = e.tags.find(([t]) => t === 'd')?.[1] ?? e.id;
  const pubkeys = e.tags.filter(([t]) => t === 'p').map(([, pk]) => pk);
  return {
    event: e,
    dTag,
    title:        e.tags.find(([t]) => t === 'title')?.[1]       ?? dTag,
    description:  e.tags.find(([t]) => t === 'description')?.[1] ?? '',
    authorPubkey: e.pubkey,
    pubkeys,
    naddr: buildNaddr(e.pubkey, dTag),
  };
}

export function usePublicFollowLists(keyword: string | null) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['public-follow-lists', keyword, config.relayMetadata.updatedAt],
    queryFn: async (): Promise<PublicFollowList[]> => {
      if (!keyword?.trim()) return [];

      const kw = keyword.trim().toLowerCase();
      const TIMEOUT = 10_000;

      // ── Build relay connections ────────────────────────────────────────────
      // Always query the three specialist relays regardless of user config.
      // Also include any user-configured read relays so personal relays contribute.
      const userReadRelays = config.relayMetadata.relays
        .filter((r) => r.read)
        .map((r) => r.url);

      const searchRelay = nostr.relay(SEARCH_RELAY);
      const listRelay   = nostr.relay(LIST_RELAY);
      const broadRelay  = nostr.relay(BROAD_RELAY);

      // Combine specialist + user relays for structural/broad queries
      const structuralRelayUrls = [
        LIST_RELAY,
        BROAD_RELAY,
        ...userReadRelays.filter((u) => u !== LIST_RELAY && u !== BROAD_RELAY),
      ];
      const structuralPool = nostr.group(structuralRelayUrls);

      // ── Pass A: NIP-50 full-text search on nostr.band ─────────────────────
      const passA = withTimeout(
        searchRelay.query([{ kinds: [30000], search: keyword, limit: 100 }]),
        TIMEOUT,
        [] as NostrEvent[],
      ).catch(() => [] as NostrEvent[]);

      // ── Pass B: Structural #t / #d filters on specialist + user relays ────
      const passB = withTimeout(
        structuralPool.query([
          { kinds: [30000], '#t': [kw], limit: 100 },
          { kinds: [30000], '#d': slugVariants(kw), limit: 100 },
        ]),
        TIMEOUT,
        [] as NostrEvent[],
      ).catch(() => [] as NostrEvent[]);

      // ── Pass C: Broad sweep on purplepag.es → client-side filter ──────────
      const passC = withTimeout(
        listRelay.query([{ kinds: [30000], limit: 500 }]),
        TIMEOUT,
        [] as NostrEvent[],
      )
        .catch(() => [] as NostrEvent[])
        .then((events) => events.filter((e) => isRelevant(e, kw)));

      const [rA, rB, rC] = await Promise.all([passA, passB, passC]);

      // ── Deduplicate across all passes ─────────────────────────────────────
      const seen   = new Set<string>();
      const unique: NostrEvent[] = [];
      for (const e of [...rA, ...rB, ...rC]) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          unique.push(e);
        }
      }

      // ── Map, filter (≥1 member), sort by member count ─────────────────────
      return unique
        .map(mapToFollowList)
        .filter((l) => l.pubkeys.length >= 1)
        .sort((a, b) => b.pubkeys.length - a.pubkeys.length)
        .slice(0, 30);
    },
    enabled: !!keyword?.trim(),
    staleTime: 1000 * 60 * 3,
    gcTime:    1000 * 60 * 30,
    retry: 1,
  });
}
