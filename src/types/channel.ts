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
  isPrimary?: boolean; // true = this is the selected source for this channel name (among duplicates)
  order?: number; // display order for sorting (set in admin panel)
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
  | 'family'
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
  | 'culture'
  | 'animation'
  | 'auto'
  | 'weather'
  | 'outdoor'
  | 'general'
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

// Language names in English (alphabetical order in record, custom order for dropdowns)
export const languageNames: Record<string, string> = {
  af: 'Afrikaans',
  am: 'Amharic',
  ar: 'Arabic',
  as: 'Assamese',
  az: 'Azerbaijani',
  be: 'Belarusian',
  bg: 'Bulgarian',
  bn: 'Bengali',
  bs: 'Bosnian',
  ca: 'Catalan',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  et: 'Estonian',
  fa: 'Persian',
  fi: 'Finnish',
  fr: 'French',
  gu: 'Gujarati',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  hu: 'Hungarian',
  hy: 'Armenian',
  id: 'Indonesian',
  is: 'Icelandic',
  it: 'Italian',
  ja: 'Japanese',
  ka: 'Georgian',
  kk: 'Kazakh',
  km: 'Khmer',
  kn: 'Kannada',
  ko: 'Korean',
  ku: 'Kurdish',
  ky: 'Kyrgyz',
  lo: 'Lao',
  lt: 'Lithuanian',
  lv: 'Latvian',
  mk: 'Macedonian',
  ml: 'Malayalam',
  mn: 'Mongolian',
  mr: 'Marathi',
  ms: 'Malay',
  mt: 'Maltese',
  my: 'Burmese',
  ne: 'Nepali',
  nl: 'Dutch',
  no: 'Norwegian',
  pa: 'Punjabi',
  pl: 'Polish',
  ps: 'Pashto',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  si: 'Sinhala',
  sk: 'Slovak',
  sl: 'Slovenian',
  so: 'Somali',
  sq: 'Albanian',
  sr: 'Serbian',
  sv: 'Swedish',
  sw: 'Swahili',
  ta: 'Tamil',
  te: 'Telugu',
  tg: 'Tajik',
  th: 'Thai',
  tk: 'Turkmen',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  uz: 'Uzbek',
  vi: 'Vietnamese',
  zh: 'Chinese',
};

// Ordered list for dropdowns (most common/relevant first)
export const languageOrder = [
  // Most common
  'ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'tr', 'zh',
  // CIS & Caucasus
  'uk', 'ka', 'kk', 'hy', 'az', 'be', 'uz', 'tg', 'ky', 'tk', 'mn',
  // Balkans
  'bs', 'sr', 'hr', 'sq', 'mk', 'sl', 'bg', 'ro',
  // Central Europe
  'pl', 'cs', 'sk', 'hu',
  // Nordic
  'sv', 'no', 'da', 'fi', 'is',
  // Baltic
  'lt', 'lv', 'et',
  // Western Europe
  'nl', 'el', 'ca', 'mt',
  // Middle East
  'he', 'fa', 'ku', 'ps',
  // South Asia
  'hi', 'bn', 'pa', 'ur', 'ta', 'te', 'ml', 'kn', 'gu', 'mr', 'si', 'ne', 'as',
  // Southeast Asia
  'vi', 'th', 'id', 'ms', 'km', 'lo', 'my',
  // East Asia
  'ja', 'ko',
  // Africa
  'sw', 'so', 'am', 'af',
];

// Category names in Russian
export const categoryNames: Record<string, string> = {
  all: 'Все',
  news: 'Новости',
  sports: 'Спорт',
  movies: 'Кино',
  kids: 'Детям',
  family: 'Семейное',
  music: 'Музыка',
  entertainment: 'Развлечения',
  documentary: 'Документальное',
  lifestyle: 'Стиль жизни',
  education: 'Образование',
  travel: 'Путешествия',
  gaming: 'Игры',
  cooking: 'Кулинария',
  nature: 'Природа',
  science: 'Наука',
  culture: 'Культура',
  animation: 'Анимация',
  auto: 'Авто',
  weather: 'Погода',
  outdoor: 'Активный отдых',
  general: 'Общее',
  religious: 'Религия',
  radio: 'Радио',
};

// Category names in English
export const categoryNamesEn: Record<string, string> = {
  all: 'All',
  news: 'News',
  sports: 'Sports',
  movies: 'Movies',
  kids: 'Kids',
  family: 'Family',
  music: 'Music',
  entertainment: 'Entertainment',
  documentary: 'Documentary',
  lifestyle: 'Lifestyle',
  education: 'Education',
  travel: 'Travel',
  gaming: 'Gaming',
  cooking: 'Cooking',
  nature: 'Nature',
  science: 'Science',
  culture: 'Culture',
  animation: 'Animation',
  auto: 'Auto',
  weather: 'Weather',
  outdoor: 'Outdoor',
  general: 'General',
  religious: 'Religious',
  radio: 'Radio',
};

// Ordered list for dropdowns (most common first)
export const categoryOrder = [
  'news', 'sports', 'movies', 'kids', 'family', 'music', 'entertainment',
  'documentary', 'lifestyle', 'education', 'travel', 'gaming', 'cooking',
  'nature', 'science', 'culture', 'animation', 'auto', 'weather',
  'outdoor', 'general', 'religious', 'radio'
];
