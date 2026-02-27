import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { DMMessagingInterface } from '@/components/dm/DMMessagingInterface';
import { GroupMessagingInterface } from '@/components/groups/GroupMessagingInterface';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Lock, Shield, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function DirectMessagesPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dms' | 'groups'>('dms');

  useSeoMeta({
    title: 'Direct Messages - Tyrannosocial',
    description: 'Private, encrypted direct messages using NIP-17 Gift-Wrapped DMs with NIP-44 encryption.',
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-rose-50/20 dark:from-background dark:via-background dark:to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>

            <Card className="border-border/50 dark:border-transparent shadow-lg">
              <CardHeader className="space-y-4 text-center pb-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <MessageCircle className="h-16 w-16 text-primary relative" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Direct Messages</h1>
                  <p className="text-muted-foreground">
                    Private, encrypted conversations using NIP-17
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">End-to-End Encrypted</h3>
                      <p className="text-sm text-muted-foreground">
                        Messages are encrypted with NIP-44 encryption. Only you and your conversation partner can read them.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Gift-Wrapped for Privacy</h3>
                      <p className="text-sm text-muted-foreground">
                        Uses NIP-17 Gift Wraps to hide metadata like sender, recipient, and timestamps from public view.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Decentralized & Private</h3>
                      <p className="text-sm text-muted-foreground">
                        Messages are stored on Nostr relays you choose. No central server can read or censor your conversations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Log in to start sending private messages
                  </p>
                  <div className="flex justify-center">
                    <LoginArea className="max-w-60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-rose-50/20 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-6 flex flex-col h-full">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {activeTab === 'dms' ? (
                    <MessageCircle className="h-6 w-6 text-primary" />
                  ) : (
                    <Hash className="h-6 w-6 text-primary" />
                  )}
                  {activeTab === 'dms' ? 'Direct Messages' : 'Group Chats'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'dms' 
                    ? 'Private, encrypted conversations' 
                    : 'Public group channels'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dms' | 'groups')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 shrink-0">
            <TabsTrigger value="dms" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Direct Messages
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Hash className="h-4 w-4" />
              Group Chats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dms" className="flex-1 mt-0 min-h-0">
            <DMMessagingInterface className="h-full" />
          </TabsContent>

          <TabsContent value="groups" className="flex-1 mt-0 min-h-0">
            <GroupMessagingInterface className="h-full" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
