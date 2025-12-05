export interface Channel {
  id: string;
  name: string;
  logo?: string;
  url: string;
  group: string;
  country?: string;
  language?: string;
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
  | 'documentary';
