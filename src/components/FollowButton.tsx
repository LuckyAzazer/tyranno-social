/**
 * FollowButton — renders a follow / unfollow button for a given pubkey.
 * Handles its own login guard (shows a toast if not logged in).
 */

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowUser } from '@/hooks/useFollowUser';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  pubkey: string;
  /** Optional extra class names */
  className?: string;
  /** Compact variant — icon only */
  iconOnly?: boolean;
}

export function FollowButton({ pubkey, className = '', iconOnly = false }: FollowButtonProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { isFollowing, follow, unfollow, isPending } = useFollowUser(pubkey);

  // Don't render for your own profile
  if (user?.pubkey === pubkey) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to follow people.',
        variant: 'destructive',
      });
      return;
    }

    if (isFollowing) {
      unfollow();
    } else {
      follow();
    }
  };

  if (iconOnly) {
    return (
      <Button
        variant={isFollowing ? 'outline' : 'default'}
        size="icon"
        className={`h-8 w-8 transition-all ${
          isFollowing
            ? 'hover:border-red-400 hover:text-red-500 hover:bg-red-500/10'
            : 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70'
        } ${className}`}
        onClick={handleClick}
        disabled={isPending}
        title={isFollowing ? 'Unfollow' : 'Follow'}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isFollowing ? (
          <UserMinus className="h-3.5 w-3.5" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      className={`gap-2 transition-all ${
        isFollowing
          ? 'hover:border-red-400 hover:text-red-500 hover:bg-red-500/10'
          : 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70'
      } ${className}`}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {isFollowing ? 'Unfollow' : 'Follow'}
    </Button>
  );
}
