import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        <Input
          type="text"
          placeholder="Search posts across all relays..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-11 pr-10 h-12 bg-background/80 backdrop-blur-md border-2 border-primary/30 focus-visible:ring-primary focus-visible:border-primary font-medium text-base shadow-sm"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50 rounded-full"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-12 px-6 gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-lg font-bold text-base"
        disabled={!query.trim()}
      >
        <Search className="h-5 w-5" />
        <span className="hidden sm:inline">Search</span>
      </Button>
    </form>
  );
}
