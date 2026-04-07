import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useProfile, useUserPosts } from '@/hooks/useProfile';
import { useFollowStats } from '@/hooks/useFollowers';
import { usePinnedPost } from '@/hooks/usePinnedPost';
import { useEventById } from '@/hooks/useEventById';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFloatingDM } from '@/contexts/FloatingDMContext';
import { useToast } from '@/hooks/useToast';
import { useIdentities } from '@/hooks/useIdentities';
import { MasonryGrid } from '@/components/MasonryGrid';
import { PostModal } from '@/components/PostModal';
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
import { ArrowLeft, Link as LinkIcon, Mail, Zap, CheckCircle2, Edit, Copy, MessageCircle, CircleDot, ChevronDown, Pin, Globe } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { FollowButton } from '@/components/FollowButton';
import { useFollowSets } from '@/hooks/useFollowSets';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { EditProfileForm } from '@/components/EditProfileForm';
import { ProfileBadges } from '@/components/ProfileBadges';
import type { NostrMetadata, NostrEvent } from '@nostrify/nostrify';
import { Badge } from '@/components/ui/badge';
import type { Event } from 'nostr-tools';

// ── Platform helpers ───────────────────────────────────────────────────────────

/**
 * Returns a small SVG icon (as JSX) for known social platforms.
 * Falls back to a generic link icon.
 */
function getPlatformIcon(platform: string): React.ReactNode {
  switch (platform) {
    case 'github':
      return <Github className="h-3.5 w-3.5 shrink-0" />;
    case 'twitter':
      return (
        // X / Twitter bird-ish icon via SVG
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'mastodon':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.327 8.566c0-4.339-2.843-5.61-2.843-5.61-1.433-.658-3.894-.935-6.451-.954h-.063c-2.557.019-5.016.296-6.449.954 0 0-2.843 1.271-2.843 5.61 0 .993-.019 2.181.012 3.441.103 4.243.778 8.425 4.701 9.463 1.809.479 3.362.579 4.612.51 2.268-.126 3.541-.809 3.541-.809l-.075-1.646s-1.621.511-3.441.449c-1.804-.062-3.707-.194-3.999-2.409a4.523 4.523 0 0 1-.04-.621s1.77.433 4.014.536c1.372.063 2.658-.08 3.965-.236 2.506-.299 4.688-1.843 4.962-3.254.434-2.223.398-5.424.398-5.424zm-3.353 5.59h-2.081V9.057c0-1.075-.452-1.62-1.357-1.62-1 0-1.501.647-1.501 1.927v2.791h-2.069V9.364c0-1.28-.501-1.927-1.502-1.927-.905 0-1.357.545-1.357 1.62v5.099H6.026V8.903c0-1.074.273-1.927.823-2.558.567-.631 1.307-.955 2.228-.955 1.065 0 1.872.409 2.405 1.228l.518.869.519-.869c.533-.819 1.34-1.228 2.405-1.228.92 0 1.66.324 2.228.955.549.631.822 1.484.822 2.558v5.253z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'twitch':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
        </svg>
      );
    case 'discord':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    default:
      return <LinkIcon className="h-3.5 w-3.5 shrink-0" />;
  }
}

// ──────────────────────────────────────────────────────────────────────────────

interface ProfilePageProps {
  pubkey: string;
}

