import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { NSchema as n } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';

export interface UserResult {
  pubkey: string;
  metadata: NostrMetadata;
  npub: string;
}

/** Detect if a string is a hex pubkey (64 hex chars) */
function isHexPubkey(s: string): boolean {
  return /^[0-9a-f]{64}$/i.test(s.trim());
}

/** Detect and decode an npub or nostr:npub URI — returns hex pubkey or null */
function decodeNpub(s: string): string | null {
  const cleaned = s.trim().replace(/^nostr:/, '');
  if (cleaned.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(cleaned);
      if (decoded.type === 'npub') return decoded.data as string;
      if (decoded.type === 'nprofile') return decoded.data.pubkey;
    } catch { /* invalid */ }
  }
  return null;
}

export function useSearchUsers(query: string) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['search-users', query, config.relayMetadata.updatedAt],
    queryFn: async (): Promise<UserResult[]> => {
      const q = query.trim();
      if (!q) return [];

      const relayUrls = config.relayMetadata.relays.filter(r => r.read).map(r => r.url);
      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      let pubkeys: string[] = [];
      let events = [];

      // 1. Direct npub or nostr:npub lookup
      const fromNpub = decodeNpub(q);
      if (fromNpub) {
        pubkeys = [fromNpub];
      } else if (isHexPubkey(q)) {
        // 2. Raw hex pubkey
        pubkeys = [q.toLowerCase()];
      }

      if (pubkeys.length > 0) {
        // Exact author lookup
        events = await relayGroup.query(
          [{ kinds: [0], authors: pubkeys, limit: 1 }],
          { signal: AbortSignal.timeout(3000) }
        );
      } else {
        // 3. NIP-50 search for name/nip05 matches
        events = await relayGroup.query(
          [{ kinds: [0], search: q, limit: 20 }],
          { signal: AbortSignal.timeout(3000) }
        );

        // Fallback: some relays don't support NIP-50 search, so also pull
        // recently-seen profiles and filter client-side
        if (events.length === 0) {
          const recent = await relayGroup.query(
            [{ kinds: [0], limit: 300 }],
            { signal: AbortSignal.timeout(3000) }
          );
          const qLow = q.toLowerCase();
          events = recent.filter(e => {
            try {
              const meta = JSON.parse(e.content) as NostrMetadata;
              return (
                meta.name?.toLowerCase().includes(qLow) ||
                meta.display_name?.toLowerCase().includes(qLow) ||
                meta.nip05?.toLowerCase().includes(qLow)
              );
            } catch { return false; }
          });
        }
      }

      // Parse and deduplicate by pubkey
      const seen = new Set<string>();
      const results: UserResult[] = [];

      for (const event of events) {
        if (seen.has(event.pubkey)) continue;
        seen.add(event.pubkey);
        try {
          const metadata = n.json().pipe(n.metadata()).parse(event.content);
          results.push({
            pubkey: event.pubkey,
            metadata,
            npub: nip19.npubEncode(event.pubkey),
          });
        } catch { /* skip malformed */ }
      }

      return results;
    },
    enabled: query.trim().length > 1,
    staleTime: 1000 * 60 * 2,
  });
}
