import { useState } from 'react';
import { AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

interface ContentWarningWrapperProps {
  event: NostrEvent;
  children: React.ReactNode;
  /** Only hide media, always show text content */
  mediaOnly?: boolean;
}

export function ContentWarningWrapper({ event, children, mediaOnly = false }: ContentWarningWrapperProps) {
  const { config } = useAppContext();
  const [showContent, setShowContent] = useState(false);

  // Check if event has content warning
  const contentWarningTag = event.tags.find(([name]) => name === 'content-warning');
  const warningText = contentWarningTag?.[1] || 'Sensitive Content';

  // If no content warning tag, or user has warnings disabled, show content normally
  if (!contentWarningTag || !config.showContentWarnings) {
    return <>{children}</>;
  }

  // If user has manually revealed this content, show it
  if (showContent) {
    return (
      <div className="space-y-3">
        <Badge variant="secondary" className="gap-2 bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/30">
          <AlertTriangle className="h-3 w-3" />
          {warningText}
        </Badge>
        {children}
      </div>
    );
  }

  // Show warning overlay
  return (
    <div className="relative">
      {/* Show warning badge */}
      <Badge variant="destructive" className="gap-2 mb-3 bg-orange-500 hover:bg-orange-600">
        <AlertTriangle className="h-3 w-3" />
        {warningText}
      </Badge>

      {/* Blurred/hidden content */}
      <div className="relative">
        <div className={mediaOnly ? '' : 'blur-md pointer-events-none select-none'}>
          {children}
        </div>
        
        {/* Overlay with show button */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Button
            onClick={() => setShowContent(true)}
            className="gap-2 shadow-lg"
          >
            <Eye className="h-4 w-4" />
            Show Content
          </Button>
        </div>
      </div>
    </div>
  );
}
