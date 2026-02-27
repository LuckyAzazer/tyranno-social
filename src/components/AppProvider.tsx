import { ReactNode, useEffect } from 'react';
import { z } from 'zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AppContext, type AppConfig, type AppContextType, type Theme, type RelayMetadata, type DMInboxRelays, type PrivateHomeRelays, type PersonalizedTheme, type TopicFilter } from '@/contexts/AppContext';
import { initializePersonalizedTheme } from '@/components/PersonalizedThemeManager';

interface AppProviderProps {
  children: ReactNode;
  /** Application storage key */
  storageKey: string;
  /** Default app configuration */
  defaultConfig: AppConfig;
}

// Zod schema for RelayMetadata validation
const RelayMetadataSchema = z.object({
  relays: z.array(z.object({
    url: z.url(),
    read: z.boolean(),
    write: z.boolean(),
  })),
  updatedAt: z.number(),
}) satisfies z.ZodType<RelayMetadata>;

// Zod schema for DMInboxRelays validation
const DMInboxRelaysSchema = z.object({
  relays: z.array(z.url()),
  updatedAt: z.number(),
}) satisfies z.ZodType<DMInboxRelays>;

// Zod schema for PrivateHomeRelays validation
const PrivateHomeRelaysSchema = z.object({
  relays: z.array(z.url()),
  updatedAt: z.number(),
}) satisfies z.ZodType<PrivateHomeRelays>;

// Zod schema for TopicFilter validation
const TopicFilterSchema = z.object({
  keywords: z.array(z.string()),
  hashtags: z.array(z.string()),
  emojis: z.array(z.string()),
}) satisfies z.ZodType<TopicFilter>;

// Zod schema for PersonalizedTheme validation
const PersonalizedThemeSchema = z.object({
  wallpaperUrl: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  foregroundColor: z.string(),
  cardOpacity: z.number().optional(),
}) satisfies z.ZodType<PersonalizedTheme>;

// Zod schema for AppConfig validation
const AppConfigSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  relayMetadata: RelayMetadataSchema,
  dmInboxRelays: DMInboxRelaysSchema.optional(),
  privateHomeRelays: PrivateHomeRelaysSchema.optional(),
  showContentWarnings: z.boolean().optional().default(true),
  topicFilter: TopicFilterSchema.optional(),
  personalizedTheme: PersonalizedThemeSchema.optional(),
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
}) satisfies z.ZodType<AppConfig>;

export function AppProvider(props: AppProviderProps) {
  const {
    children,
    storageKey,
    defaultConfig,
  } = props;

  // App configuration state with localStorage persistence
  const [rawConfig, setConfig] = useLocalStorage<Partial<AppConfig>>(
    storageKey,
    {},
    {
      serialize: JSON.stringify,
      deserialize: (value: string) => {
        const parsed = JSON.parse(value);
        return AppConfigSchema.partial().parse(parsed);
      }
    }
  );

  // Generic config updater with callback pattern
  const updateConfig = (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => {
    setConfig(updater);
  };

  const config = { ...defaultConfig, ...rawConfig };

  const appContextValue: AppContextType = {
    config,
    updateConfig,
  };

  // Apply theme effects to document
  useApplyTheme(config.theme, config.personalizedTheme);

  // Apply font settings to document
  useApplyFontSettings(config.fontFamily, config.fontSize);

  // Apply personalized theme if configured
  useEffect(() => {
    initializePersonalizedTheme(config.personalizedTheme);
  }, [config.personalizedTheme]);

  return (
    <AppContext.Provider value={appContextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to apply theme changes to the document root
 */
function useApplyTheme(theme: Theme, personalizedTheme?: PersonalizedTheme) {
  useEffect(() => {
    const root = window.document.documentElement;

    // If personalized theme is active, don't apply theme class
    if (personalizedTheme) {
      return;
    }

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme, personalizedTheme]);

  // Handle system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== 'system' || personalizedTheme) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, personalizedTheme]);
}

/**
 * Hook to apply font settings to the document root
 */
function useApplyFontSettings(fontFamily?: string, fontSize?: string) {
  useEffect(() => {
    const root = window.document.documentElement;

    if (fontFamily) {
      root.style.fontFamily = fontFamily;
    }

    if (fontSize) {
      root.style.fontSize = fontSize;
    }
  }, [fontFamily, fontSize]);
}