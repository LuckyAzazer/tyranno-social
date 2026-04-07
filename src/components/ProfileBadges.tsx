/**
 * ProfileBadges — NIP-58 badge display for profile pages.
 *
 * Always renders a "Badges" section. Shows:
 *   - Skeletons while loading
 *   - Badge chips when the user has badges
 *   - An empty-state prompt when they have none
 *
 * Clicking a badge chip opens a detail dialog with the full image.
 */

import { useState } from 'react';
import { useProfileBadges } from '@/hooks/useProfileBadges';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award } from 'lucide-react';
import type { BadgeDefinition } from '@/hooks/useProfileBadges';

interface ProfileBadgesProps {
  pubkey: string;
}

function BadgeThumbnail({
  badge,
  onClick,
}: {
  badge: BadgeDefinition;
  onClick: (badge: BadgeDefinition) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onClick(badge)}
            className="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={badge.name}
          >
            {/* Badge image */}
            <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
              {badge.thumb && !imgError ? (
                <img
                  src={badge.thumb}
                  alt={badge.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                  <Award className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
            {/* Badge name */}
            <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors max-w-[100px] truncate leading-tight">
              {badge.name}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          <p className="font-semibold text-xs">{badge.name}</p>
          {badge.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{badge.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProfileBadges({ pubkey }: ProfileBadgesProps) {
  const { data: badges, isLoading } = useProfileBadges(pubkey);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  return (
    <>
      <div className="mt-4 pt-4 border-t border-border/50 space-y-3">

        {/* Section header */}
        <div className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Badges
          </span>
          {!isLoading && badges && badges.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
              {badges.length}
            </span>
          )}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-xl" />
            ))}
          </div>
        )}

        {/* Badge chips */}
        {!isLoading && badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <BadgeThumbnail
                key={`${badge.issuerPubkey}:${badge.dTag}`}
                badge={badge}
                onClick={setSelectedBadge}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!badges || badges.length === 0) && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-border/60 bg-muted/30">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted shrink-0">
              <Award className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              No badges collected yet
            </p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={(open) => { if (!open) setSelectedBadge(null); }}>
        {selectedBadge && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {selectedBadge.name}
              </DialogTitle>
              {selectedBadge.description && (
                <DialogDescription>{selectedBadge.description}</DialogDescription>
              )}
            </DialogHeader>

            {selectedBadge.image && (
              <div className="flex justify-center py-2">
                <img
                  src={selectedBadge.image}
                  alt={selectedBadge.name}
                  className="h-48 w-48 object-contain rounded-xl shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Issued by{' '}
              <code className="font-mono bg-muted px-1 rounded">
                {selectedBadge.issuerPubkey.slice(0, 12)}…
              </code>
            </p>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
