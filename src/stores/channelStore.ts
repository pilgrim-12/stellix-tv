import { create } from 'zustand';
import { Channel, ChannelCategory } from '@/types';
import { addFavorite, removeFavorite, getFavorites, setFavorites, addWatchHistory, getUserSettings, updateUserSettings } from '@/lib/userService';
import { getActiveCuratedChannels } from '@/lib/curatedChannelService';
import { saveManualLanguageChoice, getDefaultLanguageFilter, shouldAutoDetect } from '@/lib/geoLanguageService';

interface CustomPlaylist {
  id: string;
  name: string;
  url?: string;
  channels: Channel[];
  addedAt: number;
  enabled: boolean;
}

interface WatchHistoryItem {
  channelId: string;
  channelName: string;
  watchedAt: number;
}

export type GroupByMode = 'none' | 'country' | 'language';

interface ChannelState {
  channels: Channel[];
  customPlaylists: CustomPlaylist[];
  currentChannel: Channel | null;
  selectedCategory: ChannelCategory;
  selectedLanguage: string; // 'all' or language code
  selectedCountry: string; // 'all' or country name
  searchQuery: string;
  favorites: string[];
  favoriteOrder: string[]; // user-set order of favorite channels
  watchHistory: WatchHistoryItem[];
  showOnlyFavorites: boolean;
  groupBy: GroupByMode;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  offlineChannels: Set<string>;
  disabledChannels: Set<string>; // admin-disabled channels

