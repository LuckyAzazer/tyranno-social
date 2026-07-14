/**
 * MutualFollowBadge — wraps an Avatar and overlays a small handshake icon
 * at the bottom-right if the given pubkey is a mutual follow of the
 * currently logged-in user.
 *
 * Usage:
 *   <MutualFollowBadge pubkey={event.pubkey}>
 *     <Avatar …>…</Avatar>
 *   </MutualFollowBadge>
 */

import { useMutualFollows } from '@/hooks/useMutualFollows';
import { Handshake } from 'lucide-react';

interface MutualFollowBadgeProps {
  pubkey: string;
  children: React.ReactNode;
}

export function MutualFollowBadge({ pubkey, children }: MutualFollowBadgeProps) {
  const { data: mutuals } = useMutualFollows();

  const isMutual = mutuals?.includes(pubkey) ?? false;

  return (
    <div className="relative inline-flex">
      {children}
      {isMutual && (
        <div
          className="absolute -bottom-0.5 -right-0.5 z-10 flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-background shadow-sm"
          title="Mutual follow"
        >
          <Handshake className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
}
