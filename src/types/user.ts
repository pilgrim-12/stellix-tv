export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  isPremium: boolean;
  createdAt: Date;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  autoplay: boolean;
  defaultQuality: 'auto' | '1080p' | '720p' | '480p';
  defaultVolume: number;
  lastWatchedChannelId: string | null;
}

export interface FavoriteChannel {
  channelId: string;
  addedAt: Date;
}
