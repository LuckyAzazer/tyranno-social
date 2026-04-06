import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, Plus, X, Link as LinkIcon, GripVertical } from 'lucide-react';
import { NSchema as n, type NostrMetadata } from '@nostrify/nostrify';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadFile } from '@/hooks/useUploadFile';
import { z } from 'zod';

const MAX_LINKS = 7;

interface PersonalLink {
  label: string;
  url: string;
}

interface EditProfileFormProps {
  onSuccess?: () => void;
}

// Extended schema that includes our links field on top of the standard metadata
const profileSchema = n.metadata().extend?.({}) ?? n.metadata();

export const EditProfileForm: React.FC<EditProfileFormProps> = ({ onSuccess }) => {
  const queryClient = useQueryClient();

  const { user, metadata } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  // Personal links managed separately (not in react-hook-form, avoids zod complexity)
  const [links, setLinks] = useState<PersonalLink[]>([]);
  const [linkErrors, setLinkErrors] = useState<Record<number, string>>({});

  const form = useForm<NostrMetadata>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      about: '',
      picture: '',
      banner: '',
      website: '',
      nip05: '',
      bot: false,
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (metadata) {
      form.reset({
        name: metadata.name || '',
        about: metadata.about || '',
        picture: metadata.picture || '',
        banner: metadata.banner || '',
        website: metadata.website || '',
        nip05: metadata.nip05 || '',
        bot: metadata.bot || false,
      });

      // Restore saved links from metadata (stored as JSON under `links` key)
      const raw = (metadata as Record<string, unknown>).links;
      if (Array.isArray(raw)) {
        const restored = raw
          .filter((l): l is PersonalLink =>
            l !== null &&
            typeof l === 'object' &&
            typeof (l as PersonalLink).url === 'string'
          )
          .slice(0, MAX_LINKS);
        setLinks(restored);
      }
    }
  }, [metadata, form]);

  // ── Link helpers ──────────────────────────────────────────────────────────

  const addLink = () => {
    if (links.length >= MAX_LINKS) return;
    setLinks((prev) => [...prev, { label: '', url: '' }]);
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
    setLinkErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateLink = (index: number, field: keyof PersonalLink, value: string) => {
    setLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
    // Clear error on change
    if (linkErrors[index]) {
      setLinkErrors((prev) => { const n = { ...prev }; delete n[index]; return n; });
    }
  };

  const validateLinks = (): boolean => {
    const errors: Record<number, string> = {};
    links.forEach((link, i) => {
      if (!link.url.trim()) {
        errors[i] = 'URL is required';
        return;
      }
      try {
        const u = new URL(link.url.trim());
        if (u.protocol !== 'https:' && u.protocol !== 'http:') {
          errors[i] = 'Must be a valid http/https URL';
        }
      } catch {
        errors[i] = 'Must be a valid URL (e.g. https://example.com)';
      }
    });
    setLinkErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Image upload ──────────────────────────────────────────────────────────

  const uploadPicture = async (file: File, field: 'picture' | 'banner') => {
    try {
      const [[_, url]] = await uploadFile(file);
      form.setValue(field, url);
      toast({
        title: 'Success',
        description: `${field === 'picture' ? 'Profile picture' : 'Banner'} uploaded successfully`,
      });
    } catch {
      toast({
        title: 'Error',
        description: `Failed to upload ${field === 'picture' ? 'profile picture' : 'banner'}. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: NostrMetadata) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to update your profile', variant: 'destructive' });
      return;
    }

    if (!validateLinks()) return;

    try {
      // Merge existing metadata, form values, and links
      const data: Record<string, unknown> = { ...metadata, ...values };

      // Store non-empty links; omit the key entirely if none
      const cleanLinks = links
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.url);

      if (cleanLinks.length > 0) {
        data.links = cleanLinks;
      } else {
        delete data.links;
      }

      // Remove empty string fields
      for (const key in data) {
        if (data[key] === '') delete data[key];
      }

      await publishEvent({ kind: 0, content: JSON.stringify(data) });

      queryClient.invalidateQueries({ queryKey: ['logins'] });
      queryClient.invalidateQueries({ queryKey: ['nostr', 'author', user.pubkey] });

      toast({ title: 'Success', description: 'Your profile has been updated' });
      onSuccess?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to update your profile. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Name ── */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormDescription>Your display name shown to others.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Bio ── */}
        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell others about yourself" className="resize-none" {...field} />
              </FormControl>
              <FormDescription>A short description about yourself.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Images ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="picture"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                label="Profile Picture"
                placeholder="https://example.com/profile.jpg"
                description="URL or uploaded image for your avatar."
                previewType="square"
                onUpload={(file) => uploadPicture(file, 'picture')}
              />
            )}
          />
          <FormField
            control={form.control}
            name="banner"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                label="Banner Image"
                placeholder="https://example.com/banner.jpg"
                description="Wide banner image for your profile header."
                previewType="wide"
                onUpload={(file) => uploadPicture(file, 'banner')}
              />
            )}
          />
        </div>

        {/* ── Website + NIP-05 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourwebsite.com" {...field} />
                </FormControl>
                <FormDescription>Your primary website link.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nip05"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIP-05 Identifier</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormDescription>Your verified Nostr identifier.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Personal Links ── */}
        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Personal Links
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add up to {MAX_LINKS} links to your social profiles, projects, or anything you'd like to share.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLink}
              disabled={links.length >= MAX_LINKS}
              className="shrink-0 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Link
              <span className="text-xs text-muted-foreground ml-0.5">
                ({links.length}/{MAX_LINKS})
              </span>
            </Button>
          </div>

          {links.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
              <LinkIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No links added yet</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addLink}
                className="mt-2 text-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add your first link
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/20"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-2.5 shrink-0" />

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                    <div>
                      <Input
                        placeholder="Label (e.g. GitHub)"
                        value={link.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        className="h-9 text-sm"
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="https://example.com"
                        value={link.url}
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        className={`h-9 text-sm font-mono ${linkErrors[i] ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        type="url"
                      />
                      {linkErrors[i] && (
                        <p className="text-xs text-destructive mt-1">{linkErrors[i]}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(i)}
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove link"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* ── Bot toggle ── */}
        <FormField
          control={form.control}
          name="bot"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Bot Account</FormLabel>
                <FormDescription>Mark this account as automated or a bot.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={isPending || isUploading}>
          {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </form>
    </Form>
  );
};

// ── ImageUploadField ──────────────────────────────────────────────────────────

interface ImageUploadFieldProps {
  field: {
    value: string | undefined;
    onChange: (value: string) => void;
    name: string;
    onBlur: () => void;
  };
  label: string;
  placeholder: string;
  description: string;
  previewType: 'square' | 'wide';
  onUpload: (file: File) => void;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  field,
  label,
  placeholder,
  description,
  previewType,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="flex flex-col gap-2">
        <FormControl>
          <Input
            placeholder={placeholder}
            name={field.name}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
          />
        </FormControl>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          {field.value && (
            <div className={`h-10 ${previewType === 'square' ? 'w-10' : 'w-24'} rounded overflow-hidden`}>
              <img src={field.value} alt={`${label} preview`} className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>
      <FormDescription>{description}</FormDescription>
      <FormMessage />
    </FormItem>
  );
};
