export type UILanguage = 'ru' | 'en' | 'uk' | 'es' | 'it' | 'fr' | 'de' | 'ka'

export const uiLanguages: { code: UILanguage; name: string; nativeName: string }[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
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
    family: 'Сімейне',
    music: 'Музика',
    entertainment: 'Розваги',
    documentary: 'Документальне',
    lifestyle: 'Стиль життя',
    education: 'Освіта',
    travel: 'Подорожі',
    gaming: 'Ігри',
    cooking: 'Кулінарія',
    nature: 'Природа',
    science: 'Наука',
    culture: 'Культура',
    animation: 'Анімація',
    auto: 'Авто',
    weather: 'Погода',
    outdoor: 'Активний відпочинок',
    general: 'Загальне',
    religious: 'Релігія',
    radio: 'Радіо',

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
  es: {
    // Header
    watch: 'Ver',
    program: 'Guía',
    admin: 'Admin',
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    signOut: 'Cerrar sesión',
    favorites: 'Favoritos',
    adminPanel: 'Panel de admin',
    settings: 'Configuración',

    // Channel Grid
    allChannels: 'Todos los canales',
    searchChannels: 'Buscar canales...',
    channels: 'canales',
    channelsCount: '{count} canales',
    workingChannels: 'activos',
    noChannelsFound: 'No se encontraron canales',

    // Categories
    category: 'Categoría',
    allCategories: 'Todos',
    news: 'Noticias',
    sports: 'Deportes',
    movies: 'Películas',
    kids: 'Infantil',
    family: 'Familiar',
    music: 'Música',
    entertainment: 'Entretenimiento',
    documentary: 'Documental',
    lifestyle: 'Estilo de vida',
    education: 'Educación',
    travel: 'Viajes',
    gaming: 'Juegos',
    cooking: 'Cocina',
    nature: 'Naturaleza',
    science: 'Ciencia',
    culture: 'Cultura',
    animation: 'Animación',
    auto: 'Auto',
    weather: 'Clima',
    outdoor: 'Aire libre',
    general: 'General',
    religious: 'Religioso',
    radio: 'Radio',

    // Language filter
    language: 'Idioma',
    allLanguages: 'Todos los idiomas',

    // Settings
    settingsTitle: 'Configuración',
    interfaceLanguage: 'Idioma de interfaz',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    saveSettings: 'Guardar',
    close: 'Cerrar',

    // Player
    selectChannel: 'Selecciona un canal para ver',
    channelOffline: 'Canal sin conexión',
    loading: 'Cargando...',

    // Misc
    browseChannels: 'Explorar canales',
    openChannelGrid: 'Abrir todos los canales',
  },
  it: {
    // Header
    watch: 'Guarda',
    program: 'Guida',
    admin: 'Admin',
    signIn: 'Accedi',
    signUp: 'Registrati',
    signOut: 'Esci',
    favorites: 'Preferiti',
    adminPanel: 'Pannello admin',
    settings: 'Impostazioni',

    // Channel Grid
    allChannels: 'Tutti i canali',
    searchChannels: 'Cerca canali...',
    channels: 'canali',
    channelsCount: '{count} canali',
    workingChannels: 'attivi',
    noChannelsFound: 'Nessun canale trovato',

    // Categories
    category: 'Categoria',
    allCategories: 'Tutti',
    news: 'Notizie',
    sports: 'Sport',
    movies: 'Film',
    kids: 'Bambini',
    family: 'Famiglia',
    music: 'Musica',
    entertainment: 'Intrattenimento',
    documentary: 'Documentari',
    lifestyle: 'Lifestyle',
    education: 'Educazione',
    travel: 'Viaggi',
    gaming: 'Giochi',
    cooking: 'Cucina',
    nature: 'Natura',
    science: 'Scienza',
    culture: 'Cultura',
    animation: 'Animazione',
    auto: 'Auto',
    weather: 'Meteo',
    outdoor: 'Outdoor',
    general: 'Generale',
    religious: 'Religioso',
    radio: 'Radio',

    // Language filter
    language: 'Lingua',
    allLanguages: 'Tutte le lingue',

    // Settings
    settingsTitle: 'Impostazioni',
    interfaceLanguage: 'Lingua interfaccia',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Chiaro',
    themeDark: 'Scuro',
    saveSettings: 'Salva',
    close: 'Chiudi',

    // Player
    selectChannel: 'Seleziona un canale da guardare',
    channelOffline: 'Canale offline',
    loading: 'Caricamento...',

    // Misc
    browseChannels: 'Sfoglia canali',
    openChannelGrid: 'Apri tutti i canali',
  },
  fr: {
    // Header
    watch: 'Regarder',
    program: 'Guide',
    admin: 'Admin',
    signIn: 'Connexion',
    signUp: 'Inscription',
    signOut: 'Déconnexion',
    favorites: 'Favoris',
    adminPanel: 'Panneau admin',
    settings: 'Paramètres',

    // Channel Grid
    allChannels: 'Toutes les chaînes',
    searchChannels: 'Rechercher des chaînes...',
    channels: 'chaînes',
    channelsCount: '{count} chaînes',
    workingChannels: 'actives',
    noChannelsFound: 'Aucune chaîne trouvée',

    // Categories
    category: 'Catégorie',
    allCategories: 'Toutes',
    news: 'Actualités',
    sports: 'Sports',
    movies: 'Films',
    kids: 'Enfants',
    family: 'Famille',
    music: 'Musique',
    entertainment: 'Divertissement',
    documentary: 'Documentaire',
    lifestyle: 'Style de vie',
    education: 'Éducation',
    travel: 'Voyages',
    gaming: 'Jeux',
    cooking: 'Cuisine',
    nature: 'Nature',
    science: 'Science',
    culture: 'Culture',
    animation: 'Animation',
    auto: 'Auto',
    weather: 'Météo',
    outdoor: 'Plein air',
    general: 'Général',
    religious: 'Religieux',
    radio: 'Radio',

    // Language filter
    language: 'Langue',
    allLanguages: 'Toutes les langues',

    // Settings
    settingsTitle: 'Paramètres',
    interfaceLanguage: 'Langue de l\'interface',
    theme: 'Thème',
    themeSystem: 'Système',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    saveSettings: 'Enregistrer',
    close: 'Fermer',

    // Player
    selectChannel: 'Sélectionnez une chaîne à regarder',
    channelOffline: 'Chaîne hors ligne',
    loading: 'Chargement...',

    // Misc
    browseChannels: 'Parcourir les chaînes',
    openChannelGrid: 'Ouvrir toutes les chaînes',
  },
  de: {
    // Header
    watch: 'Ansehen',
    program: 'Programm',
    admin: 'Admin',
    signIn: 'Anmelden',
    signUp: 'Registrieren',
    signOut: 'Abmelden',
    favorites: 'Favoriten',
    adminPanel: 'Admin-Panel',
    settings: 'Einstellungen',

    // Channel Grid
    allChannels: 'Alle Sender',
    searchChannels: 'Sender suchen...',
    channels: 'Sender',
    channelsCount: '{count} Sender',
    workingChannels: 'aktiv',
    noChannelsFound: 'Keine Sender gefunden',

    // Categories
    category: 'Kategorie',
    allCategories: 'Alle',
    news: 'Nachrichten',
    sports: 'Sport',
    movies: 'Filme',
    kids: 'Kinder',
    family: 'Familie',
    music: 'Musik',
    entertainment: 'Unterhaltung',
    documentary: 'Dokumentation',
    lifestyle: 'Lifestyle',
    education: 'Bildung',
    travel: 'Reisen',
    gaming: 'Gaming',
    cooking: 'Kochen',
    nature: 'Natur',
    science: 'Wissenschaft',
    culture: 'Kultur',
    animation: 'Animation',
    auto: 'Auto',
    weather: 'Wetter',
    outdoor: 'Outdoor',
    general: 'Allgemein',
    religious: 'Religion',
    radio: 'Radio',

    // Language filter
    language: 'Sprache',
    allLanguages: 'Alle Sprachen',

    // Settings
    settingsTitle: 'Einstellungen',
    interfaceLanguage: 'Oberflächensprache',
    theme: 'Design',
    themeSystem: 'System',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    saveSettings: 'Speichern',
    close: 'Schließen',

    // Player
    selectChannel: 'Wählen Sie einen Sender aus',
    channelOffline: 'Sender offline',
    loading: 'Laden...',

    // Misc
    browseChannels: 'Sender durchsuchen',
    openChannelGrid: 'Alle Sender öffnen',
  },
  ka: {
    // Header
    watch: 'ყურება',
    program: 'პროგრამა',
    admin: 'ადმინი',
    signIn: 'შესვლა',
    signUp: 'რეგისტრაცია',
    signOut: 'გასვლა',
    favorites: 'რჩეულები',
    adminPanel: 'ადმინ პანელი',
    settings: 'პარამეტრები',

    // Channel Grid
    allChannels: 'ყველა არხი',
    searchChannels: 'არხების ძიება...',
    channels: 'არხი',
    channelsCount: '{count} არხი',
    workingChannels: 'აქტიური',
    noChannelsFound: 'არხები ვერ მოიძებნა',

    // Categories
    category: 'კატეგორია',
    allCategories: 'ყველა',
    news: 'ახალი ამბები',
    sports: 'სპორტი',
    movies: 'ფილმები',
    kids: 'საბავშვო',
    family: 'საოჯახო',
    music: 'მუსიკა',
    entertainment: 'გართობა',
    documentary: 'დოკუმენტური',
    lifestyle: 'ცხოვრების წესი',
    education: 'განათლება',
    travel: 'მოგზაურობა',
    gaming: 'თამაშები',
    cooking: 'კულინარია',
    nature: 'ბუნება',
    science: 'მეცნიერება',
    culture: 'კულტურა',
    animation: 'ანიმაცია',
    auto: 'ავტო',
    weather: 'ამინდი',
    outdoor: 'აქტიური დასვენება',
    general: 'ზოგადი',
    religious: 'რელიგიური',
    radio: 'რადიო',

    // Language filter
    language: 'ენა',
    allLanguages: 'ყველა ენა',

    // Settings
    settingsTitle: 'პარამეტრები',
    interfaceLanguage: 'ინტერფეისის ენა',
    theme: 'თემა',
    themeSystem: 'სისტემური',
    themeLight: 'ნათელი',
    themeDark: 'მუქი',
    saveSettings: 'შენახვა',
    close: 'დახურვა',

    // Player
    selectChannel: 'აირჩიეთ არხი საყურებლად',
    channelOffline: 'არხი ოფლაინშია',
    loading: 'იტვირთება...',

    // Misc
    browseChannels: 'არხების დათვალიერება',
    openChannelGrid: 'ყველა არხის გახსნა',
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

// Category key mapping for translations
const categoryKeyMap: Record<string, TranslationKey> = {
  all: 'allCategories',
  news: 'news',
  sports: 'sports',
  movies: 'movies',
  kids: 'kids',
  family: 'family',
  music: 'music',
  entertainment: 'entertainment',
  documentary: 'documentary',
  lifestyle: 'lifestyle',
  education: 'education',
  travel: 'travel',
  gaming: 'gaming',
  cooking: 'cooking',
  nature: 'nature',
  science: 'science',
  culture: 'culture',
  animation: 'animation',
  auto: 'auto',
  weather: 'weather',
  outdoor: 'outdoor',
  general: 'general',
  religious: 'religious',
  radio: 'radio',
}

export function getCategoryName(lang: UILanguage, category: string): string {
  const key = categoryKeyMap[category]
  if (key) {
    return getTranslation(lang, key)
  }
  return category
}
