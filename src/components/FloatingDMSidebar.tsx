import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDMContext } from '@/hooks/useDMContext';
import { useFollowing } from '@/hooks/useFollowers';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import type { NostrMetadata } from '@nostrify/nostrify';

interface FloatingDMSidebarProps {
  onOpenConversation: (pubkey: string) => void;
  onCloseConversation: (pubkey: string) => void;
  openConversations: string[];
}

export function FloatingDMSidebar({ onOpenConversation, onCloseConversation, openConversations }: FloatingDMSidebarProps) {
  const { user } = useCurrentUser();
  const { conversations } = useDMContext();
  const { data: followingPubkeys = [] } = useFollowing(user?.pubkey || '');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't show sidebar if user is not logged in
  if (!user) {
    return null;
  }

  // Create a combined list: recent DMs first, then remaining following
  // Filter out self from conversations
  const recentDMPubkeys = conversations
    .filter(c => c.lastMessage && c.pubkey !== user.pubkey) // Only conversations with messages, exclude self
    .map(c => c.pubkey);

  const followingNotInRecent = followingPubkeys.filter(
    pubkey => !recentDMPubkeys.includes(pubkey) && pubkey !== user.pubkey // Exclude self
  );

  const combinedList = [...recentDMPubkeys, ...followingNotInRecent];

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen bg-card border-r border-border/50 dark:border-transparent shadow-lg transition-transform duration-300 z-40",
          isCollapsed ? "-translate-x-full" : "translate-x-0",
          "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Quick Messages
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Following & Recent Chats
            </p>
          </div>

          {/* User List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {combinedList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm px-4">
                  No contacts yet. Follow users to chat with them!
                </div>
              ) : (
                <>
                  {/* Recent DMs Section */}
                  {recentDMPubkeys.length > 0 && (
                    <div className="mb-3">
                      <div className="px-2 py-1 mb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Recent
                        </p>
                      </div>
                      <div className="space-y-1">
                        {recentDMPubkeys.map((pubkey) => {
                          const isOpen = openConversations.includes(pubkey);
                          const conversation = conversations.find(c => c.pubkey === pubkey);
                          const hasUnread = conversation?.lastMessage && !conversation.lastMessageFromUser;

                          return (
                            <UserListItem
                              key={pubkey}
                              pubkey={pubkey}
                              isRecent={true}
                              isOpen={isOpen}
                              hasUnread={hasUnread || false}
                              onOpen={() => onOpenConversation(pubkey)}
                              onClose={() => onCloseConversation(pubkey)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Following Section */}
                  {followingNotInRecent.length > 0 && (
                    <div>
                      <div className="px-2 py-1 mb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Following
                        </p>
                      </div>
                      <div className="space-y-1">
                        {followingNotInRecent.map((pubkey) => {
                          const isOpen = openConversations.includes(pubkey);

                          return (
                            <UserListItem
                              key={pubkey}
                              pubkey={pubkey}
                              isRecent={false}
                              isOpen={isOpen}
                              hasUnread={false}
                              onOpen={() => onOpenConversation(pubkey)}
                              onClose={() => onCloseConversation(pubkey)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Toggle Button */}
      <Button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50 h-12 rounded-r-lg rounded-l-none shadow-lg transition-all duration-300 px-2",
          isCollapsed ? "left-0" : "left-64"
        )}
        size="icon"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}

interface UserListItemProps {
  pubkey: string;
  isRecent: boolean;
  isOpen: boolean;
  hasUnread: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function UserListItem({ pubkey, isRecent, isOpen, hasUnread, onOpen, onClose }: UserListItemProps) {
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  
  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const username = metadata?.name || genUserName(pubkey);
  const profileImage = metadata?.picture;

  return (
    <div
      className={cn(
        "group relative rounded-lg transition-colors",
        isOpen ? "bg-primary/10" : "hover:bg-accent"
      )}
    >
      <button
        onClick={onOpen}
        className="w-full p-2 text-left flex items-center gap-2"
      >
        <div className="relative shrink-0">
          <Avatar className="h-9 w-9 ring-2 ring-background">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {hasUnread && (
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm truncate",
            hasUnread && "font-semibold"
          )}>
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{username}
          </p>
        </div>
      </button>

      {/* Close button - only show when chat is open */}
      {isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