  // Actions
  setChannels: (channels: Channel[]) => void;
  loadChannelsFromFirebase: () => Promise<void>;
  addCustomPlaylist: (playlist: CustomPlaylist) => void;
  removeCustomPlaylist: (playlistId: string) => void;
  togglePlaylistEnabled: (playlistId: string) => void;
  loadCustomPlaylists: () => void;
  setCurrentChannel: (channel: Channel | null, userId?: string) => void;
  setCategory: (category: ChannelCategory) => void;
  setLanguage: (language: string) => void;
  setLanguageAuto: (language: string) => void; // Set language without saving as manual choice
  initLanguageFromGeo: () => Promise<void>; // Initialize language from geo-detection
  setCountry: (country: string) => void;
  setSearchQuery: (query: string) => void;
  toggleFavorite: (channelId: string, userId?: string) => void;
  setFavoriteOrder: (order: string[]) => void;
  loadFavoriteOrder: () => void;
  setShowOnlyFavorites: (show: boolean, userId?: string) => void;
  loadFavoritesFromFirebase: (userId: string) => Promise<void>;
  loadUserSettings: (userId: string) => Promise<void>;
  syncFavoritesToFirebase: (userId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markChannelOffline: (channelId: string) => void;
  markChannelOnline: (channelId: string) => void;
  setChannelStatus: (channelId: string, isOnline: boolean) => void;
  toggleChannelEnabled: (channelId: string) => void;
  loadDisabledChannels: () => void;
  setGroupBy: (mode: GroupByMode) => void;
  loadSavedFilters: () => void;
  loadWatchHistory: () => void;
  addToWatchHistory: (channel: Channel) => void;
  getRecentChannels: () => Channel[];

  // Computed
  getFilteredChannels: () => Channel[];
  getAvailableLanguages: () => string[];
  getAvailableCountries: () => string[];
  getLanguageCounts: () => Record<string, number>;
  getCountryCounts: () => Record<string, number>;
  getCategoryCounts: () => Record<string, number>;
  getAllChannelsWithStatus: () => Channel[];
}

// --- localStorage channel cache (stale-while-revalidate) ---
const CHANNEL_CACHE_KEY = 'stellix-channel-cache'
const CHANNEL_CACHE_TS_KEY = 'stellix-channel-cache-ts'
const CHANNEL_CACHE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

function loadChannelsFromCache(): Channel[] | null {
  if (typeof window === 'undefined') return null
  try {
    const ts = localStorage.getItem(CHANNEL_CACHE_TS_KEY)
    if (!ts || Date.now() - parseInt(ts, 10) > CHANNEL_CACHE_MAX_AGE) return null
    const raw = localStorage.getItem(CHANNEL_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Channel[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

function saveChannelsToCache(channels: Channel[]): void {
  if (typeof window === 'undefined') return
  try {
    const minimal = channels.map(ch => ({
      id: ch.id, name: ch.name, logo: ch.logo, url: ch.url,
      group: ch.group, country: ch.country, language: ch.language,
      labels: ch.labels, order: ch.order, status: ch.status,
      enabled: ch.enabled, isPrimary: ch.isPrimary, isOffline: false,
    }))
    localStorage.setItem(CHANNEL_CACHE_KEY, JSON.stringify(minimal))
    localStorage.setItem(CHANNEL_CACHE_TS_KEY, String(Date.now()))
  } catch {
    // localStorage full — silently ignore
  }
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  customPlaylists: [],
  currentChannel: null,
  selectedCategory: 'all',
  selectedLanguage: 'all',
  selectedCountry: 'all',
  searchQuery: '',
  favorites: [],
  favoriteOrder: [],
  watchHistory: [],
  showOnlyFavorites: false,
  groupBy: 'none',
  isLoading: false,
  isRefreshing: false,
  error: null,
  offlineChannels: new Set(),
  disabledChannels: new Set(),

  setChannels: (channels) => set({ channels }),

  loadChannelsFromFirebase: async () => {
    try {
      // Step 1: Try showing cached channels instantly
      const cached = loadChannelsFromCache();
      if (cached && cached.length > 0) {
        set({ channels: cached, isLoading: false, isRefreshing: true, error: null });
        console.log('[ChannelStore] Loaded', cached.length, 'channels from cache');
      } else {
        set({ isLoading: true, error: null });
      }

      // Step 2: Always fetch fresh data from Firebase
      console.log('[ChannelStore] Loading from curated_channels');
      const firebaseChannels = await getActiveCuratedChannels();

      if (firebaseChannels.length > 0) {
        const channels = firebaseChannels.map((ch) => ({
          ...ch,
          isOffline: ch.isOffline || false,
        }));
        set({ channels, isLoading: false, isRefreshing: false });
        saveChannelsToCache(channels);
      } else if (!cached || cached.length === 0) {
        console.warn('[ChannelStore] No channels found in curated_channels');
        set({ isLoading: false, isRefreshing: false });
      } else {
        set({ isRefreshing: false });
      }
    } catch (error) {
      console.error('Error loading channels from Firebase:', error);
      const { channels: currentChannels } = get();
      if (currentChannels.length === 0) {
        set({ error: 'Failed to load channels', isLoading: false, isRefreshing: false });
      } else {
        // Cache is showing, just stop refreshing
        set({ isLoading: false, isRefreshing: false });
      }
    }
  },

  addCustomPlaylist: (playlist) => {
    const { customPlaylists, channels } = get();
    const newPlaylists = [...customPlaylists, playlist];
    const newChannels = [...channels, ...playlist.channels];
    set({ customPlaylists: newPlaylists, channels: newChannels });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-custom-playlists', JSON.stringify(newPlaylists));
    }
  },

  removeCustomPlaylist: (playlistId) => {
    const { customPlaylists, channels } = get();
    const playlist = customPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    const channelIds = new Set(playlist.channels.map(ch => ch.id));
    const newChannels = channels.filter(ch => !channelIds.has(ch.id));
    const newPlaylists = customPlaylists.filter(p => p.id !== playlistId);

    set({ customPlaylists: newPlaylists, channels: newChannels });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-custom-playlists', JSON.stringify(newPlaylists));
    }
  },

  togglePlaylistEnabled: (playlistId) => {
    const { customPlaylists, channels } = get();
    const playlist = customPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    const newEnabled = !playlist.enabled;
    const newPlaylists = customPlaylists.map(p =>
      p.id === playlistId ? { ...p, enabled: newEnabled } : p
    );

    // Добавляем или убираем каналы из общего списка
    let newChannels: Channel[];
    if (newEnabled) {
      // Добавляем каналы обратно
      const existingIds = new Set(channels.map(ch => ch.id));
      const channelsToAdd = playlist.channels.filter(ch => !existingIds.has(ch.id));
      newChannels = [...channels, ...channelsToAdd];
    } else {
      // Убираем каналы плейлиста
      const channelIds = new Set(playlist.channels.map(ch => ch.id));
      newChannels = channels.filter(ch => !channelIds.has(ch.id));
    }

    set({ customPlaylists: newPlaylists, channels: newChannels });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-custom-playlists', JSON.stringify(newPlaylists));
    }
  },

  loadCustomPlaylists: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stellix-custom-playlists');
      if (saved) {
        try {
          const playlists: CustomPlaylist[] = JSON.parse(saved);
          // Добавляем каналы только из включённых плейлистов
          const enabledPlaylists = playlists.filter(p => p.enabled !== false);
          const customChannels = enabledPlaylists.flatMap(p => p.channels);
          const { channels } = get();
          // Добавляем кастомные каналы если их ещё нет
          const existingIds = new Set(channels.map(ch => ch.id));
          const newChannels = customChannels.filter(ch => !existingIds.has(ch.id));
          set({
            customPlaylists: playlists,
            channels: [...channels, ...newChannels]
          });
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  },
  setCurrentChannel: (channel, userId) => {
    set({ currentChannel: channel });

    // Save last channel to localStorage and add to local watch history
    if (typeof window !== 'undefined' && channel) {
      localStorage.setItem('stellix-last-channel', channel.id);
      get().addToWatchHistory(channel);
    }

    // Track watch history in Firebase if user is logged in
    if (channel && userId) {
      addWatchHistory(userId, channel.id, channel.name);
    }
  },
  setCategory: (category) => {
    set({ selectedCategory: category });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-selected-category', category);
    }
  },
  setLanguage: (language) => {
    set({ selectedLanguage: language });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-selected-language', language);
      // Save as manual choice to prevent auto-detection override
      saveManualLanguageChoice(language);
    }
  },

  setLanguageAuto: (language) => {
    // Set language without marking as manual choice (for auto-detection)
    set({ selectedLanguage: language });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-selected-language', language);
    }
  },

