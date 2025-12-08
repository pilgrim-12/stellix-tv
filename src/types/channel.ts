export type ChannelLabel = 'HD' | '4K' | 'Live' | 'New' | 'Premium' | 'Free';

export type ChannelStatus = 'pending' | 'active' | 'inactive' | 'broken';

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
  enabled?: boolean; // for admin panel - default true
  status?: ChannelStatus; // pending = not checked, active = working, inactive = disabled by admin, broken = not working
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
  | 'religious'
  | 'radio';

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

// Language names in display order (most common first)
export const languageNames: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  ka: 'ქართული',
  kk: 'Қazaқша',
  hy: 'Հայdelays',
  az: 'Azərbaycan',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  pt: 'Português',
  ar: 'العربية',
  tr: 'Türkçe',
  uk: 'Українська',
  pl: 'Polski',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  hi: 'हिन्दी',
  nl: 'Nederlands',
  bs: 'Bosanski',
  sr: 'Српски',
  hr: 'Hrvatski',
  sq: 'Shqip',
  bg: 'Български',
  ro: 'Română',
  el: 'Ελληνικά',
  cs: 'Čeština',
  sk: 'Slovenčina',
  hu: 'Magyar',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
  he: 'עברית',
  fa: 'فارسی',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Indonesia',
  ms: 'Melayu',
  ca: 'Català',
};

// Ordered list for dropdowns (most common first)
export const languageOrder = [
  'ru', 'en', 'es', 'ka', 'kk', 'hy', 'az', 'fr', 'it', 'de', 'pt', 'ar', 'tr',
  'uk', 'pl', 'zh', 'ja', 'ko', 'hi', 'nl',
  'bs', 'sr', 'hr', 'sq', 'bg', 'ro', 'el', 'cs', 'sk', 'hu',
  'sv', 'no', 'da', 'fi', 'he', 'fa', 'vi', 'th', 'id', 'ms', 'ca'
];

// Category names in Russian
export const categoryNames: Record<string, string> = {
  all: 'Все',
  news: 'Новости',
  sports: 'Спорт',
  movies: 'Кино',
  kids: 'Детям',
  music: 'Музыка',
  entertainment: 'Развлечения',
  documentary: 'Документальное',
  nature: 'Природа',
  lifestyle: 'Стиль жизни',
  cooking: 'Кулинария',
  gaming: 'Игры',
  education: 'Образование',
  travel: 'Путешествия',
  science: 'Наука',
  religious: 'Религия',
  radio: 'Радио',
};
