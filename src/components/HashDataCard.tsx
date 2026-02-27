import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hash, Copy, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';

interface HashDataCardProps {
  content: string;
}

export function HashDataCard({ content }: HashDataCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  // Clean the content - remove whitespace and newlines
  const cleanContent = content.replace(/\s+/g, '');

  // Detect what type of hash data this might be
  const isHex = /^[a-fA-F0-9]+$/.test(cleanContent);
  const length = cleanContent.length;

  // Common hash lengths
  let hashType = 'Data';
  if (length === 64) hashType = 'SHA-256';
  else if (length === 128) hashType = 'SHA-512';
  else if (length === 40) hashType = 'SHA-1';
  else if (length === 32) hashType = 'MD5';
  else if (length % 64 === 0) hashType = `${length / 2} bytes`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(cleanContent);
      toast({
        title: 'Copied!',
        description: 'Hash data copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Format the hash for display
  const formatHash = (hash: string, expanded: boolean) => {
    if (expanded) {
      // Show full hash broken into lines of 64 chars
      const lines = [];
      for (let i = 0; i < hash.length; i += 64) {
        lines.push(hash.substring(i, i + 64));
      }
      return lines.join('\n');
    } else {
      // Show truncated version
      if (hash.length <= 80) return hash;
      return `${hash.substring(0, 40)}...${hash.substring(hash.length - 40)}`;
    }
  };

  return (
    <Card className="overflow-hidden border-border/50 dark:border-transparent bg-gradient-to-br from-card via-card to-slate-50/20 dark:from-card dark:via-card dark:to-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {isHex ? 'Hexadecimal Data' : 'Hash Data'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {hashType}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              {length} chars
            </Badge>
          </div>
        </div>

        <div className="relative">
          <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
            {formatHash(cleanContent, isExpanded)}
          </pre>
          {!isExpanded && cleanContent.length > 80 && (
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
            className="gap-2 flex-1"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          {cleanContent.length > 80 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="gap-2 flex-1"
            >
              {isExpanded ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  Collapse
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  Expand
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This appears to be cryptographic hash data or a blockchain identifier.
        </p>
      </CardContent>
    </Card>
  );
}
