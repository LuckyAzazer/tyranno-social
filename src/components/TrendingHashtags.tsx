/**
 * TrendingHashtags — a compact panel for the left sidebar showing
 * the most-used hashtags in the last 24 hours.
 *
 * Clicking a hashtag navigates to /hashtag/<tag>.
 * The panel is collapsible — state persisted in localStorage.
 */

import { useNavigate } from 'react-router-dom';
import { useTrendingHashtags } from '@/hooks/useTrendingHashtags';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Hash, Flame, ChevronDown, ChevronUp } from 'lucide-react';

export function TrendingHashtags() {
  const navigate = useNavigate();
  const { data: hashtags, isLoading } = useTrendingHashtags(12);
  const [collapsed, setCollapsed] = useLocalStorage<boolean>('sidebar-trending-collapsed', false);

  const maxCount = hashtags?.[0]?.count ?? 1;

  return (
    <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-rose-50/20 dark:from-card dark:to-card overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4">
        <button
          className="flex items-center justify-between w-full group"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand Trending Now' : 'Collapse Trending Now'}
        >
          <span className="text-base font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
            <div className="relative">
              <TrendingUp className="h-4 w-4 text-primary" />
              <Flame className="h-2.5 w-2.5 text-orange-500 absolute -top-1 -right-1" />
            </div>
            Trending Now
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none shrink-0"
            tabIndex={-1}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </button>
      </CardHeader>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <CardContent className="pb-4 pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : !hashtags || hashtags.length === 0 ? (
            <div className="text-center py-4">
              <Hash className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No trending hashtags yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {hashtags.map((item, index) => {
                const barWidth = Math.max(10, Math.round((item.count / maxCount) * 100));
                const isHot = index < 3;

                return (
                  <button
                    key={item.tag}
                    className="w-full text-left group rounded-lg px-2 py-1.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors relative overflow-hidden"
                    onClick={() => navigate(`/hashtag/${encodeURIComponent(item.tag)}`)}
                  >
                    {/* Background bar showing relative popularity */}
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/5 dark:bg-primary/8 rounded-lg transition-all group-hover:bg-primary/10 dark:group-hover:bg-primary/15"
                      style={{ width: `${barWidth}%` }}
                    />

                    <div className="relative flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-4 shrink-0 text-right">
                          {index + 1}
                        </span>
                        {isHot && (
                          <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                        )}
                        {!isHot && (
                          <Hash className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        )}
                        <span
                          className={`text-sm font-medium truncate group-hover:text-primary transition-colors ${
                            isHot ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 shrink-0 font-mono ${
                          isHot
                            ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50'
                            : 'dark:bg-card dark:text-muted-foreground dark:border-border/40'
                        }`}
                      >
                        {item.count >= 1000 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
