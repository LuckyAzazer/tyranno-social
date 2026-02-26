import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useProfile, useUserPosts } from '@/hooks/useProfile';
import { useFollowStats } from '@/hooks/useFollowers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { MasonryGrid } from '@/components/MasonryGrid';
import { PostDetailDialog } from '@/components/PostDetailDialog';
import { ColumnSelector } from '@/components/ColumnSelector';
import { ColorThemeSelector } from '@/components/ColorThemeSelector';
import { FollowListDialog } from '@/components/FollowListDialog';
import { ZapDialog } from '@/components/ZapDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { genUserName } from '@/lib/genUserName';
import { ArrowLeft, MapPin, Link as LinkIcon, Calendar, Mail, Zap, CheckCircle2, Edit, Copy, MessageCircle, Users, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { EditProfileForm } from '@/components/EditProfileForm';
import type { NostrMetadata, NostrEvent } from '@nostrify/nostrify';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Event } from 'nostr-tools';

interface ProfilePageProps {
  pubkey: string;
}

export function ProfilePage({ pubkey }: ProfilePageProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [columns, setColumns] = useLocalStorage<number>('masonry-columns', 3);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<'followers' | 'following'>('followers');
  const { data: profileData, isLoading: isLoadingProfile } = useProfile(pubkey);
  const { data: posts, isLoading: isLoadingPosts } = useUserPosts(pubkey);
  const { followersCount, followingCount, isLoading: isLoadingStats } = useFollowStats(pubkey);

  // Check if this is the current user's own profile
  const isOwnProfile = user?.pubkey === pubkey;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const metadata: NostrMetadata | undefined = profileData?.metadata;
  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const username = metadata?.name || genUserName(pubkey);
  const bio = metadata?.about;
  const banner = metadata?.banner;
  const profileImage = metadata?.picture;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;
  const lud16 = metadata?.lud16;
  const lud06 = metadata?.lud06;
  const npub = nip19.npubEncode(pubkey);

  useSeoMeta({
    title: `${displayName} (@${username}) - Tyrannosocial`,
    description: bio || `View ${displayName}'s profile on Tyrannosocial`,
  });

  const handlePostClick = (event: NostrEvent) => {
    setSelectedPost(event);
    setDialogOpen(true);
  };

  const handleOpenFollowers = () => {
    setFollowListTab('followers');
    setFollowListOpen(true);
  };

  const handleOpenFollowing = () => {
    setFollowListTab('following');
    setFollowListOpen(true);
  };

  const handleSendDM = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to send direct messages',
        variant: 'destructive',
      });
      return;
    }
    navigate('/messages');
  };

  // Create a profile event for zapping
  const profileEvent = useMemo((): Event | null => {
    if (!profileData?.event) return null;
    
    return {
      id: profileData.event.id,
      pubkey: profileData.event.pubkey,
      created_at: profileData.event.created_at,
      kind: profileData.event.kind,
      tags: profileData.event.tags,
      content: profileData.event.content,
      sig: profileData.event.sig,
    };
  }, [profileData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Banner */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {banner && (
          <img
            src={banner}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-20 relative z-10">
        <div>
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="mb-4 hover:bg-background/80 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Card className="border-border/50 dark:border-transparent shadow-lg">
              <CardContent className="pt-6">
                {isLoadingProfile ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-24 w-24 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                          <AvatarImage src={profileImage} alt={displayName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-3xl">
                            {displayName[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2 flex-wrap">
                          <div>
                            <h1 className="text-2xl font-bold">{displayName}</h1>
                            {metadata?.display_name && metadata?.name && metadata.display_name !== metadata.name && (
                              <p className="text-sm text-muted-foreground">@{metadata.name}</p>
                            )}
                          </div>
                          {nip05 && (
                            <Badge variant="secondary" className="gap-1 mt-1 bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="text-xs">{nip05}</span>
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">@{username}</p>

                        {/* Follower/Following Stats */}
                        <div className="flex items-center gap-4 mb-4">
                          <button
                            onClick={handleOpenFollowers}
                            className="text-sm hover:underline cursor-pointer group"
                          >
                            <span className="font-semibold group-hover:text-primary transition-colors">
                              {isLoadingStats ? '...' : followersCount}
                            </span>{' '}
                            <span className="text-muted-foreground">
                              {followersCount === 1 ? 'Follower' : 'Followers'}
                            </span>
                          </button>
                          <button
                            onClick={handleOpenFollowing}
                            className="text-sm hover:underline cursor-pointer group"
                          >
                            <span className="font-semibold group-hover:text-primary transition-colors">
                              {isLoadingStats ? '...' : followingCount}
                            </span>{' '}
                            <span className="text-muted-foreground">Following</span>
                          </button>
                        </div>
                        
                        {bio && (
                          <p className="text-sm mb-4 whitespace-pre-wrap break-words leading-relaxed">{bio}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          {website && (
                            <a
                              href={website.startsWith('http') ? website : `https://${website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <LinkIcon className="h-4 w-4" />
                              <span className="truncate max-w-xs">{website.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                          
                          {(lud16 || lud06) && (
                            <button
                              onClick={() => copyToClipboard(lud16 || lud06 || '', 'Lightning address')}
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-yellow-500 transition-colors group cursor-pointer"
                              title="Click to copy Lightning address"
                            >
                              <Zap className="h-4 w-4 text-yellow-500" />
                              <span className="truncate max-w-xs font-mono text-xs">
                                {lud16 || lud06}
                              </span>
                              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>
                        
                        {/* Nostr Address */}
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <button
                            onClick={() => copyToClipboard(npub, 'Nostr public key')}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group cursor-pointer w-full"
                            title="Click to copy public key"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <code className="bg-muted px-2 py-1 rounded font-mono truncate flex-1 text-left group-hover:bg-muted/80">
                              {npub}
                            </code>
                            <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[160px]">
                        {isOwnProfile ? (
                          <Button
                            onClick={() => setEditProfileOpen(true)}
                            variant="outline"
                            className="gap-2 w-full"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Profile
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={handleSendDM}
                              variant="default"
                              className="gap-2 w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Send Message
                            </Button>
                            {(lud16 || lud06) && profileEvent && user && (
                              <ZapDialog target={profileEvent}>
                                <Button
                                  variant="outline"
                                  className="gap-2 w-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 border-yellow-500/20 hover:border-yellow-500/40"
                                >
                                  <Zap className="h-4 w-4 text-yellow-500" />
                                  Zap Sats
                                </Button>
                              </ZapDialog>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap px-2">
              <h2 className="text-xl font-semibold">Posts</h2>
              <div className="flex items-center gap-2">
                <ColorThemeSelector />
                <ColumnSelector columns={columns} onColumnsChange={setColumns} />
              </div>
            </div>
            {isLoadingPosts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : posts && posts.length > 0 ? (
              <MasonryGrid posts={posts} columns={columns} onPostClick={handlePostClick} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 px-8 text-center">
                  <p className="text-muted-foreground">No posts yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Post Detail Dialog */}
      <PostDetailDialog
        event={selectedPost}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <EditProfileForm onSuccess={() => setEditProfileOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Follow List Dialog */}
      <FollowListDialog
        pubkey={pubkey}
        open={followListOpen}
        onOpenChange={setFollowListOpen}
        defaultTab={followListTab}
      />
    </div>
  );
}
