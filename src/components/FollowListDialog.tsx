import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFollowers, useFollowing } from '@/hooks/useFollowers';
import { useMutualFollows } from '@/hooks/useMutualFollows';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Search, ArrowLeftRight } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';

interface FollowListDialogProps {
  pubkey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'followers' | 'following' | 'mutuals';
  /** Show the Mutuals tab — only when the viewer is looking at their own profile */
  showMutuals?: boolean;
}

export function FollowListDialog({ pubkey, open, onOpenChange, defaultTab = 'followers', showMutuals = false }: FollowListDialogProps) {
  const { data: followers = [], isLoading: isLoadingFollowers } = useFollowers(pubkey);
  const { data: following = [], isLoading: isLoadingFollowing } = useFollowing(pubkey);
  const { data: mutuals = [], isLoading: isLoadingMutuals } = useMutualFollows();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleUserClick = (userPubkey: string) => {
    const npub = nip19.npubEncode(userPubkey);
    onOpenChange(false);
    navigate(`/${npub}`);
  };

  const tabCols = showMutuals ? 3 : 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Connections
          </DialogTitle>
          <DialogDescription>
            View followers and following
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-h-0 flex-1">
          {/* Search — filtering is done inside UserListItem via the searchQuery prop */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue={defaultTab} className="flex flex-col min-h-0 flex-1">
            <TabsList className={`grid w-full shrink-0 grid-cols-${tabCols}`}>
              <TabsTrigger value="followers" className="gap-1.5 text-xs sm:text-sm">
                <Users className="h-3.5 w-3.5" />
                Followers
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {followers.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-1.5 text-xs sm:text-sm">
                <UserPlus className="h-3.5 w-3.5" />
                Following
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {following.length}
                </Badge>
              </TabsTrigger>
              {showMutuals && (
                <TabsTrigger value="mutuals" className="gap-1.5 text-xs sm:text-sm">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Mutuals
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 bg-primary/10 text-primary">
                    {mutuals.length}
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Followers */}
            <TabsContent value="followers" className="mt-3 flex-1 min-h-0">
              <UserList
                pubkeys={followers}
                isLoading={isLoadingFollowers}
                searchQuery={searchQuery}
                emptyLabel="No followers yet"
                emptySearchLabel="No followers found"
                emptyIcon={<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
                onUserClick={handleUserClick}
              />
            </TabsContent>

            {/* Following */}
            <TabsContent value="following" className="mt-3 flex-1 min-h-0">
              <UserList
                pubkeys={following}
                isLoading={isLoadingFollowing}
                searchQuery={searchQuery}
                emptyLabel="Not following anyone yet"
                emptySearchLabel="No users found"
                emptyIcon={<UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
                onUserClick={handleUserClick}
              />
            </TabsContent>

            {/* Mutuals — only rendered when showMutuals=true */}
            {showMutuals && (
              <TabsContent value="mutuals" className="mt-3 flex-1 min-h-0">
                <UserList
                  pubkeys={mutuals}
                  isLoading={isLoadingMutuals}
                  searchQuery={searchQuery}
                  emptyLabel="No mutual follows yet"
                  emptySearchLabel="No mutual follows found"
                  emptyIcon={<ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
                  onUserClick={handleUserClick}
                  mutualBadge
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── UserList ────────────────────────────────────────────────────────────────
// Renders a scrollable list of pubkeys, with skeleton loading and empty states.
// Filtering by searchQuery is delegated to each UserListItem so hooks are only
// called at the top level of a component — never inside array .filter().

function UserList({
  pubkeys, isLoading, searchQuery,
  emptyLabel, emptySearchLabel, emptyIcon,
  onUserClick, mutualBadge = false,
}: {
  pubkeys: string[];
  isLoading: boolean;
  searchQuery: string;
  emptyLabel: string;
  emptySearchLabel: string;
  emptyIcon: React.ReactNode;
  onUserClick: (pubkey: string) => void;
  mutualBadge?: boolean;
}) {
  if (isLoading) {
    return (
      <ScrollArea className="h-[380px] pr-3">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (pubkeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[380px] text-center">
        {emptyIcon}
        <p className="text-muted-foreground">{searchQuery ? emptySearchLabel : emptyLabel}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[380px] pr-3">
      <div className="space-y-2">
        {pubkeys.map((pk) => (
          <UserListItem
            key={pk}
            pubkey={pk}
            searchQuery={searchQuery}
            mutualBadge={mutualBadge}
            onClick={() => onUserClick(pk)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// ── UserListItem ────────────────────────────────────────────────────────────
// Hooks are called at the TOP LEVEL of this component — never in callbacks.
// Filtering by searchQuery is done here so useAuthor is a proper hook call.

function UserListItem({
  pubkey, searchQuery, onClick, mutualBadge = false,
}: {
  pubkey: string;
  searchQuery: string;
  onClick: () => void;
  mutualBadge?: boolean;
}) {
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const username = metadata?.name || genUserName(pubkey);
  const profileImage = metadata?.picture;
  const bio = metadata?.about;

  // Client-side search filter — done here so hooks aren't called conditionally
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const matches =
      displayName.toLowerCase().includes(q) ||
      username.toLowerCase().includes(q) ||
      metadata?.nip05?.toLowerCase().includes(q);
    if (!matches) return null;
  }

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors group"
    >
      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background">
        <AvatarImage src={profileImage} alt={displayName} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
            {displayName}
          </p>
          {mutualBadge && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">
              Mutual
            </Badge>
          )}
          {metadata?.nip05 && (
            <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">✓</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">@{username}</p>
        {bio && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bio}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center"
      >
        View
      </Button>
    </div>
  );
}
