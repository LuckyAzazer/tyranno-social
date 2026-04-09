/**
 * useProfileBadges — NIP-58 badge fetcher
 *
 * Fetches the badges a user has chosen to display on their profile:
 *
 * Strategy (three-pronged so we catch all relay/client variations):
 *
 * A. Profile Badges list (preferred display order):
 *    - kind 10008  (current NIP-58 spec)
 *    - kind 30008 d=profile_badges  (deprecated but still widely used)
 *    Each contains ordered [a, e] tag pairs → Badge Definition + Award.
 *
 * B. Badge Award fallback (kind 8 '#p' the user):
 *    If no profile-badges list is found, or as a supplement, look for
 *    kind 8 events that tag this pubkey — these are direct badge awards.
 *    Pull the 'a' tag from each award to get the definition coordinate.
 *
 * In both paths we batch-fetch the kind 30009 Badge Definition events
 * for name / image / thumb data.
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

export interface BadgeDefinition {
  event: NostrEvent;
  awardId: string;
  name: string;
  description: string;
  image: string;
  thumb: string;
  issuerPubkey: string;
  dTag: string;
}

/** Parse "30009:<issuer>:<dTag>" → { issuerPubkey, dTag } or null */
function parseACoord(coord: string): { issuerPubkey: string; dTag: string } | null {
  const parts = coord.split(':');
  if (parts.length < 3 || parts[0] !== '30009') return null;
  const issuerPubkey = parts[1];
  const dTag = parts.slice(2).join(':');
  if (!issuerPubkey || !dTag) return null;
  return { issuerPubkey, dTag };
}

export function useProfileBadges(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['profile-badges', pubkey, config.relayMetadata.updatedAt],
    queryFn: async (): Promise<BadgeDefinition[]> => {
      if (!pubkey) return [];

      const relayUrls = config.relayMetadata.relays
        .filter((r) => r.read)
        .map((r) => r.url);
      const pool = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      // ── Step 1: fetch Profile Badges list AND direct Badge Awards in parallel ──
      const [profileBadgeEvents, awardEvents] = await Promise.all([
        // Both current (10008) and deprecated (30008 d=profile_badges) formats
        pool.query([
          { kinds: [10008], authors: [pubkey], limit: 5 },
          { kinds: [30008], authors: [pubkey], '#d': ['profile_badges'], limit: 5 },
        ], { signal: AbortSignal.timeout(8000) }),
        // Direct badge awards where this pubkey is a recipient
        pool.query([
          { kinds: [8], '#p': [pubkey], limit: 100 },
        ], { signal: AbortSignal.timeout(8000) }),
      ]);

      // ── Step 2: extract [aCoord, awardId] pairs from profile-badges lists ────
      // Pick the most recent profile-badges event (could be 10008 or 30008)
      const profileBadge = profileBadgeEvents.sort((a, b) => b.created_at - a.created_at)[0];

      const orderedPairs: Array<{ aCoord: string; awardId: string }> = [];

      if (profileBadge) {
        let pendingA: string | null = null;
        for (const tag of profileBadge.tags) {
          if (tag[0] === 'a' && tag[1]?.startsWith('30009:')) {
            pendingA = tag[1];
          } else if (tag[0] === 'e' && pendingA) {
            orderedPairs.push({ aCoord: pendingA, awardId: tag[1] });
            pendingA = null;
          }
        }
        // Also handle lone 'a' tags (no matching 'e') — some clients omit 'e'
        if (pendingA) {
          orderedPairs.push({ aCoord: pendingA, awardId: '' });
        }
      }

      // ── Step 3: supplement / fallback with direct award events ───────────────
      // Build a set of aCoords we already have from the profile-badges list
      const knownCoords = new Set(orderedPairs.map((p) => p.aCoord));

      for (const award of awardEvents) {
        const aTag = award.tags.find(([n]) => n === 'a')?.[1];
        if (!aTag || !aTag.startsWith('30009:')) continue;
        // Only add if not already listed (respect the user's chosen display order)
        if (!knownCoords.has(aTag)) {
          orderedPairs.push({ aCoord: aTag, awardId: award.id });
          knownCoords.add(aTag);
        }
      }

      if (orderedPairs.length === 0) return [];

      // ── Step 4: batch-fetch all badge definitions ─────────────────────────────
      const parsedCoords = orderedPairs
        .map(({ aCoord, awardId }) => {
          const parsed = parseACoord(aCoord);
          if (!parsed) return null;
          return { ...parsed, awardId };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      if (parsedCoords.length === 0) return [];

      // One filter per unique issuer
      const issuerMap = new Map<string, string[]>();
      for (const { issuerPubkey, dTag } of parsedCoords) {
        issuerMap.set(issuerPubkey, [...(issuerMap.get(issuerPubkey) ?? []), dTag]);
      }

      const defFilters = Array.from(issuerMap.entries()).map(([issuer, dTags]) => ({
        kinds: [30009],
        authors: [issuer],
        '#d': dTags,
      }));

      const defEvents = await pool.query(defFilters, { signal: AbortSignal.timeout(8000) });

      // Index by "issuerPubkey:dTag"
      const defMap = new Map<string, NostrEvent>();
      for (const ev of defEvents) {
        const dTag = ev.tags.find(([n]) => n === 'd')?.[1];
        if (dTag) defMap.set(`${ev.pubkey}:${dTag}`, ev);
      }

      // ── Step 5: assemble results in display order ─────────────────────────────
      const seen = new Set<string>();
      const results: BadgeDefinition[] = [];

      for (const { awardId, issuerPubkey, dTag } of parsedCoords) {
        const key = `${issuerPubkey}:${dTag}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const def = defMap.get(key);
        if (!def) continue;

        const name = def.tags.find(([n]) => n === 'name')?.[1] ?? dTag;
        const description = def.tags.find(([n]) => n === 'description')?.[1] ?? '';
        const image = def.tags.find(([n]) => n === 'image')?.[1] ?? '';
        // Prefer smallest thumb; fall back to image
        const thumbs = def.tags.filter(([n]) => n === 'thumb').map(([, u]) => u).filter(Boolean);
        const thumb = thumbs[thumbs.length - 1] ?? image;

        results.push({ event: def, awardId, name, description, image, thumb, issuerPubkey, dTag });
      }

      return results;
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 5,   // 5 min — refresh more eagerly
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,                    // retry on relay timeouts
  });
}
