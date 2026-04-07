/**
 * useIdentities — NIP-39 external identity fetcher
 *
 * Fetches the external identities a user has declared (kind 10011),
 * returning parsed platform + identity pairs with proof URLs.
 *
 * Supported platforms: github, twitter, mastodon, telegram, nostr,
 * website, linkedin, instagram, youtube, twitch, discord, and more.
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

export interface ExternalIdentity {
  /** The full "platform:identity" string, e.g. "github:semisol" */
  raw: string;
  /** Normalized platform name, e.g. "github" */
  platform: string;
  /** The identity handle on the platform, e.g. "semisol" */
  identity: string;
  /** Proof string (gist id, tweet id, etc.) */
  proof: string;
  /** A constructed URL to the identity profile page, if known */
  profileUrl: string | null;
  /** Human-readable label for the platform */
  platformLabel: string;
}

/** Map platform slug → human-readable label */
const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  twitter: 'Twitter / X',
  mastodon: 'Mastodon',
  telegram: 'Telegram',
  nostr: 'Nostr',
  website: 'Website',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitch: 'Twitch',
  discord: 'Discord',
  facebook: 'Facebook',
  reddit: 'Reddit',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  medium: 'Medium',
  substack: 'Substack',
  keybase: 'Keybase',
};

/**
 * Build a profile URL for known platforms.
 */
function buildProfileUrl(platform: string, identity: string): string | null {
  switch (platform) {
    case 'github':
      return `https://github.com/${identity}`;
    case 'twitter':
      return `https://twitter.com/${identity}`;
    case 'mastodon': {
      // identity is "instance/@username"
      const parts = identity.split('/@');
      if (parts.length === 2) return `https://${parts[0]}/@${parts[1]}`;
      return `https://${identity}`;
    }
    case 'telegram':
      return `https://t.me/${identity}`;
    case 'linkedin':
      return `https://linkedin.com/in/${identity}`;
    case 'instagram':
      return `https://instagram.com/${identity}`;
    case 'youtube':
      return identity.startsWith('@')
        ? `https://youtube.com/${identity}`
        : `https://youtube.com/c/${identity}`;
    case 'twitch':
      return `https://twitch.tv/${identity}`;
    case 'reddit':
      return `https://reddit.com/u/${identity}`;
    case 'tiktok':
      return `https://tiktok.com/@${identity}`;
    case 'facebook':
      return `https://facebook.com/${identity}`;
    case 'medium':
      return `https://medium.com/@${identity}`;
    case 'substack':
      return `https://${identity}.substack.com`;
    case 'keybase':
      return `https://keybase.io/${identity}`;
    case 'soundcloud':
      return `https://soundcloud.com/${identity}`;
    case 'website':
      return identity.startsWith('http') ? identity : `https://${identity}`;
    default:
      return null;
  }
}

export function useIdentities(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['identities', pubkey, config.relayMetadata.updatedAt],
    queryFn: async (): Promise<ExternalIdentity[]> => {
      if (!pubkey) return [];

      const relayUrls = config.relayMetadata.relays
        .filter((r) => r.read)
        .map((r) => r.url);
      const pool = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      const events = await pool.query([
        { kinds: [10011], authors: [pubkey], limit: 1 },
      ]);

      if (events.length === 0) return [];

      const identityEvent = events[0];
      const results: ExternalIdentity[] = [];

      for (const tag of identityEvent.tags) {
        if (tag[0] !== 'i' || !tag[1]) continue;

        const raw = tag[1];
        const proof = tag[2] ?? '';

        // Split "platform:identity" — platform cannot contain ":"
        const colonIdx = raw.indexOf(':');
        if (colonIdx === -1) continue;

        const platform = raw.slice(0, colonIdx).toLowerCase();
        const identity = raw.slice(colonIdx + 1);

        if (!platform || !identity) continue;

        results.push({
          raw,
          platform,
          identity,
          proof,
          profileUrl: buildProfileUrl(platform, identity),
          platformLabel: PLATFORM_LABELS[platform] ?? platform,
        });
      }

      return results;
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
