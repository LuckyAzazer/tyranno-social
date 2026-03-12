import type { NostrEvent } from '@nostrify/nostrify';

export interface NostrBackup {
  version: string;
  exportedAt: number;
  pubkey: string;
  profile?: NostrEvent; // kind 0
  contacts?: NostrEvent; // kind 3
  relayList?: NostrEvent; // kind 10002
  dmInboxRelays?: NostrEvent; // kind 10050
  posts: NostrEvent[]; // kind 1
  articles: NostrEvent[]; // kind 30023
  bookmarkSets: NostrEvent[]; // kind 30003
  bookmarkLists: NostrEvent[]; // kind 30001
  otherEvents: NostrEvent[]; // Any other events
}

/**
 * Export user's Nostr data to a downloadable JSON file
 */
export async function exportNostrData(
  nostr: any,
  pubkey: string,
  options: {
    includePosts?: boolean;
    includeArticles?: boolean;
    includeBookmarks?: boolean;
    postLimit?: number;
  } = {}
): Promise<NostrBackup> {
  const {
    includePosts = true,
    includeArticles = true,
    includeBookmarks = true,
    postLimit = 500,
  } = options;

  const backup: NostrBackup = {
    version: '1.0.0',
    exportedAt: Math.floor(Date.now() / 1000),
    pubkey,
    posts: [],
    articles: [],
    bookmarkSets: [],
    bookmarkLists: [],
    otherEvents: [],
  };

  try {
    // Fetch profile metadata (kind 0)
    const profileEvents = await nostr.query([
      { kinds: [0], authors: [pubkey], limit: 1 }
    ]);
    if (profileEvents.length > 0) {
      backup.profile = profileEvents[0];
    }

    // Fetch contacts/follows (kind 3)
    const contactEvents = await nostr.query([
      { kinds: [3], authors: [pubkey], limit: 1 }
    ]);
    if (contactEvents.length > 0) {
      backup.contacts = contactEvents[0];
    }

    // Fetch relay list (kind 10002)
    const relayListEvents = await nostr.query([
      { kinds: [10002], authors: [pubkey], limit: 1 }
    ]);
    if (relayListEvents.length > 0) {
      backup.relayList = relayListEvents[0];
    }

    // Fetch DM inbox relays (kind 10050)
    const dmInboxEvents = await nostr.query([
      { kinds: [10050], authors: [pubkey], limit: 1 }
    ]);
    if (dmInboxEvents.length > 0) {
      backup.dmInboxRelays = dmInboxEvents[0];
    }

    // Fetch posts (kind 1)
    if (includePosts) {
      const posts = await nostr.query([
        { kinds: [1], authors: [pubkey], limit: postLimit }
      ]);
      backup.posts = posts;
    }

    // Fetch articles (kind 30023)
    if (includeArticles) {
      const articles = await nostr.query([
        { kinds: [30023], authors: [pubkey], limit: 100 }
      ]);
      backup.articles = articles;
    }

    // Fetch bookmark sets (kind 30003) and lists (kind 30001)
    if (includeBookmarks) {
      const bookmarkSets = await nostr.query([
        { kinds: [30003], authors: [pubkey], limit: 50 }
      ]);
      backup.bookmarkSets = bookmarkSets;

      const bookmarkLists = await nostr.query([
        { kinds: [30001], authors: [pubkey], limit: 50 }
      ]);
      backup.bookmarkLists = bookmarkLists;
    }

    // Fetch other potentially useful events
    const otherEvents = await nostr.query([
      { 
        kinds: [4, 7, 9735, 10000, 10001, 10002], // DMs, reactions, zaps, mute lists, pin lists, relay lists
        authors: [pubkey], 
        limit: 200 
      }
    ]);
    backup.otherEvents = otherEvents;

  } catch (error) {
    console.error('Error exporting Nostr data:', error);
    throw error;
  }

  return backup;
}

/**
 * Download backup data as a JSON file
 */
export function downloadBackup(backup: NostrBackup, filename?: string) {
  const defaultFilename = `nostr-backup-${backup.pubkey.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
  const finalFilename = filename || defaultFilename;

  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate imported backup file
 */
export async function parseBackupFile(file: File): Promise<NostrBackup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content) as NostrBackup;

        // Basic validation
        if (!backup.version || !backup.pubkey || !backup.exportedAt) {
          throw new Error('Invalid backup file format');
        }

        resolve(backup);
      } catch (error) {
        reject(new Error('Failed to parse backup file. Please ensure it is a valid Nostr backup.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Restore backup data by publishing events to relays
 */
export async function restoreBackup(
  nostr: any,
  backup: NostrBackup,
  options: {
    restoreProfile?: boolean;
    restoreContacts?: boolean;
    restorePosts?: boolean;
    restoreBookmarks?: boolean;
  } = {}
): Promise<{ success: number; failed: number }> {
  const {
    restoreProfile = true,
    restoreContacts = true,
    restorePosts = false, // Default false to prevent spam
    restoreBookmarks = true,
  } = options;

  let success = 0;
  let failed = 0;

  const eventsToPublish: NostrEvent[] = [];

  // Add profile
  if (restoreProfile && backup.profile) {
    eventsToPublish.push(backup.profile);
  }

  // Add contacts
  if (restoreContacts && backup.contacts) {
    eventsToPublish.push(backup.contacts);
  }

  // Add relay list
  if (backup.relayList) {
    eventsToPublish.push(backup.relayList);
  }

  // Add DM inbox relays
  if (backup.dmInboxRelays) {
    eventsToPublish.push(backup.dmInboxRelays);
  }

  // Add posts (careful - can be many!)
  if (restorePosts && backup.posts.length > 0) {
    eventsToPublish.push(...backup.posts);
  }

  // Add articles
  if (backup.articles.length > 0) {
    eventsToPublish.push(...backup.articles);
  }

  // Add bookmarks
  if (restoreBookmarks) {
    eventsToPublish.push(...backup.bookmarkSets);
    eventsToPublish.push(...backup.bookmarkLists);
  }

  // Publish events
  for (const event of eventsToPublish) {
    try {
      await nostr.event(event);
      success++;
    } catch (error) {
      console.error('Failed to publish event:', event.id, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Get backup statistics
 */
export function getBackupStats(backup: NostrBackup) {
  return {
    totalEvents: (
      (backup.profile ? 1 : 0) +
      (backup.contacts ? 1 : 0) +
      (backup.relayList ? 1 : 0) +
      (backup.dmInboxRelays ? 1 : 0) +
      backup.posts.length +
      backup.articles.length +
      backup.bookmarkSets.length +
      backup.bookmarkLists.length +
      backup.otherEvents.length
    ),
    posts: backup.posts.length,
    articles: backup.articles.length,
    bookmarks: backup.bookmarkSets.length + backup.bookmarkLists.length,
    hasProfile: !!backup.profile,
    hasContacts: !!backup.contacts,
    hasRelayList: !!backup.relayList,
  };
}
