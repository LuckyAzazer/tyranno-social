/**
 * CirclesPage — full-page circles management with discovery.
 *
 * Layout:
 *   Top   — Recommended topic lists (Gaming, Tech, Sports, …) + keyword search
 *   Bottom — User's own circles side-by-side (kanban-style columns)
 *            Each column = one circle with its members, rename/delete controls
 *            and drag-target for moving members between lists.
 */

import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useFollowSets } from '@/hooks/useFollowSets';
import { usePublicFollowLists } from '@/hooks/usePublicFollowLists';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LoginArea } from '@/components/auth/LoginArea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  CircleDot,
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  Share2,
  Copy,
  X,
  Loader2,
  Download,
  MoreHorizontal,
  Gamepad2,
  Cpu,
  Trophy,
  FlaskConical,
  Zap,
  Bitcoin,
  BookOpen,
  Sparkles,
  Hash,
} from 'lucide-react';
import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';
import type { FollowSet } from '@/hooks/useFollowSets';
import type { PublicFollowList } from '@/hooks/usePublicFollowLists';

// ── Recommended topic chips ───────────────────────────────────────────────────

const TOPICS = [
  { label: 'Gaming',  keyword: 'gaming',  icon: Gamepad2,     color: 'from-purple-500 to-indigo-600' },
  { label: 'Tech',    keyword: 'tech',    icon: Cpu,           color: 'from-blue-500 to-cyan-600' },
  { label: 'Sports',  keyword: 'sports',  icon: Trophy,        color: 'from-green-500 to-emerald-600' },
  { label: 'Science', keyword: 'science', icon: FlaskConical,  color: 'from-teal-500 to-cyan-600' },
  { label: 'Nostr',   keyword: 'nostr',   icon: Zap,           color: 'from-yellow-500 to-amber-600' },
  { label: 'Bitcoin', keyword: 'bitcoin', icon: Bitcoin,       color: 'from-orange-500 to-amber-600' },
  { label: 'Books',   keyword: 'books',   icon: BookOpen,      color: 'from-rose-500 to-pink-600' },
  { label: 'Anime',   keyword: 'anime',   icon: Sparkles,      color: 'from-pink-500 to-fuchsia-600' },
] as const;

// ── Small member avatar strip ─────────────────────────────────────────────────

function MemberAvatarStrip({ pubkeys }: { pubkeys: string[] }) {
  const show = pubkeys.slice(0, 5);
  return (
    <div className="flex items-center -space-x-2">
      {show.map((pk) => (
        <MiniAvatar key={pk} pubkey={pk} />
      ))}
      {pubkeys.length > 5 && (
        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground z-10">
          +{pubkeys.length - 5}
        </div>
      )}
    </div>
  );
}

