import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { genUserName } from '@/lib/genUserName';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function ComposePost() {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [content, setContent] = useState('');

  const displayName = user?.metadata?.display_name || user?.metadata?.name || genUserName(user?.pubkey || '');
  const profileImage = user?.metadata?.picture;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: 'Empty post',
        description: 'Please write something before posting.',
        variant: 'destructive',
      });
      return;
    }

    createEvent(
      { kind: 1, content: content.trim() },
      {
        onSuccess: () => {
          setContent('');
          toast({
            title: 'Post published!',
            description: 'Your post has been shared with the network.',
          });
        },
        onError: () => {
          toast({
            title: 'Failed to publish',
            description: 'There was an error publishing your post. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!user) return null;

  return (
    <Card className="border-border/50 dark:border-transparent shadow-md bg-gradient-to-br from-card via-rose-50/30 to-pink-50/20 dark:from-card dark:via-card dark:to-card">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-background shrink-0">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none border-border/50 focus-visible:ring-primary/50"
                disabled={isPending}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isPending || !content.trim()}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
                >
                  {isPending ? (
                    <>Publishing...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