  initLanguageFromGeo: async () => {
    // Only run auto-detection if no manual preference
    if (!shouldAutoDetect()) {
      console.log('[ChannelStore] Manual language preference exists, skipping geo-detection');
      return;
    }

    try {
      const result = await getDefaultLanguageFilter();
      console.log('[ChannelStore] Geo-detection result:', result);

      // Only set if still should auto-detect (user might have changed during detection)
      if (shouldAutoDetect()) {
        set({ selectedLanguage: result.language });
        if (typeof window !== 'undefined') {
          localStorage.setItem('stellix-selected-language', result.language);
        }
      }
    } catch (error) {
      console.error('[ChannelStore] Geo-detection failed:', error);
    }
  },

  setCountry: (country) => {
    set({ selectedCountry: country });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-selected-country', country);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleFavorite: (channelId, userId) => {
    const { favorites, favoriteOrder } = get();
    const isFavorite = favorites.includes(channelId);
    const newFavorites = isFavorite
      ? favorites.filter((id) => id !== channelId)
      : [...favorites, channelId];

    // Remove from favoriteOrder when unfavoriting
    const newFavoriteOrder = isFavorite
      ? favoriteOrder.filter((id) => id !== channelId)
      : [...favoriteOrder, channelId];

    set({ favorites: newFavorites, favoriteOrder: newFavoriteOrder });

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-favorites', JSON.stringify(newFavorites));
      localStorage.setItem('stellix-favorite-order', JSON.stringify(newFavoriteOrder));
    }