export function ProfilePage({ pubkey }: ProfilePageProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { openConversation } = useFloatingDM();
  const { toast } = useToast();
  const [columns, setColumns] = useLocalStorage<number>('masonry-columns', 3);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<'followers' | 'following'>('followers');
  const { data: profileData, isLoading: isLoadingProfile } = useProfile(pubkey);
  const { data: posts, isLoading: isLoadingPosts } = useUserPosts(pubkey);
  const { followersCount, followingCount, isLoading: isLoadingStats } = useFollowStats(pubkey);

  // Check if this is the current user's own profile
  const isOwnProfile = user?.pubkey === pubkey;
  const { followSets, addToCircle, removeFromCircle } = useFollowSets();
  const { data: identities = [] } = useIdentities(pubkey);
  const { pinnedEventId } = usePinnedPost(pubkey);
  const { data: pinnedEvent } = useEventById(pinnedEventId ?? null);

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
    // Open the floating DM window for this user
    openConversation(pubkey);
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
                        
                        {/* Personal links: website + kind-0 links/fields + NIP-39 external identities + lightning */}
                        {(() => {
                          // Collect extra links from non-standard but widely-used kind-0 fields:
                          // 1. metadata.links — array of { label, url } objects (used by some clients incl. this one)
                          // 2. metadata.fields — array of [label, url] tuples (used by Amethyst etc.)
                          const meta = metadata as Record<string, unknown> | undefined;
                          const extraLinks: Array<{ label: string; url: string }> = [];

                          if (Array.isArray(meta?.links)) {
                            for (const l of meta.links as Array<{ label?: string; url?: string }>) {
                              if (l?.url) extraLinks.push({ label: l.label || l.url.replace(/^https?:\/\//, ''), url: l.url });
                            }
                          }
                          if (Array.isArray(meta?.fields)) {
                            for (const f of meta.fields as Array<[string?, string?]>) {
                              const [label, url] = f;
                              if (url && url.startsWith('http')) extraLinks.push({ label: label || url.replace(/^https?:\/\//, ''), url });
                            }
                          }

                          const hasContent = website || identities.length > 0 || extraLinks.length > 0 || lud16 || lud06;
                          if (!hasContent) return null;

                          return (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {website && (
                                <a
                                  href={website.startsWith('http') ? website : `https://${website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-foreground border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-150"
                                >
                                  <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                  <span className="truncate max-w-[160px]">{website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                </a>
                              )}

                              {/* Extra links from kind-0 metadata (links[] / fields[]) */}
                              {extraLinks.map((link, i) => (
                                <a
                                  key={`extra-${i}`}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-foreground border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-150"
                                >
                                  <LinkIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                  <span className="truncate max-w-[140px]">{link.label}</span>
                                </a>
                              ))}

                              {/* NIP-39 external identities (kind 10011) */}
                              {identities.map((id) => {
                                const icon = getPlatformIcon(id.platform);
                                const href = id.profileUrl;
                                const label = id.identity;
                                const chipClass = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 bg-white/10 text-foreground border-white/20 hover:bg-white/20 hover:border-white/30';
                                return href ? (
                                  <a
                                    key={id.raw}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`${id.platformLabel}: ${id.identity}`}
                                    className={chipClass}
                                  >
                                    {icon}
                                    <span className="truncate max-w-[120px]">{label}</span>
                                  </a>
                                ) : (
                                  <span
                                    key={id.raw}
                                    title={`${id.platformLabel}: ${id.identity}`}
                                    className={chipClass}
                                  >
                                    {icon}
                                    <span className="truncate max-w-[120px]">{label}</span>
                                  </span>
                                );
                              })}

                              {(lud16 || lud06) && (
                                <button
                                  onClick={() => copyToClipboard(lud16 || lud06 || '', 'Lightning address')}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-foreground border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-150 group cursor-pointer"
                                  title="Click to copy Lightning address"
                                >
                                  <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-400 opacity-80" />
                                  <span className="truncate max-w-[140px] font-mono">{lud16 || lud06}</span>
                                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* NIP-58 Badges */}
                        <ProfileBadges pubkey={pubkey} />

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
                            <FollowButton pubkey={pubkey} className="w-full justify-center" />
                            {/* Add to Circle */}
                            {user && followSets.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" className="gap-2 w-full">
                                    <CircleDot className="h-4 w-4 text-violet-500" />
                                    Add to Circle
                                    <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-auto" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  {followSets.map((set) => {
                                    const inCircle = set.pubkeys.includes(pubkey);
                                    return (
                                      <DropdownMenuItem
                                        key={set.dTag}
                                        className="gap-2 cursor-pointer"
                                        onClick={() => inCircle
                                          ? removeFromCircle({ dTag: set.dTag, pubkey })
                                          : addToCircle({ dTag: set.dTag, pubkey })}
                                      >
                                        <CircleDot className={`h-3.5 w-3.5 ${inCircle ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="flex-1">{set.title}</span>
                                        {inCircle && <span className="text-xs text-primary">✓</span>}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <Button
                              onClick={handleSendDM}
                              variant="outline"
                              className="gap-2 w-full"
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

          {/* Pinned Post */}
          {pinnedEvent && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 px-2 text-sm font-semibold text-muted-foreground">
                <Pin className="h-4 w-4 text-primary" />
                Pinned Post
              </div>
              <PostCard
                event={pinnedEvent}
                onClick={setSelectedPost}
              />
            </div>
          )}

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
              <MasonryGrid posts={posts} columns={columns} onPostClick={setSelectedPost} />
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

      {selectedPost && (
        <PostModal event={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

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
