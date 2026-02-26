import { useEffect, useRef } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

// Default relay for logged-out users
const DEFAULT_RELAY = { url: 'wss://relay.primal.net', read: true, write: true };

/**
 * NostrSync - Syncs user's Nostr data
 *
 * This component runs globally to sync various Nostr data when the user logs in.
 * Currently syncs:
 * - NIP-65 relay list (kind 10002)
 * - Resets to default relay when user logs out
 */
export function NostrSync() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();
  const previousUserRef = useRef<string | null>(null);

  // Initialize: ensure logged-out users only use primal relay
  useEffect(() => {
    if (!user && config.relayMetadata.relays.length > 1) {
      console.log('No user logged in and multiple relays detected, resetting to relay.primal.net only');
      updateConfig((current) => ({
        ...current,
        relayMetadata: {
          relays: [DEFAULT_RELAY],
          updatedAt: 0,
        },
      }));
    }
  }, []); // Run only once on mount

  useEffect(() => {
    // Check if user logged out
    if (previousUserRef.current && !user) {
      console.log('User logged out, resetting to default relay (relay.primal.net)');
      updateConfig(() => ({
        theme: config.theme, // Preserve theme
        relayMetadata: {
          relays: [DEFAULT_RELAY],
          updatedAt: 0,
        },
      }));
    }

    // Update the ref to track login state
    previousUserRef.current = user?.pubkey || null;

    if (!user) return;

    const syncRelaysFromNostr = async () => {
      try {
        console.log('User logged in, fetching relay list from Nostr...');
        
        const events = await nostr.query(
          [{ kinds: [10002], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(5000) }
        );

        if (events.length > 0) {
          const event = events[0];

          // Only update if the event is newer than our stored data
          if (event.created_at > config.relayMetadata.updatedAt) {
            const fetchedRelays = event.tags
              .filter(([name]) => name === 'r')
              .map(([_, url, marker]) => ({
                url,
                read: !marker || marker === 'read',
                write: !marker || marker === 'write',
              }));

            if (fetchedRelays.length > 0) {
              console.log('Syncing relay list from Nostr:', fetchedRelays);
              updateConfig((current) => ({
                ...current,
                relayMetadata: {
                  relays: fetchedRelays,
                  updatedAt: event.created_at,
                },
              }));
            } else {
              console.log('No relays found in user relay list, keeping current relays');
            }
          } else {
            console.log('Stored relay list is already up to date');
          }
        } else {
          console.log('No relay list found for user, using default relay');
        }
      } catch (error) {
        console.error('Failed to sync relays from Nostr:', error);
      }
    };

    syncRelaysFromNostr();
  }, [user?.pubkey, nostr, updateConfig]);

  return null;
}