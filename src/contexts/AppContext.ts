import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export interface RelayMetadata {
  /** List of relays with read/write permissions */
  relays: { url: string; read: boolean; write: boolean }[];
  /** Unix timestamp of when the relay list was last updated */
  updatedAt: number;
}

export interface DMInboxRelays {
  /** List of relay URLs for receiving DMs (kind 10050) */
  relays: string[];
  /** Unix timestamp of when the DM relay list was last updated */
  updatedAt: number;
}

export interface PrivateHomeRelays {
  /** List of relay URLs for private content (kind 10013) */
  relays: string[];
  /** Unix timestamp of when the private relay list was last updated */
  updatedAt: number;
}

export interface TopicFilter {
  /** Keywords to filter from posts */
  keywords: string[];
  /** Hashtags to filter from posts */
  hashtags: string[];
  /** Emojis to filter from posts */
  emojis: string[];
}

export interface PersonalizedTheme {
  /** Wallpaper image URL (data URL or blob URL) */
  wallpaperUrl: string;
  /** Extracted primary color */
  primaryColor: string;
  /** Extracted secondary color */
  secondaryColor: string;
  /** Extracted accent color */
  accentColor: string;
  /** Background color (light or dark based on image) */
  backgroundColor: string;
  /** Foreground/text color */
  foregroundColor: string;
  /** Card transparency (0-100, default 85) */
  cardOpacity?: number;
  /** Card backdrop blur in pixels (0-40, default 20). 0 = clear dark cards, 40 = heavy frosted glass */
  cardBlur?: number;
  /** Wallpaper focal point as "X% Y%" CSS background-position (default "50% 50%") */
  wallpaperPosition?: string;
}

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** NIP-65 relay list metadata */
  relayMetadata: RelayMetadata;
  /** NIP-17 DM inbox relays (kind 10050) */
  dmInboxRelays?: DMInboxRelays;
  /** NIP-37 Private home relays (kind 10013) */
  privateHomeRelays?: PrivateHomeRelays;
  /** Show content warnings (true = blur/hide, false = always show) */
  showContentWarnings: boolean;
  /** Topic filter for blocking posts by keywords, hashtags, and emojis */
  topicFilter?: TopicFilter;
  /** Personalized theme with custom wallpaper */
  personalizedTheme?: PersonalizedTheme;
  /** Font family */
  fontFamily?: string;
  /** Font size */
  fontSize?: string;
  /** Card corner radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' (default 'md') */
  cardRadius?: string;
  /** Post density: 'compact' | 'comfortable' | 'spacious' (default 'comfortable') */
  postDensity?: string;
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
