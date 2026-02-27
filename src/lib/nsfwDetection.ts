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
  const nsfwHashtags = [
    'nsfw', 'porn', 'xxx', 'adult', 'nude', 'nudity', 'sex', 'sexual', 'explicit', '18+', 'nudes',
    'tits', 'ass', 'boobs', 'pussy', 'dick', 'cock', 'cum', 'sexy', 'hot', 'horny', 'fetish',
    'onlyfans', 'premium', 'premium content', 'dm me', 'dm for', 'paywall', 'subscribe',
  ];
  const hasnsfwHashtag = event.tags.some(([name, value]) => 
    name === 't' && value && nsfwHashtags.includes(value.toLowerCase())
  );
  if (hasnsfwHashtag) return true;

  const contentLower = event.content.toLowerCase();

  // Check for spam/promotional patterns common in NSFW posts
  const spamPatterns = [
    /premium\s+(content|money|access)/i,
    /dm\s+(me|for|to)/i,
    /subscribe\s+(to|for|now)/i,
    /only\s*fans/i,
    /tip\s+me/i,
    /send\s+(sats|bitcoin|btc)/i,
    /\$\s*\d+/,  // Dollar amounts
    /💰|💵|💸|🔞|🍆|🍑|🔥/,  // Suggestive emojis
  ];

  const hasSpamPattern = spamPatterns.some(pattern => pattern.test(event.content));
  if (hasSpamPattern) return true;

  // Check content text for NSFW keywords
  const nsfwKeywords = [
    'nsfw', 'porn', 'xxx', 'nude', 'naked', 'sex', 'explicit', '18+', 'adult content',
    'not safe for work', 'tits', 'boobs', 'ass', 'pussy', 'dick', 'cock', 'cum',
    'sexy', 'horny', 'fetish', 'amateur', 'milf', 'teen sex', 'only fans', 'onlyfans',
    'premium content', 'premium snap', 'premium vid',
  ];
  
  const hasNSFWKeyword = nsfwKeywords.some(keyword => {
    // Use word boundaries for most, but also check for common variations
    const escapedKeyword = keyword.replace(/\s+/g, '\\s*');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    return regex.test(contentLower);
  });
  
  if (hasNSFWKeyword) return true;

  // Check for common NSFW image hosting domains and platforms
  const nsfwDomains = [
    'imgur.com/a/',
    'redgifs.com',
    'pornhub.com',
    'xvideos.com',
    'onlyfans.com',
    'fansly.com',
    'manyvids.com',
    'clips4sale.com',
    'chaturbate.com',
    'stripchat.com',
  ];

  const hasNSFWDomain = nsfwDomains.some(domain => 
    contentLower.includes(domain)
  );

  if (hasNSFWDomain) return true;

  // Check for suspicious image URLs with NSFW-related filenames
  const imageUrlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi;
  const imageUrls = event.content.match(imageUrlPattern) || [];
  
  const hasNSFWImageName = imageUrls.some(url => {
    const urlLower = url.toLowerCase();
    return nsfwKeywords.some(keyword => urlLower.includes(keyword));
  });

  if (hasNSFWImageName) return true;

  // For posts with images but minimal text, be more cautious
  const hasImages = imageUrls.length > 0 || event.tags.some(([name]) => name === 'imeta');
  const textWithoutUrls = event.content.replace(/https?:\/\/[^\s]+/g, '').trim();
  const hasMinimalText = textWithoutUrls.length < 30;
  
  // Check for suspicious patterns that often indicate NSFW spam
  const suspiciousPatterns = [
    /premium/i,
    /money/i,
    /bitcoin.*standard/i,
    /crypto.*girl/i,
    /💰/,
    /dm\s+me/i,
    /subscribe/i,
    /only\s*fans/i,
    /exclusive/i,
    /vip/i,
    /content.*link/i,
  ];

  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
    pattern.test(event.content)
  );

  // If post has images with minimal text and suspicious patterns, filter it
  if (hasImages && hasMinimalText && hasSuspiciousPattern) {
    return true;
  }

  // Extra aggressive: Filter any post with images and very little meaningful text
  // This catches spam posts that are just promotional images
  if (hasImages && textWithoutUrls.length < 10 && textWithoutUrls.length > 0) {
    // Check if the text is just emojis or single words
    const alphanumericText = textWithoutUrls.replace(/[^\w\s]/g, '').trim();
    if (alphanumericText.length < 5) {
      return true; // Likely spam/promotional
    }
  }

  return false;
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
