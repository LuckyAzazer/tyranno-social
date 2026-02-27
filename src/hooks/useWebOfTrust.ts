import { useLocalStorage } from './useLocalStorage';
import { useCurrentUser } from './useCurrentUser';

/**
 * Hook for managing Web of Trust filtering preference
 * 
 * Web of Trust filters posts to only show:
 * 1. People you follow (1st degree)
 * 2. People followed by people you follow (2nd degree)
 * 
 * For non-logged-in users: Cannot use Web of Trust (requires follows)
 * For logged-in users: Can toggle on/off
 */
export function useWebOfTrust() {
  const { user } = useCurrentUser();
  const [wotEnabled, setWotEnabled] = useLocalStorage('web-of-trust-enabled', false);

  // Web of Trust only works for logged-in users with follows
  const canUseWoT = !!user;

  // If not logged in, WoT is always disabled
  const isActive = canUseWoT && wotEnabled;

  return {
    isActive,
    wotEnabled,
    setWotEnabled,
    canUseWoT,
  };
}
