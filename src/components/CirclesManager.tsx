/**
 * CirclesManager — Google+-style follow lists (Circles).
 * Rendered as a collapsible panel in the left sidebar.
 * Users can create circles, view members, and filter their feed.
 */

import { useState } from 'react';
import { useFollowSets } from '@/hooks/useFollowSets';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { FollowButton } from '@/components/FollowButton';
import { genUserName } from '@/lib/genUserName';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  CircleDot,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Loader2,
  X,
} from 'lucide-react';
import type { NostrMetadata } from '@nostrify/nostrify';

interface CirclesManagerProps {
  /** Called when user selects a circle to filter feed — passes pubkey array */
  onCircleSelect?: (pubkeys: string[] | null, label: string | null) => void;
  selectedCircleDTag?: string | null;
}

function CircleMemberRow({ pubkey, dTag, onRemove }: { pubkey: string; dTag: string; onRemove: () => void }) {
  const author = useAuthor(pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const displayName = meta?.display_name || meta?.name || genUserName(pubkey);
  const username = meta?.name || genUserName(pubkey);
  const npub = nip19.npubEncode(pubkey);

  return (
    <div className="flex items-center gap-2 py-1.5">
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
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
        onClick={onRemove}
        title="Remove from circle"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function CirclesManager({ onCircleSelect, selectedCircleDTag }: CirclesManagerProps) {
  const { user } = useCurrentUser();
  const { followSets, isLoading, isCreating, createCircle, deleteCircle, renameCircle, removeFromCircle } = useFollowSets();
  const [collapsed, setCollapsed] = useLocalStorage<boolean>('circles-collapsed', false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [expandedDTag, setExpandedDTag] = useState<string | null>(null);
  const [renamingDTag, setRenamingDTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (!user) return null;

  const handleCreate = () => {
    if (!newCircleName.trim()) return;
    const dTag = newCircleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    createCircle({ title: newCircleName.trim(), dTag });
    setNewCircleName('');
    setCreateOpen(false);
  };

  const handleRename = (dTag: string) => {
    if (!renameValue.trim()) return;
    renameCircle({ dTag, newTitle: renameValue.trim() });
    setRenamingDTag(null);
  };

  const handleSelectCircle = (dTag: string, pubkeys: string[], title: string) => {
    if (selectedCircleDTag === dTag) {
      onCircleSelect?.(null, null);
    } else {
      onCircleSelect?.(pubkeys, title);
    }
  };

  return (
    <>
      <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-violet-50/20 dark:from-card dark:to-card overflow-hidden">
        <CardHeader className="pb-3">
          <button
            className="flex items-center justify-between w-full group"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
          >
            <span className="text-base font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
              <CircleDot className="h-4 w-4 text-primary" />
              Circles
              {followSets.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {followSets.length}
                </Badge>
              )}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" tabIndex={-1}>
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </button>
        </CardHeader>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
          <CardContent className="pb-4 pt-0 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-lg" />
                ))}
              </div>
            ) : followSets.length === 0 ? (
              <div className="text-center py-3">
                <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
                <p className="text-xs text-muted-foreground">No circles yet.</p>
                <p className="text-xs text-muted-foreground">Create one to organize your follows.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {followSets.map((set) => (
                  <div key={set.dTag}>
                    <div
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors group cursor-pointer ${
                        selectedCircleDTag === set.dTag
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/60'
                      }`}
                    >
                      {/* Click label = filter feed */}
                      <button
                        className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                        onClick={() => handleSelectCircle(set.dTag, set.pubkeys, set.title)}
                      >
                        <CircleDot className={`h-3.5 w-3.5 shrink-0 ${selectedCircleDTag === set.dTag ? 'text-primary' : 'text-muted-foreground'}`} />
                        {renamingDTag === set.dTag ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(set.dTag); if (e.key === 'Escape') setRenamingDTag(null); }}
                            className="h-5 text-xs py-0 px-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium truncate">{set.title}</span>
                        )}
                      </button>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0 font-mono">
                        {set.pubkeys.length}
                      </Badge>
                      {/* Expand members */}
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => { e.stopPropagation(); setExpandedDTag(expandedDTag === set.dTag ? null : set.dTag); }}
                        title="View members"
                      >
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedDTag === set.dTag ? 'rotate-90' : ''}`} />
                      </button>
                      {/* Options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => { setRenamingDTag(set.dTag); setRenameValue(set.title); }}>
                            <Pencil className="h-3.5 w-3.5" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                            onClick={() => deleteCircle(set.dTag)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Expanded member list */}
                    {expandedDTag === set.dTag && set.pubkeys.length > 0 && (
                      <div className="ml-4 pl-3 border-l border-border/50 mt-1 mb-1">
                        <ScrollArea className="max-h-40">
                          {set.pubkeys.map((pk) => (
                            <CircleMemberRow
                              key={pk}
                              pubkey={pk}
                              dTag={set.dTag}
                              onRemove={() => removeFromCircle({ dTag: set.dTag, pubkey: pk })}
                            />
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                    {expandedDTag === set.dTag && set.pubkeys.length === 0 && (
                      <p className="text-xs text-muted-foreground ml-6 my-1">No members yet. Add people from their profiles.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Create new circle */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 mt-1 border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Circle
            </Button>
          </CardContent>
        </div>
      </Card>

      {/* Create Circle Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5 text-primary" />
              Create a Circle
            </DialogTitle>
            <DialogDescription>
              Circles let you group people and filter your feed — just like Google+.
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
    </>
  );
}
