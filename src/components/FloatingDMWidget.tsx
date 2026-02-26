import { useState, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDMContext } from '@/hooks/useDMContext';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { formatConversationTime } from '@/lib/dmUtils';
import { cn } from '@/lib/utils';
import type { NostrMetadata } from '@nostrify/nostrify';

interface OpenConversation {
  pubkey: string;
  isMinimized: boolean;
}

export function FloatingDMWidget() {
  const { user } = useCurrentUser();
  const { conversations } = useDMContext();
  const [openConversations, setOpenConversations] = useState<OpenConversation[]>([]);
  const [showConversationList, setShowConversationList] = useState(false);

  // Don't show widget if user is not logged in
  if (!user) {
    return null;
  }

  const handleOpenConversation = (pubkey: string) => {
    if (!openConversations.find(c => c.pubkey === pubkey)) {
      setOpenConversations([...openConversations, { pubkey, isMinimized: false }]);
    }
    setShowConversationList(false);
  };

  const handleCloseConversation = (pubkey: string) => {
    setOpenConversations(openConversations.filter(c => c.pubkey !== pubkey));
  };

  const handleToggleMinimize = (pubkey: string) => {
    setOpenConversations(
      openConversations.map(c =>
        c.pubkey === pubkey ? { ...c, isMinimized: !c.isMinimized } : c
      )
    );
  };

  // Get unread count from conversations
  const unreadCount = conversations.filter(c => 
    !openConversations.find(oc => oc.pubkey === c.pubkey) && 
    c.lastMessage && 
    !c.lastMessageFromUser
  ).length;

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">
      {/* Open Conversation Windows */}
      {openConversations.map((conversation) => (
        <ConversationWindow
          key={conversation.pubkey}
          pubkey={conversation.pubkey}
          isMinimized={conversation.isMinimized}
          onClose={() => handleCloseConversation(conversation.pubkey)}
          onToggleMinimize={() => handleToggleMinimize(conversation.pubkey)}
        />
      ))}

      {/* Conversation List Popup */}
      {showConversationList && (
        <Card className="w-80 h-96 shadow-2xl border-border/50 dark:border-transparent mb-2 animate-in slide-in-from-bottom-4">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Messages
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConversationList(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-60px)]">
            <CardContent className="p-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.slice(0, 10).map((conversation) => (
                    <ConversationListItem
                      key={conversation.pubkey}
                      pubkey={conversation.pubkey}
                      lastMessage={conversation.lastMessage}
                      lastActivity={conversation.lastActivity}
                      onClick={() => handleOpenConversation(conversation.pubkey)}
                      isOpen={openConversations.some(c => c.pubkey === conversation.pubkey)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {/* Main Chat Button */}
      <Button
        onClick={() => setShowConversationList(!showConversationList)}
        className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 mb-2 relative"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 bg-red-500 hover:bg-red-500 text-white border-2 border-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}

interface ConversationWindowProps {
  pubkey: string;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

function ConversationWindow({ pubkey, isMinimized, onClose, onToggleMinimize }: ConversationWindowProps) {
  const { user } = useCurrentUser();
  const { messages, sendMessage } = useDMContext();
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const profileImage = metadata?.picture;

  const conversationData = messages.get(pubkey);
  const conversationMessages = conversationData?.messages || [];

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return;

    setIsSending(true);
    try {
      await sendMessage({
        recipientPubkey: pubkey,
        content: messageText.trim(),
        protocol: 'nip17', // Use NIP-17 by default
      });
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className={cn(
      "shadow-2xl border-border/50 dark:border-transparent mb-2 transition-all duration-300",
      isMinimized ? "w-80 h-14" : "w-80 h-96"
    )}>
      {/* Header */}
      <CardHeader className="p-3 border-b flex-row items-center justify-between space-y-0 cursor-pointer hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={onToggleMinimize}>
          <Avatar className="h-8 w-8 ring-2 ring-background">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMinimize}
            className="h-6 w-6"
          >
            {isMinimized ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Minimize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {/* Message Area - Only show when not minimized */}
      {!isMinimized && (
        <>
          <ScrollArea className="h-[calc(100%-120px)] p-3">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3">
                {conversationMessages.map((msg) => {
                  const isFromUser = msg.pubkey === user?.pubkey;
                  const content = msg.decryptedContent || msg.content;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        isFromUser ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words",
                          isFromUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{content}</p>
                        <p className={cn(
                          "text-xs mt-1 opacity-70",
                          isFromUser ? "text-right" : "text-left"
                        )}>
                          {formatConversationTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="min-h-[40px] max-h-[80px] resize-none text-sm"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isSending}
                size="icon"
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

interface ConversationListItemProps {
  pubkey: string;
  lastMessage: any;
  lastActivity: number;
  onClick: () => void;
  isOpen: boolean;
}

function ConversationListItem({ pubkey, lastMessage, lastActivity, onClick, isOpen }: ConversationListItemProps) {
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  
  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const profileImage = metadata?.picture;
  
  const lastMessageText = lastMessage?.decryptedContent || lastMessage?.content || 'No messages yet';
  const timeString = formatConversationTime(lastActivity);

  return (
    <button
      onClick={onClick}
      disabled={isOpen}
      className={cn(
        "w-full p-2 rounded-lg text-left transition-colors",
        isOpen ? "opacity-50 cursor-not-allowed" : "hover:bg-accent cursor-pointer"
      )}
    >
      <div className="flex items-start gap-2">
        <Avatar className="h-10 w-10 ring-2 ring-background shrink-0">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <span className="text-xs text-muted-foreground shrink-0">{timeString}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {lastMessageText}
          </p>
        </div>
      </div>
    </button>
  );
}
