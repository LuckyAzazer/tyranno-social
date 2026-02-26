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
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