    // Sync with Firebase if user is logged in
    if (userId) {
      if (isFavorite) {
        removeFavorite(userId, channelId);
      } else {
        addFavorite(userId, channelId);
      }
    }
  },

  setFavoriteOrder: (order) => {
    set({ favoriteOrder: order });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-favorite-order', JSON.stringify(order));
    }
  },

  loadFavoriteOrder: () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('stellix-favorite-order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          set({ favoriteOrder: parsed });
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  },

  setShowOnlyFavorites: (show, userId) => {
    set({ showOnlyFavorites: show });

    // Save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-show-only-favorites', JSON.stringify(show));
    }

    // Sync with Firebase if user is logged in
    if (userId) {
      updateUserSettings(userId, { showOnlyFavorites: show });
    }
  },

  loadFavoritesFromFirebase: async (userId) => {
    try {
      const firebaseFavorites = await getFavorites(userId);
      if (firebaseFavorites.length > 0) {
        set({ favorites: firebaseFavorites });
        if (typeof window !== 'undefined') {
          localStorage.setItem('stellix-favorites', JSON.stringify(firebaseFavorites));
        }
      }
    } catch (error) {
      console.error('Error loading favorites from Firebase:', error);
    }
  },

  loadUserSettings: async (userId) => {
    try {
      const settings = await getUserSettings(userId);
      set({ showOnlyFavorites: settings.showOnlyFavorites });
      if (typeof window !== 'undefined') {
        localStorage.setItem('stellix-show-only-favorites', JSON.stringify(settings.showOnlyFavorites));
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  },

  syncFavoritesToFirebase: async (userId) => {
    try {
      const { favorites } = get();
      await setFavorites(userId, favorites);
    } catch (error) {
      console.error('Error syncing favorites to Firebase:', error);
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  markChannelOffline: (channelId) => {
    const { offlineChannels } = get();
    const newOffline = new Set(offlineChannels);
    newOffline.add(channelId);
    set({ offlineChannels: newOffline });
  },

  markChannelOnline: (channelId) => {
    const { offlineChannels } = get();
    const newOffline = new Set(offlineChannels);
    newOffline.delete(channelId);
    set({ offlineChannels: newOffline });
  },

  setChannelStatus: (channelId, isOnline) => {
    const { offlineChannels } = get();
    const newOffline = new Set(offlineChannels);
    if (isOnline) {
      newOffline.delete(channelId);
    } else {
      newOffline.add(channelId);
    }
    set({ offlineChannels: newOffline });
    // Note: Firebase sync removed to reduce quota usage
  },

  toggleChannelEnabled: (channelId) => {
    const { disabledChannels } = get();
    const newDisabled = new Set(disabledChannels);
    if (newDisabled.has(channelId)) {
      newDisabled.delete(channelId);
    } else {
      newDisabled.add(channelId);
    }
    set({ disabledChannels: newDisabled });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-disabled-channels', JSON.stringify(Array.from(newDisabled)));
    }
  },

  loadDisabledChannels: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stellix-disabled-channels');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          set({ disabledChannels: new Set(parsed) });
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  },

  setGroupBy: (mode) => {
    set({ groupBy: mode });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-group-by', mode);
    }
  },

  loadSavedFilters: () => {
    if (typeof window !== 'undefined') {
      const savedCategory = localStorage.getItem('stellix-selected-category');
      // Note: Language is handled by initLanguageFromGeo() which respects manual vs auto preferences
      // We still load it here as a fallback before geo-detection completes
      const savedLanguage = localStorage.getItem('stellix-selected-language');
      const savedCountry = localStorage.getItem('stellix-selected-country');
      const savedGroupBy = localStorage.getItem('stellix-group-by');

      const updates: Partial<ChannelState> = {};
      if (savedCategory) {
        updates.selectedCategory = savedCategory as ChannelCategory;
      }
      if (savedLanguage) {
        updates.selectedLanguage = savedLanguage;
      }
      if (savedCountry) {
        updates.selectedCountry = savedCountry;
      }
      if (savedGroupBy && (savedGroupBy === 'none' || savedGroupBy === 'country' || savedGroupBy === 'language')) {
        updates.groupBy = savedGroupBy;
      }
      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    }
  },

  loadWatchHistory: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stellix-watch-history');
      if (saved) {
        try {
          const history = JSON.parse(saved) as WatchHistoryItem[];
          set({ watchHistory: history });
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  },

  addToWatchHistory: (channel) => {
    const { watchHistory } = get();
    const now = Date.now();

    // Remove if already exists (to move to top)
    const filtered = watchHistory.filter(h => h.channelId !== channel.id);

    // Add to beginning
    const newHistory = [
      { channelId: channel.id, channelName: channel.name, watchedAt: now },
      ...filtered,
    ].slice(0, 20); // Keep only last 20

    set({ watchHistory: newHistory });

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-watch-history', JSON.stringify(newHistory));
    }
  },

  getRecentChannels: () => {
    const { channels, watchHistory } = get();
    const channelMap = new Map(channels.map(ch => [ch.id, ch]));

    return watchHistory
      .map(h => channelMap.get(h.channelId))
      .filter((ch): ch is Channel => ch !== undefined);
  },

  getFilteredChannels: () => {
    const { channels, selectedCategory, selectedLanguage, selectedCountry, searchQuery, offlineChannels, disabledChannels, showOnlyFavorites, favorites, favoriteOrder } = get();

    // First, deduplicate by URL (keep only first occurrence or primary)
    // Store both channel and its index for O(1) replacement
    const seenUrls = new Map<string, { channel: Channel; index: number }>();
    const deduplicatedChannels: Channel[] = [];

    for (const channel of channels) {
      const url = channel.url?.trim();
      if (!url) {
        // No URL - treat as unique
        deduplicatedChannels.push(channel);
        continue;
      }

      if (!seenUrls.has(url)) {
        // First occurrence of this URL - store with index
        const index = deduplicatedChannels.length;
        seenUrls.set(url, { channel, index });
        deduplicatedChannels.push(channel);
      } else if (channel.isPrimary) {
        // Duplicate URL but this one is primary - replace in O(1)
        const existing = seenUrls.get(url)!;
        deduplicatedChannels[existing.index] = channel;
        seenUrls.set(url, { channel, index: existing.index });
      }
    }

    // Precompute lowercase search query once
    const searchLower = searchQuery?.toLowerCase();
    // Create Set for O(1) favorites lookup
    const favoritesSet = new Set(favorites);

    // Single-pass filter and transform
    const result: Channel[] = [];
    for (const channel of deduplicatedChannels) {
      // Skip disabled channels
      if (disabledChannels.has(channel.id)) continue;

      // Apply filters
      if (selectedCategory !== 'all' && channel.group.toLowerCase() !== selectedCategory) continue;
      if (selectedLanguage !== 'all' && channel.language !== selectedLanguage) continue;
      if (selectedCountry !== 'all' && channel.country !== selectedCountry) continue;
      if (searchLower && !channel.name.toLowerCase().includes(searchLower)) continue;
      if (showOnlyFavorites && !favoritesSet.has(channel.id)) continue;

      // Add with offline status
      result.push({
        ...channel,
        isOffline: offlineChannels.has(channel.id),
      });
    }

    // Sort favorites by user-set order, others by admin order
    if (showOnlyFavorites && favoriteOrder.length > 0) {
      const orderMap = new Map(favoriteOrder.map((id, idx) => [id, idx]));
      return result.sort((a, b) => {
        const posA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const posB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return posA - posB;
      });
    }

    // Sort by admin-set order only (offline channels stay in place)
    return result.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  },

  getAvailableLanguages: () => {
    // Return languages that have at least one channel with current filters (except language filter)
    const { channels, disabledChannels, selectedCategory, selectedCountry, showOnlyFavorites, favorites } = get();
    const languages = new Set<string>();
    channels.forEach((ch) => {
      if (!ch.language) return;
      if (disabledChannels.has(ch.id)) return;
      if (selectedCategory !== 'all' && ch.group.toLowerCase() !== selectedCategory) return;
      if (selectedCountry !== 'all' && ch.country !== selectedCountry) return;
      if (showOnlyFavorites && !favorites.includes(ch.id)) return;
      languages.add(ch.language);
    });
    return Array.from(languages).sort();
  },

  getAvailableCountries: () => {
    // Return countries that have at least one channel with current filters (except country filter)
    const { channels, disabledChannels, selectedCategory, selectedLanguage, showOnlyFavorites, favorites } = get();
    const countries = new Set<string>();
    channels.forEach((ch) => {
      if (!ch.country) return;
      if (disabledChannels.has(ch.id)) return;
      if (selectedCategory !== 'all' && ch.group.toLowerCase() !== selectedCategory) return;
      if (selectedLanguage !== 'all' && ch.language !== selectedLanguage) return;
      if (showOnlyFavorites && !favorites.includes(ch.id)) return;
      countries.add(ch.country);
    });
    return Array.from(countries).sort();
  },

  // Smart counts - apply other filters but NOT the filter being counted
  getLanguageCounts: () => {
    const { channels, disabledChannels, selectedCategory, selectedCountry, showOnlyFavorites, favorites } = get();
    const counts: Record<string, number> = {};
    channels.forEach((ch) => {
      if (disabledChannels.has(ch.id)) return;
      if (selectedCategory !== 'all' && ch.group.toLowerCase() !== selectedCategory) return;
      if (selectedCountry !== 'all' && ch.country !== selectedCountry) return;
      if (showOnlyFavorites && !favorites.includes(ch.id)) return;
      const lang = ch.language || 'unknown';
      counts[lang] = (counts[lang] || 0) + 1;
    });
    return counts;
  },

  getCountryCounts: () => {
    const { channels, disabledChannels, selectedCategory, selectedLanguage, showOnlyFavorites, favorites } = get();
    const counts: Record<string, number> = {};
    channels.forEach((ch) => {
      if (disabledChannels.has(ch.id)) return;
      if (selectedCategory !== 'all' && ch.group.toLowerCase() !== selectedCategory) return;
      if (selectedLanguage !== 'all' && ch.language !== selectedLanguage) return;
      if (showOnlyFavorites && !favorites.includes(ch.id)) return;
      const country = ch.country || 'unknown';
      counts[country] = (counts[country] || 0) + 1;
    });
    return counts;
  },

  getCategoryCounts: () => {
    const { channels, disabledChannels, selectedLanguage, selectedCountry, showOnlyFavorites, favorites } = get();
    const counts: Record<string, number> = {};
    channels.forEach((ch) => {
      if (disabledChannels.has(ch.id)) return;
      if (selectedLanguage !== 'all' && ch.language !== selectedLanguage) return;
      if (selectedCountry !== 'all' && ch.country !== selectedCountry) return;
      if (showOnlyFavorites && !favorites.includes(ch.id)) return;
      const category = ch.group || 'general';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  },

  getAllChannelsWithStatus: () => {
    const { channels, offlineChannels, disabledChannels } = get();
    return channels.map((channel) => ({
      ...channel,
      isOffline: offlineChannels.has(channel.id),
      enabled: !disabledChannels.has(channel.id),
    }));
  },
}));