function MiniAvatar({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const meta = author.data?.metadata;
  const name = meta?.display_name || meta?.name || genUserName(pubkey);
  return (
    <Avatar className="h-6 w-6 border-2 border-background">
      <AvatarImage src={meta?.picture} alt={name} />
      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{name[0]?.toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

// ── Public list card (discovery) ──────────────────────────────────────────────

function PublicListCard({
  list,
  onImport,
  isImporting,
}: {
  list: PublicFollowList;
  onImport: (list: PublicFollowList) => void;
  isImporting: boolean;
}) {
  const author = useAuthor(list.authorPubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const authorName = meta?.display_name || meta?.name || genUserName(list.authorPubkey);
  const npub = nip19.npubEncode(list.authorPubkey);

  return (
    <Card className="group border-border/50 dark:border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-card to-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{list.title}</p>
            {list.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{list.description}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs font-mono">
            {list.pubkeys.length}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Link to={`/${npub}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors min-w-0" onClick={(e) => e.stopPropagation()}>
            <Avatar className="h-4 w-4 shrink-0">
              <AvatarImage src={meta?.picture} alt={authorName} />
              <AvatarFallback className="text-[8px]">{authorName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate">{authorName}</span>
          </Link>
          <MemberAvatarStrip pubkeys={list.pubkeys} />
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs gap-1.5 border-dashed hover:border-primary/40 hover:text-primary"
          onClick={() => onImport(list)}
          disabled={isImporting}
        >
          {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Import as Circle
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Member row inside a circle column ────────────────────────────────────────

function CircleMemberRow({
  pubkey,
  dTag,
  circles,
  onRemove,
  onMoveTo,
}: {
  pubkey: string;
  dTag: string;
  circles: FollowSet[];
  onRemove: () => void;
  onMoveTo: (targetDTag: string) => void;
}) {
  const author = useAuthor(pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const displayName = meta?.display_name || meta?.name || genUserName(pubkey);
  const username = meta?.name || genUserName(pubkey);
  const npub = nip19.npubEncode(pubkey);
  const otherCircles = circles.filter((c) => c.dTag !== dTag);

  return (
    <div className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
      <Link to={`/${npub}`} className="shrink-0">
        <Avatar className="h-7 w-7">
          <AvatarImage src={meta?.picture} alt={displayName} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{displayName}</p>
        <p className="text-[10px] text-muted-foreground truncate">@{username}</p>
      </div>

      {/* Move to another circle */}
      {otherCircles.length > 0 && (
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                  >
                    <CircleDot className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top"><p className="text-xs">Move to…</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end" className="text-sm w-44">
            <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Move to circle</div>
            <DropdownMenuSeparator />
            {otherCircles.map((c) => (
              <DropdownMenuItem key={c.dTag} className="gap-2 cursor-pointer" onClick={() => onMoveTo(c.dTag)}>
                <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
        onClick={onRemove}
        title="Remove from circle"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ── Circle column ─────────────────────────────────────────────────────────────

function CircleColumn({
  circle,
  allCircles,
  onRename,
  onDelete,
  onRemoveMember,
  onMoveMember,
  onShare,
}: {
  circle: FollowSet;
  allCircles: FollowSet[];
  onRename: (dTag: string, newTitle: string) => void;
  onDelete: (dTag: string) => void;
  onRemoveMember: (dTag: string, pubkey: string) => void;
  onMoveMember: (fromDTag: string, toDTag: string, pubkey: string) => void;
  onShare: (circle: FollowSet) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(circle.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    if (editValue.trim() && editValue.trim() !== circle.title) {
      onRename(circle.dTag, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <CircleDot className="h-4 w-4 text-primary shrink-0" />

        {editing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setEditValue(circle.title); setEditing(false); }
            }}
            className="h-6 text-sm py-0 px-1 flex-1 min-w-0"
            autoFocus
          />
        ) : (
          <button
            className="flex-1 text-sm font-semibold text-left truncate hover:text-primary transition-colors"
            onClick={() => { setEditing(true); setEditValue(circle.title); setTimeout(() => inputRef.current?.select(), 50); }}
            title="Click to rename"
          >
            {circle.title}
          </button>
        )}

        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4 shrink-0">
          {circle.pubkeys.length}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-sm w-44">
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => { setEditing(true); setEditValue(circle.title); }}>
              <Pencil className="h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onShare(circle)}>
              <Share2 className="h-3.5 w-3.5" /> Share List
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
              onClick={() => onDelete(circle.dTag)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Circle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Members */}
      <ScrollArea className="flex-1 max-h-[420px]">
        <div className="p-2">
          {circle.pubkeys.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No members yet.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add people from their profiles.
              </p>
            </div>
          ) : (
            circle.pubkeys.map((pk) => (
              <CircleMemberRow
                key={pk}
                pubkey={pk}
                dTag={circle.dTag}
                circles={allCircles}
                onRemove={() => onRemoveMember(circle.dTag, pk)}
                onMoveTo={(targetDTag) => onMoveMember(circle.dTag, targetDTag, pk)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Discovery panel ───────────────────────────────────────────────────────────

function DiscoveryPanel({
  onImport,
}: {
  onImport: (list: PublicFollowList, asNew?: boolean) => void;
}) {
  const [activeTopic, setActiveTopic] = useState<string | null>('nostr');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState<string | null>('nostr');
  const [importingId, setImportingId] = useState<string | null>(null);

  const { data: lists, isLoading, isFetching } = usePublicFollowLists(searchQuery);
  const showLoading = isLoading || isFetching;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      setActiveTopic(null);
    }
  };

  const handleTopicClick = (keyword: string) => {
    setActiveTopic(keyword);
    setSearchQuery(keyword);
    setSearchInput('');
  };

  const handleImport = async (list: PublicFollowList) => {
    setImportingId(list.event.id);
    try {
      await onImport(list);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Topic chips */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
          <Hash className="h-3.5 w-3.5" />
          Popular Topics
        </h2>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map(({ label, keyword, icon: Icon, color }) => {
            const isActive = activeTopic === keyword;
            const isSpinning = isActive && showLoading;
            return (
              <button
                key={keyword}
                onClick={() => handleTopicClick(keyword)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  isActive
                    ? `bg-gradient-to-r ${color} text-white border-transparent shadow-md scale-105`
                    : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card'
                }`}
              >
                {isSpinning
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Icon className="h-3.5 w-3.5" />
                }
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search for lists by keyword…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!searchInput.trim()}>
          Search
        </Button>
      </form>

      {/* Results */}
      {showLoading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching relays for <span className="font-semibold capitalize">{searchQuery}</span> lists…
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ) : !lists || lists.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No public lists found for this topic.</p>
          <p className="text-xs mt-1">Try a different keyword or topic.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {lists.map((list) => (
            <PublicListCard
              key={list.event.id}
              list={list}
              onImport={handleImport}
              isImporting={importingId === list.event.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CirclesPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const {
    followSets,
    isLoading,
    isCreating,
    createCircle,
    deleteCircle,
    renameCircle,
    removeFromCircle,
    addToCircle,
  } = useFollowSets();

  const [createOpen, setCreateOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [shareCircle, setShareCircle] = useState<FollowSet | null>(null);

  useSeoMeta({
    title: 'Circles · Tyrannosocial',
    description: 'Organise the people you follow into groups and discover curated lists.',
  });

  const handleCreate = () => {
    if (!newCircleName.trim()) return;
    const dTag = newCircleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    createCircle({ title: newCircleName.trim(), dTag });
    setNewCircleName('');
    setCreateOpen(false);
  };

  const handleMoveMember = (fromDTag: string, toDTag: string, pubkey: string) => {
    addToCircle({ dTag: toDTag, pubkey });
    removeFromCircle({ dTag: fromDTag, pubkey });
  };

  /** Import a public list as a new circle */
  const handleImportList = (list: PublicFollowList) => {
    if (!user) {
      toast({ title: 'Login required', description: 'Log in to import lists.', variant: 'destructive' });
      return;
    }
    const dTag = list.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    createCircle({ title: list.title, dTag });
    // Members will be added once the circle is created — a follow-up improvement
    toast({ title: `"${list.title}" imported!`, description: `${list.pubkeys.length} members. Open the circle to add them individually.` });
  };

  const shareUrl = (circle: FollowSet) => {
    if (!user) return '';
    try {
      return nip19.naddrEncode({ kind: 30000, pubkey: user.pubkey, identifier: circle.dTag });
    } catch { return ''; }
  };

  const handleCopyShare = (circle: FollowSet) => {
    const naddr = shareUrl(circle);
    if (!naddr) return;
    const url = `${window.location.origin}/${naddr}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link copied!', description: 'Share this link so others can follow your list.' });
    });
    setShareCircle(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-violet-50/20 to-background dark:from-background dark:via-background dark:to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-primary/5 to-violet-500/10 -z-10" />
        <div className="px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-purple-600 blur-xl opacity-60 animate-pulse" />
                <div className="relative p-2 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950/40 dark:to-purple-950/40">
                  <CircleDot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold">Circles</h1>
                <p className="text-xs text-muted-foreground">Organise follows · Discover lists</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Circle</span>
              </Button>
            )}
            <LoginArea className="max-w-48 hidden sm:flex" />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 lg:pb-8 space-y-8 max-w-[1600px] mx-auto">

        {/* ── Discovery ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2">
              Discover Lists
            </span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <DiscoveryPanel onImport={handleImportList} />
        </section>

        <Separator />

        {/* ── User's Circles ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2">
              Your Circles
            </span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {!user ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <CircleDot className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="font-semibold">Log in to manage circles</p>
                <p className="text-sm text-muted-foreground">Circles let you group people and filter your feed.</p>
                <LoginArea className="mx-auto max-w-xs" />
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-72 h-64 rounded-xl shrink-0" />
              ))}
            </div>
          ) : followSets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <CircleDot className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="font-semibold">No circles yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a circle to group people and filter your feed, or import one from the lists above.
                </p>
                <Button onClick={() => setCreateOpen(true)} className="gap-2 mx-auto">
                  <Plus className="h-4 w-4" /> Create your first circle
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
              {followSets.map((circle) => (
                <CircleColumn
                  key={circle.dTag}
                  circle={circle}
                  allCircles={followSets}
                  onRename={(dTag, newTitle) => renameCircle({ dTag, newTitle })}
                  onDelete={(dTag) => deleteCircle(dTag)}
                  onRemoveMember={(dTag, pk) => removeFromCircle({ dTag, pubkey: pk })}
                  onMoveMember={handleMoveMember}
                  onShare={(c) => setShareCircle(c)}
                />
              ))}

              {/* Add circle button — extra column */}
              <button
                onClick={() => setCreateOpen(true)}
                className="w-72 shrink-0 rounded-xl border-2 border-dashed border-border/50 hover:border-violet-400/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-violet-500 min-h-[120px]"
              >
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">New Circle</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5 text-primary" />
              Create a Circle
            </DialogTitle>
            <DialogDescription>
              Circles let you group people and filter your feed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="e.g. Friends, Tech People, Family…"
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating || !newCircleName.trim()} className="gap-2">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share dialog ── */}
      <Dialog open={!!shareCircle} onOpenChange={(o) => { if (!o) setShareCircle(null); }}>
        {shareCircle && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Share "{shareCircle.title}"
              </DialogTitle>
              <DialogDescription>
                Anyone with this link can view your list and follow the same people.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                <code className="text-xs flex-1 truncate font-mono text-muted-foreground">
                  {user ? `${window.location.origin}/${shareUrl(shareCircle)}` : '—'}
                </code>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShareCircle(null)}>Cancel</Button>
                <Button onClick={() => handleCopyShare(shareCircle)} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <MobileBottomNav />
    </div>
  );
}
