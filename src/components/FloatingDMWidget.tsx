import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDMContext } from '@/hooks/useDMContext';
import { useFloatingDM } from '@/contexts/FloatingDMContext';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { genUserName } from '@/lib/genUserName';
import { formatConversationTime } from '@/lib/dmUtils';
import { FloatingDMSidebar } from '@/components/FloatingDMSidebar';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { NostrMetadata } from '@nostrify/nostrify';

export function FloatingDMWidget() {
  const { user } = useCurrentUser();
  const { conversations } = useDMContext();
  const { openConversations, openConversation, closeConversation, toggleMinimize } = useFloatingDM();
  const [showConversationList, setShowConversationList] = useState(false);

  // Don't show widget if user is not logged in
  if (!user) {
    return null;
  }

  const handleOpenConversation = (pubkey: string) => {
    openConversation(pubkey);
    setShowConversationList(false);
  };

  // Get unread count from conversations
  const unreadCount = conversations.filter(c => 
    !openConversations.find(oc => oc.pubkey === c.pubkey) && 
    c.lastMessage && 
    !c.lastMessageFromUser
  ).length;

  const openPubkeys = openConversations.map(c => c.pubkey);

  return (
    <>
      {/* Left Sidebar */}
      <FloatingDMSidebar
        onOpenConversation={handleOpenConversation}
        onCloseConversation={closeConversation}
        openConversations={openPubkeys}
      />

      {/* Bottom Right Chat Windows */}
      <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">
        {/* Open Conversation Windows */}
        {openConversations.map((conversation) => (
          <ConversationWindow
            key={conversation.pubkey}
            pubkey={conversation.pubkey}
            isMinimized={conversation.isMinimized}
            onClose={() => closeConversation(conversation.pubkey)}
            onToggleMinimize={() => toggleMinimize(conversation.pubkey)}
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
    </>
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
  const { config } = useAppContext();
  const { messages, sendMessage } = useDMContext();
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const navigate = useNavigate();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Array<{ content: string; timestamp: number }>>([]);

  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey) || 'Unknown';
  const profileImage = metadata?.picture;
  const hasDMRelays = Boolean(config?.dmInboxRelays?.relays?.length);

  const conversationData = messages?.get?.(pubkey);
  const conversationMessages = conversationData?.messages || [];
  
  console.log('[FloatingDM] Rendering conversation with', pubkey);
  console.log('[FloatingDM] Messages in state:', conversationMessages.length);
  console.log('[FloatingDM] Optimistic messages:', optimisticMessages.length);
  console.log('[FloatingDM] Has DM relays configured:', hasDMRelays);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    const scrollArea = document.querySelector(`[data-conversation="${pubkey}"] [data-radix-scroll-area-viewport]`);
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  };

  // Scroll when messages change
  useEffect(() => {
    if (!isMinimized && conversationMessages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isMinimized, conversationMessages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return;

    const content = messageText.trim();
    const timestamp = Date.now();
    
    console.log('[FloatingDM] Attempting to send message');
    console.log('[FloatingDM] Recipient:', pubkey);
    console.log('[FloatingDM] Content:', content);
    console.log('[FloatingDM] User has NIP-44:', !!user.signer.nip44);
    
    // Add optimistic message immediately
    setOptimisticMessages(prev => [...prev, { content, timestamp }]);
    setMessageText('');
    setIsSending(true);

    try {
      await sendMessage({
        recipientPubkey: pubkey,
        content: content,
        protocol: 'nip17', // Use NIP-17 by default
      });
      console.log('[FloatingDM] Message sent successfully');
      
      // Remove optimistic message after 30 seconds (give more time for relays to process)
      // If DM relays aren't configured, keep the optimistic message longer
      const timeout = hasDMRelays ? 30000 : 60000;
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(m => m.timestamp !== timestamp));
      }, timeout);
      
      setTimeout(scrollToBottom, 200);
    } catch (error) {
      console.error('[FloatingDM] Failed to send message:', error);
      // Remove failed optimistic message
      setOptimisticMessages(prev => prev.filter(m => m.timestamp !== timestamp));
      setMessageText(content); // Restore message on error
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
              {displayName.charAt(0).toUpperCase()}
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
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-6 w-6 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {/* Message Area - Only show when not minimized */}
      {!isMinimized && (
        <>
          {/* DM Relay Warning */}
          {!hasDMRelays && (
            <div className="px-3 pt-3">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-yellow-900 dark:text-yellow-200 font-medium mb-1">
                    Configure DM Relays
                  </p>
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
                    Messages won't sync until you set up DM inbox relays.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/messages')}
                    className="h-6 text-xs border-yellow-600/50 hover:bg-yellow-100 dark:hover:bg-yellow-950/40"
                  >
                    Set Up Now
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <ScrollArea className={cn("p-3", hasDMRelays ? "h-[calc(100%-120px)]" : "h-[calc(100%-220px)]")} data-conversation={pubkey}>
            {conversationMessages.length === 0 && optimisticMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3">
                {/* Real messages from DM context */}
                {conversationMessages.map((msg, index) => {
                  const isFromUser = msg.pubkey === user?.pubkey;
                  const content = msg.decryptedContent || msg.content;

                  return (
                    <div
                      key={msg.id || `msg-${index}`}
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
                
                {/* Optimistic messages (showing while sending) */}
                {optimisticMessages.map((msg) => (
                  <div
                    key={`optimistic-${msg.timestamp}`}
                    className="flex justify-end"
                  >
                    <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm break-words bg-primary/60 text-primary-foreground opacity-70">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70 text-right">
                        Sending...
                      </p>
                    </div>
                  </div>
                ))}
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
