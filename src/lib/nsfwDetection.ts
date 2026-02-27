import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Detects if a Nostr event might contain NSFW (Not Safe For Work) content.
 * Uses multiple heuristics to identify potentially inappropriate content.
 * 
 * @param event - Nostr event to check
 * @returns true if event likely contains NSFW content
 */
export function isLikelyNSFW(event: NostrEvent): boolean {
  // Check for content-warning tag (NIP-36)
  const hasContentWarning = event.tags.some(([name]) => name === 'content-warning');
  if (hasContentWarning) return true;

  // Check for NSFW-related hashtags
  const nsfwHashtags = ['nsfw', 'porn', 'xxx', 'adult', 'nude', 'nudity', 'sex', 'sexual', 'explicit', '18+', 'nudes'];
  const hasnsfwHashtag = event.tags.some(([name, value]) => 
    name === 't' && value && nsfwHashtags.includes(value.toLowerCase())
  );
  if (hasnsfwHashtag) return true;

  // Check content text for NSFW keywords
  const contentLower = event.content.toLowerCase();
  const nsfwKeywords = [
    'nsfw',
    'porn',
    'xxx',
    'nude',
    'naked',
    'sex',
    'explicit',
    '18+',
    'adult content',
    'not safe for work',
  ];
  
  const hasNSFWKeyword = nsfwKeywords.some(keyword => {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(contentLower);
  });
  
  if (hasNSFWKeyword) return true;

  // Check for common NSFW image hosting domains
  const nsfwDomains = [
    'imgur.com/a/',  // Imgur albums often contain NSFW
    'redgifs.com',
    'pornhub.com',
    'xvideos.com',
    'onlyfans.com',
  ];

  const hasNSFWDomain = nsfwDomains.some(domain => 
    contentLower.includes(domain)
  );

  return hasNSFWDomain;
}

/**
 * Filters a list of events to remove NSFW content.
 * Useful for filtering feeds for non-logged-in users or safe browsing modes.
 * 
 * @param events - Array of Nostr events to filter
 * @returns Filtered array with NSFW content removed
 */
export function filterNSFWContent(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => !isLikelyNSFW(event));
}
