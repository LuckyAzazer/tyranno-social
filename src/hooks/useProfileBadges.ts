/**
 * useProfileBadges — NIP-58 badge fetcher
 *
 * Fetches the badges a user has chosen to display on their profile:
 *   1. Query kind 10008 (Profile Badges) for the target pubkey.
 *   2. Parse the ordered [a, e] tag pairs — each pair references a
 *      Badge Definition (kind 30009) and a Badge Award (kind 8).
 *   3. Batch-fetch all referenced Badge Definitions in a single query.
 *   4. Return the definitions in display order alongside the award event ids.
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

export interface BadgeDefinition {
  /** The badge definition event */
  event: NostrEvent;
  /** Badge award event id (kind 8) */
  awardId: string;
  /** Parsed fields from the definition tags */
  name: string;
  description: string;
  image: string;
  thumb: string;
  /** The badge issuer pubkey + d-tag identifier */
  issuerPubkey: string;
  dTag: string;
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

      // ── Step 1: fetch the user's Profile Badges event (kind 10008) ──────────
      const profileBadgeEvents = await pool.query([
        { kinds: [10008], authors: [pubkey], limit: 1 },
      ]);

      if (profileBadgeEvents.length === 0) return [];

      const profileBadge = profileBadgeEvents[0];

      // ── Step 2: parse ordered [a, e] pairs ──────────────────────────────────
      // Tags look like:
      //   ["a", "30009:<issuerPubkey>:<dTag>"]
      //   ["e", "<awardEventId>"]
      // We collect them in order, pairing each "a" with the following "e".
      const pairs: Array<{ aCoord: string; awardId: string }> = [];
      let pendingA: string | null = null;

      for (const tag of profileBadge.tags) {
        if (tag[0] === 'a' && tag[1]?.startsWith('30009:')) {
          pendingA = tag[1];
        } else if (tag[0] === 'e' && pendingA) {
          pairs.push({ aCoord: pendingA, awardId: tag[1] });
          pendingA = null;
        }
      }

      if (pairs.length === 0) return [];

      // ── Step 3: batch-fetch all badge definitions in one query ──────────────
      // Each aCoord is "30009:<issuerPubkey>:<dTag>"
      const parsedCoords = pairs.map(({ aCoord, awardId }) => {
        const parts = aCoord.split(':');
        // parts = ["30009", "<issuerPubkey>", "<dTag>"]
        return {
          awardId,
          issuerPubkey: parts[1] ?? '',
          dTag: parts.slice(2).join(':'),
        };
      }).filter((c) => c.issuerPubkey && c.dTag);

      if (parsedCoords.length === 0) return [];

      // Build one filter per unique issuer to respect the "authors" constraint
      const issuerMap = new Map<string, string[]>();
      for (const { issuerPubkey, dTag } of parsedCoords) {
        const existing = issuerMap.get(issuerPubkey) ?? [];
        issuerMap.set(issuerPubkey, [...existing, dTag]);
      }

      const filters = Array.from(issuerMap.entries()).map(([issuer, dTags]) => ({
        kinds: [30009],
        authors: [issuer],
        '#d': dTags,
      }));

      const defEvents = await pool.query(filters);

      // Index definitions by "issuerPubkey:dTag" for fast lookup
      const defMap = new Map<string, NostrEvent>();
      for (const ev of defEvents) {
        const dTag = ev.tags.find(([n]) => n === 'd')?.[1];
        if (dTag) defMap.set(`${ev.pubkey}:${dTag}`, ev);
      }

      // ── Step 4: assemble results in display order ────────────────────────────
      const results: BadgeDefinition[] = [];

      for (const { awardId, issuerPubkey, dTag } of parsedCoords) {
        const def = defMap.get(`${issuerPubkey}:${dTag}`);
        if (!def) continue;

        const getName = () => def.tags.find(([n]) => n === 'name')?.[1] ?? dTag;
        const getDesc = () => def.tags.find(([n]) => n === 'description')?.[1] ?? '';
        const getImage = () => def.tags.find(([n]) => n === 'image')?.[1] ?? '';
        // Prefer the smallest thumb (last in list tends to be smallest, or use 64x64)
        const getThumbs = () => def.tags.filter(([n]) => n === 'thumb').map(([, u]) => u);

        const thumbs = getThumbs();
        const thumb = thumbs[thumbs.length - 1] ?? getImage();

        results.push({
          event: def,
          awardId,
          name: getName(),
          description: getDesc(),
          image: getImage(),
          thumb,
          issuerPubkey,
          dTag,
        });
      }

      return results;
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 10, // 10 minutes — badges change rarely
    gcTime: 1000 * 60 * 60 * 24,
  });
}
