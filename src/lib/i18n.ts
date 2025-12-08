export type UILanguage = 'ru' | 'en' | 'uk'

export const uiLanguages: { code: UILanguage; name: string; nativeName: string }[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
]

export const translations = {
  ru: {
    // Header
    watch: 'Смотреть',
    program: 'Программа',
    admin: 'Админ',
    signIn: 'Войти',
    signUp: 'Регистрация',
    signOut: 'Выйти',
    favorites: 'Избранное',
    adminPanel: 'Админ панель',
    settings: 'Настройки',

    // Channel Grid
    allChannels: 'Все каналы',
    searchChannels: 'Поиск каналов...',
    channels: 'каналов',
    channelsCount: '{count} каналов',
    workingChannels: 'рабочих',
    noChannelsFound: 'Каналы не найдены',

    // Categories
    category: 'Категория',
    allCategories: 'Все',
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

    // Language filter
    language: 'Язык',
    allLanguages: 'Все языки',

    // Settings
    settingsTitle: 'Настройки',
    interfaceLanguage: 'Язык интерфейса',
    theme: 'Тема',
    themeSystem: 'Системная',
    themeLight: 'Светлая',
    themeDark: 'Темная',
    saveSettings: 'Сохранить',
    close: 'Закрыть',

    // Player
    selectChannel: 'Выберите канал для просмотра',
    channelOffline: 'Канал офлайн',
    loading: 'Загрузка...',

    // Misc
    browseChannels: 'Обзор каналов',
    openChannelGrid: 'Открыть все каналы',
  },
  en: {
    // Header
    watch: 'Watch',
    program: 'Guide',
    admin: 'Admin',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    favorites: 'Favorites',
    adminPanel: 'Admin Panel',
    settings: 'Settings',

    // Channel Grid
    allChannels: 'All Channels',
    searchChannels: 'Search channels...',
    channels: 'channels',
    channelsCount: '{count} channels',
    workingChannels: 'working',
    noChannelsFound: 'No channels found',

    // Categories
    category: 'Category',
    allCategories: 'All',
    news: 'News',
    sports: 'Sports',
    movies: 'Movies',
    kids: 'Kids',
    music: 'Music',
    entertainment: 'Entertainment',
    documentary: 'Documentary',
    nature: 'Nature',
    lifestyle: 'Lifestyle',
    cooking: 'Cooking',
    gaming: 'Gaming',

    // Language filter
    language: 'Language',
    allLanguages: 'All languages',

    // Settings
    settingsTitle: 'Settings',
    interfaceLanguage: 'Interface Language',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    saveSettings: 'Save',
    close: 'Close',

    // Player
    selectChannel: 'Select a channel to start watching',
    channelOffline: 'Channel offline',
    loading: 'Loading...',

    // Misc
    browseChannels: 'Browse Channels',
    openChannelGrid: 'Open all channels',
  },
  uk: {
    // Header
    watch: 'Дивитись',
    program: 'Програма',
    admin: 'Адмін',
    signIn: 'Увійти',
    signUp: 'Реєстрація',
    signOut: 'Вийти',
    favorites: 'Обране',
    adminPanel: 'Адмін панель',
    settings: 'Налаштування',

    // Channel Grid
    allChannels: 'Всі канали',
    searchChannels: 'Пошук каналів...',
    channels: 'каналів',
    channelsCount: '{count} каналів',
    workingChannels: 'робочих',
    noChannelsFound: 'Канали не знайдено',

    // Categories
    category: 'Категорія',
    allCategories: 'Всі',
    news: 'Новини',
    sports: 'Спорт',
    movies: 'Кіно',
    kids: 'Дітям',
    music: 'Музика',
    entertainment: 'Розваги',
    documentary: 'Документальне',
    nature: 'Природа',
    lifestyle: 'Стиль життя',
    cooking: 'Кулінарія',
    gaming: 'Ігри',

    // Language filter
    language: 'Мова',
    allLanguages: 'Всі мови',

    // Settings
    settingsTitle: 'Налаштування',
    interfaceLanguage: 'Мова інтерфейсу',
    theme: 'Тема',
    themeSystem: 'Системна',
    themeLight: 'Світла',
    themeDark: 'Темна',
    saveSettings: 'Зберегти',
    close: 'Закрити',

    // Player
    selectChannel: 'Виберіть канал для перегляду',
    channelOffline: 'Канал офлайн',
    loading: 'Завантаження...',

    // Misc
    browseChannels: 'Огляд каналів',
    openChannelGrid: 'Відкрити всі канали',
  },
} as const

export type TranslationKey = keyof typeof translations.ru

export function getTranslation(lang: UILanguage, key: TranslationKey): string {
  return translations[lang][key] || translations.en[key] || key
}

export function t(lang: UILanguage, key: TranslationKey, params?: Record<string, string | number>): string {
  let text = getTranslation(lang, key)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
  }
  return text
}
