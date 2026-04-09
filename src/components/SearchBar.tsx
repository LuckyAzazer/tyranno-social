import { useState, useRef, useEffect } from 'react';
import { Search, X, User, AtSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchUsers } from '@/hooks/useSearchUsers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

/** Detect if the input looks like a direct npub / nostr URI / hex pubkey */
function looksLikePubkey(s: string): boolean {
  const cleaned = s.trim().replace(/^nostr:/, '');
  return (
    cleaned.startsWith('npub1') ||
    cleaned.startsWith('nprofile1') ||
    /^[0-9a-f]{64}$/i.test(cleaned)
  );
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Only run user search when focused and query is non-empty
  const { data: userResults = [], isFetching: isSearchingUsers } = useSearchUsers(
    focused && query.trim().length > 1 ? query : ''
  );

  const showDropdown = dropdownOpen && focused && query.trim().length > 1 && userResults.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Open dropdown as results arrive
  useEffect(() => {
    if (userResults.length > 0) setDropdownOpen(true);
  }, [userResults.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDropdownOpen(false);

    // If it looks like a pubkey / npub, navigate straight to their profile
    if (looksLikePubkey(query)) {
      const cleaned = query.trim().replace(/^nostr:/, '');
      try {
        // Already an npub — navigate directly
        if (cleaned.startsWith('npub1') || cleaned.startsWith('nprofile1')) {
          navigate(`/${cleaned}`);
          setQuery('');
          return;
        }
        // Hex pubkey — encode to npub first
        if (/^[0-9a-f]{64}$/i.test(cleaned)) {
          const npub = nip19.npubEncode(cleaned.toLowerCase());
          navigate(`/${npub}`);
          setQuery('');
          return;
        }
      } catch { /* fall through to normal search */ }
    }

    onSearch(query);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleUserClick = (npub: string) => {
    setDropdownOpen(false);
    setQuery('');
    onSearch('');
    navigate(`/${npub}`);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'flex items-center gap-2 px-4 h-11 rounded-full border-2 bg-background transition-all duration-200',
            focused
              ? 'border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]'
              : 'border-border/60 hover:border-border',
            showDropdown && 'rounded-b-none border-b-0 rounded-t-2xl'
          )}
        >
          {/* npub indicator badge */}
          {looksLikePubkey(query) && (
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              <AtSign className="h-2.5 w-2.5" />
              npub
            </span>
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posts, @users, npub1..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
            onFocus={() => { setFocused(true); if (query.trim().length > 1) setDropdownOpen(true); }}
            onBlur={() => setFocused(false)}
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
          />

          {/* Loading spinner when searching users */}
          {isSearchingUsers && query.trim().length > 1 && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground animate-spin" />
          )}

          {/* Clear button */}
          {query && !isSearchingUsers && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Search icon */}
          <button
            type="submit"
            className={cn(
              'shrink-0 transition-colors',
              query.trim() ? 'text-primary hover:text-primary/80' : 'text-muted-foreground'
            )}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* ── User results dropdown ────────────────────────────────────────── */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 bg-background border-2 border-primary border-t-0 rounded-b-2xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <User className="h-2.5 w-2.5" /> People
            </p>
          </div>
          {userResults.slice(0, 8).map((u) => (
            <button
              key={u.pubkey}
              onMouseDown={(e) => { e.preventDefault(); handleUserClick(u.npub); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={u.metadata.picture} alt={u.metadata.name} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(u.metadata.display_name || u.metadata.name || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {u.metadata.display_name || u.metadata.name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.metadata.nip05 || `${u.npub.slice(0, 12)}...${u.npub.slice(-6)}`}
                </p>
              </div>
              {u.metadata.nip05 && (
                <span className="shrink-0 text-[9px] text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  ✓ NIP-05
                </span>
              )}
            </button>
          ))}
          {/* Hint to search posts too */}
          <div className="px-3 py-2 border-t border-border/40 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 rounded bg-border text-[10px] font-mono">Enter</kbd> to search posts
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
