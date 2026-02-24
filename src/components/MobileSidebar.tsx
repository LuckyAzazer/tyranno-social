import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RelayListManager } from '@/components/RelayListManager';
import {
  Moon,
  Sun,
  Wifi,
  Bell,
  Bookmark,
  FileText,
  Image,
  Music,
  Video,
  Hash,
  ChevronRight,
  Menu,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FeedCategory } from '@/hooks/usePosts';

interface MobileSidebarProps {
  selectedCategory: FeedCategory;
  onCategoryChange: (category: FeedCategory) => void;
}

export function MobileSidebar({ selectedCategory, onCategoryChange }: MobileSidebarProps) {
  const { theme, setTheme } = useTheme();
  const { config } = useAppContext();
  const [open, setOpen] = useState(false);

  const isDark = theme === 'dark';

  const categories: Array<{ id: FeedCategory; label: string; icon: typeof FileText }> = [
    { id: 'all', label: 'All Posts', icon: Hash },
    { id: 'text', label: 'Text Notes', icon: FileText },
    { id: 'articles', label: 'Articles', icon: FileText },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'videos', label: 'Videos', icon: Video },
  ];

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const handleCategoryChange = (category: FeedCategory) => {
    onCategoryChange(category);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Customize your feed and settings</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="categories" className="flex-1 flex flex-col">
            <TabsList className="mx-6 grid w-auto grid-cols-4 mb-4">
              <TabsTrigger value="categories">
                <Hash className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="relays">
                <Wifi className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="bookmarks">
                <Bookmark className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6">
              <TabsContent value="categories" className="space-y-4 mt-0">
                <div>
                  <h3 className="font-semibold mb-3">Feed Categories</h3>
                  <div className="space-y-1">
                    {categories.map((category) => {
                      const Icon = category.icon;
                      const isActive = selectedCategory === category.id;

                      return (
                        <Button
                          key={category.id}
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={`w-full justify-start ${
                            isActive
                              ? 'bg-primary/10 text-primary hover:bg-primary/20'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleCategoryChange(category.id)}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {category.label}
                          {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Theme</h3>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {isDark ? (
                        <Moon className="h-5 w-5 text-primary" />
                      ) : (
                        <Sun className="h-5 w-5 text-primary" />
                      )}
                      <Label htmlFor="mobile-theme-toggle" className="cursor-pointer font-medium">
                        {isDark ? 'Dark Mode' : 'Light Mode'}
                      </Label>
                    </div>
                    <Switch
                      id="mobile-theme-toggle"
                      checked={isDark}
                      onCheckedChange={toggleTheme}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="relays" className="space-y-4 mt-0">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Connected Relays</h3>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {config.relayMetadata.relays.length}
                    </Badge>
                  </div>
                  <RelayListManager />
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4 mt-0">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground">
                      You'll see mentions and replies here
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bookmarks" className="space-y-4 mt-0">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No bookmarks yet</p>
                    <p className="text-xs text-muted-foreground">
                      Save posts to read them later
                    </p>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
