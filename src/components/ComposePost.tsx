import { useState, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { NoteContent } from '@/components/NoteContent';
import { MediaContent } from '@/components/MediaContent';
import { genUserName } from '@/lib/genUserName';
import { Send, Eye, ImagePlus, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

interface ComposePostProps {
  onPostPublished?: () => void;
}

export function ComposePost({ onPostPublished }: ComposePostProps = {}) {
  const { user, metadata } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<Array<{ url: string; type: string; hash?: string }>>([]);
  const [contentWarning, setContentWarning] = useState('');
  const [showContentWarning, setShowContentWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = metadata?.display_name || metadata?.name || genUserName(user?.pubkey || '');
  const username = metadata?.name || genUserName(user?.pubkey || '');
  const profileImage = metadata?.picture;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        // Upload file using Blossom
        const tags = await uploadFile(file);
        const urlTag = tags.find(([name]) => name === 'url');
        const mimeTypeTag = tags.find(([name]) => name === 'm');
        const hashTag = tags.find(([name]) => name === 'x');

        if (urlTag) {
          setAttachedMedia(prev => [...prev, {
            url: urlTag[1],
            type: mimeTypeTag?.[1] || file.type,
            hash: hashTag?.[1],
          }]);
        }
      } catch (error) {
        console.error('Failed to upload file:', error);
        toast({
          title: 'Upload failed',
          description: 'Failed to upload file. Please try again.',
          variant: 'destructive',
        });
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setAttachedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && attachedMedia.length === 0) {
      toast({
        title: 'Empty post',
        description: 'Please write something or attach media before posting.',
        variant: 'destructive',
      });
      return;
    }

    // Build content with media URLs
    let postContent = content.trim();
    if (attachedMedia.length > 0) {
      const mediaUrls = attachedMedia.map(m => m.url).join('\n');
      postContent = postContent ? `${postContent}\n\n${mediaUrls}` : mediaUrls;
    }

    // Build tags
    const tags: string[][] = [];
    
    // Add content warning if set
    if (showContentWarning && contentWarning.trim()) {
      tags.push(['content-warning', contentWarning.trim()]);
    }

    // Add imeta tags for each media file
    for (const media of attachedMedia) {
      const imetaTag = ['imeta', `url ${media.url}`];
      if (media.type) {
        imetaTag.push(`m ${media.type}`);
      }
      if (media.hash) {
        imetaTag.push(`x ${media.hash}`);
      }
      tags.push(imetaTag);
    }

    createEvent(
      { kind: 1, content: postContent, tags },
      {
        onSuccess: () => {
          setContent('');
          setAttachedMedia([]);
          setContentWarning('');
          setShowContentWarning(false);
          setShowPreview(false);
          toast({
            title: 'Post published!',
            description: 'Your post has been shared with the network.',
          });
          // Trigger feed refresh
          onPostPublished?.();
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

  // Create a preview event object
  const previewContent = content || 'What\'s on your mind?';
  const previewContentWithMedia = attachedMedia.length > 0 
    ? `${previewContent}\n\n${attachedMedia.map(m => m.url).join('\n')}`
    : previewContent;

  const previewTags: string[][] = [];
  if (showContentWarning && contentWarning.trim()) {
    previewTags.push(['content-warning', contentWarning.trim()]);
  }
  for (const media of attachedMedia) {
    const imetaTag = ['imeta', `url ${media.url}`];
    if (media.type) imetaTag.push(`m ${media.type}`);
    if (media.hash) imetaTag.push(`x ${media.hash}`);
    previewTags.push(imetaTag);
  }

  const previewEvent: NostrEvent = {
    id: 'preview',
    pubkey: user.pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    tags: previewTags,
    content: previewContentWithMedia,
    sig: '',
  };

  return (
    <>
      <Card className="border-border/50 dark:border-transparent shadow-md bg-gradient-to-br from-card via-rose-50/30 to-pink-50/20 dark:from-card dark:via-card dark:to-card">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold">Compose a new post!</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none border-border/50 focus-visible:ring-primary/50"
                disabled={isPending}
              />

                {/* Content Warning Input */}
                {showContentWarning && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        Content Warning
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowContentWarning(false);
                          setContentWarning('');
                        }}
                        className="h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Describe why this content needs a warning (e.g., 'Contains spoilers', 'Sensitive topic')"
                      value={contentWarning}
                      onChange={(e) => setContentWarning(e.target.value)}
                      className="min-h-[60px] resize-none border-orange-500/50 focus-visible:ring-orange-500/50"
                      disabled={isPending}
                    />
                  </div>
                )}

                {/* Media Attachments */}
                {attachedMedia.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {attachedMedia.map((media, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                          {media.type.startsWith('image/') ? (
                            <img
                              src={media.url}
                              alt="Attachment"
                              className="w-full h-full object-cover"
                            />
                          ) : media.type.startsWith('video/') ? (
                            <video
                              src={media.url}
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <p className="text-xs text-muted-foreground">Media file</p>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMedia(index)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  {/* Left side - Media and Warning buttons */}
                  <div className="flex items-center gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isPending || isUploading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending || isUploading}
                      className="h-9 px-3 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                      title="Attach media"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContentWarning(!showContentWarning)}
                      disabled={isPending}
                      className={`h-9 px-3 transition-colors ${
                        showContentWarning
                          ? 'text-orange-500 bg-orange-500/10 hover:text-orange-600 hover:bg-orange-500/20'
                          : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10'
                      }`}
                      title="Add content warning"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Right side - Preview and Post buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!content.trim() && attachedMedia.length === 0}
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending || isUploading || (!content.trim() && attachedMedia.length === 0)}
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

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Preview</DialogTitle>
          </DialogHeader>
          
          <Card className="border-border/50 dark:border-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  <AvatarImage src={profileImage} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{displayName}</div>
                  <div className="text-xs text-muted-foreground">@{username}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4 space-y-4">
              {/* Content Warning Badge */}
              {showContentWarning && contentWarning.trim() && (
                <Badge variant="destructive" className="gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  {contentWarning}
                </Badge>
              )}

              {/* Post Content */}
              <div className="whitespace-pre-wrap break-words">
                <NoteContent event={previewEvent} className="text-sm" />
              </div>

              {/* Media Preview - Uses MediaContent to show images, videos, YouTube embeds, and link previews */}
              <div className="mt-4">
                <MediaContent event={previewEvent} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
            <Button
              onClick={(e) => {
                setShowPreview(false);
                handleSubmit(e as any);
              }}
              disabled={isPending}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
            >
              <Send className="h-4 w-4 mr-2" />
              Post Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
