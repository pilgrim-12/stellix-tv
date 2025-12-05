export type ChannelLabel = 'HD' | '4K' | 'Live' | 'New' | 'Premium' | 'Free';

export interface Channel {
  id: string;
  name: string;
  logo?: string;
  url: string;
  group: string;
  country?: string;
  language?: string;
  labels?: ChannelLabel[];
  isNSFW?: boolean;
  isOffline?: boolean;
}

export interface ChannelGroup {
  name: string;
  channels: Channel[];
}

export type ChannelCategory =
  | 'all'
  | 'news'
  | 'sports'
  | 'movies'
  | 'kids'
  | 'music'
  | 'entertainment'
  | 'documentary'
  | 'lifestyle'
  | 'education'
  | 'travel'
  | 'gaming'
  | 'cooking'
  | 'nature'
  | 'science'
  | 'religious';

export interface TVProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category?: string;
  isLive?: boolean;
}

export const languageNames: Record<string, string> = {
  en: 'English',
  ru: 'Русский',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ar: 'العربية',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  pl: 'Polski',
  nl: 'Nederlands',
  uk: 'Українська',
};
