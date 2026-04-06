/**
 * ProfileBadges — NIP-58 badge display for profile pages.
 *
 * Shows the badges a user has chosen to display (kind 10008), fetching
 * the badge definitions (kind 30009) to get names, images, and descriptions.
 *
 * Each badge is rendered as a thumbnail with a tooltip on hover/tap showing
 * the full name and description. Clicking opens a larger image in a dialog.
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
            className="group relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-background hover:ring-primary/40 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={badge.name}
          >
            {badge.thumb && !imgError ? (
              <img
                src={badge.thumb}
                alt={badge.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              /* Fallback icon when no image or image fails to load */
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[180px] text-center">
          <p className="font-semibold text-xs">{badge.name}</p>
          {badge.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{badge.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProfileBadges({ pubkey }: ProfileBadgesProps) {
  const { data: badges, isLoading } = useProfileBadges(pubkey);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/50">
        <Award className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!badges || badges.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 pt-3 mt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Award className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Badges</span>
        </div>

        {/* Badge thumbnails — overlapping stack */}
        <div className="flex items-center">
          {badges.map((badge, i) => (
            <div
              key={`${badge.issuerPubkey}:${badge.dTag}`}
              className="relative"
              style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: badges.length - i }}
            >
              <BadgeThumbnail badge={badge} onClick={setSelectedBadge} />
            </div>
          ))}
        </div>

        <span className="text-xs text-muted-foreground">
          {badges.length} {badges.length === 1 ? 'badge' : 'badges'}
        </span>
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
