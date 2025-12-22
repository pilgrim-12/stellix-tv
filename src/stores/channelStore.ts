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

interface ChannelState {
  channels: Channel[];
  customPlaylists: CustomPlaylist[];
  currentChannel: Channel | null;
  selectedCategory: ChannelCategory;
  selectedLanguage: string; // 'all' or language code
  selectedCountry: string; // 'all' or country name
  searchQuery: string;
  favorites: string[];
  showOnlyFavorites: boolean;
  isLoading: boolean;
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
  loadSavedFilters: () => void;

  // Computed
  getFilteredChannels: () => Channel[];
  getAvailableLanguages: () => string[];
  getAvailableCountries: () => string[];
  getLanguageCounts: () => Record<string, number>;
  getCountryCounts: () => Record<string, number>;
  getCategoryCounts: () => Record<string, number>;
  getAllChannelsWithStatus: () => Channel[];
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
  showOnlyFavorites: false,
  isLoading: false,
  error: null,
  offlineChannels: new Set(),
  disabledChannels: new Set(),

  setChannels: (channels) => set({ channels }),

  loadChannelsFromFirebase: async () => {
    try {
      set({ isLoading: true, error: null });

      // Load from curated_channels (1 read, optimized structure)
      console.log('[ChannelStore] Loading from curated_channels');
      const firebaseChannels = await getActiveCuratedChannels();

      if (firebaseChannels.length > 0) {
        // Merge Firebase data with offline status
        const channels = firebaseChannels.map((ch) => ({
          ...ch,
          isOffline: ch.isOffline || false,
        }));
        set({ channels, isLoading: false });
      } else {
        console.warn('[ChannelStore] No channels found in curated_channels');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading channels from Firebase:', error);
      set({ error: 'Failed to load channels', isLoading: false });
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

    // Save last channel to localStorage
    if (typeof window !== 'undefined' && channel) {
      localStorage.setItem('stellix-last-channel', channel.id);
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
    const { favorites } = get();
    const isFavorite = favorites.includes(channelId);
    const newFavorites = isFavorite
      ? favorites.filter((id) => id !== channelId)
      : [...favorites, channelId];
    set({ favorites: newFavorites });

    // Save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-favorites', JSON.stringify(newFavorites));
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

  loadSavedFilters: () => {
    if (typeof window !== 'undefined') {
      const savedCategory = localStorage.getItem('stellix-selected-category');
      // Note: Language is handled by initLanguageFromGeo() which respects manual vs auto preferences
      // We still load it here as a fallback before geo-detection completes
      const savedLanguage = localStorage.getItem('stellix-selected-language');
      const savedCountry = localStorage.getItem('stellix-selected-country');

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
      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    }
  },

  getFilteredChannels: () => {
    const { channels, selectedCategory, selectedLanguage, selectedCountry, searchQuery, offlineChannels, disabledChannels, showOnlyFavorites, favorites } = get();

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

    // Sort: online first, offline last
    return result.sort((a, b) => {
      if (a.isOffline && !b.isOffline) return 1;
      if (!a.isOffline && b.isOffline) return -1;
      return 0;
    });
  },

  getAvailableLanguages: () => {
    const { channels } = get();
    const languages = new Set<string>();
    channels.forEach((ch) => {
      if (ch.language) languages.add(ch.language);
    });
    return Array.from(languages).sort();
  },

  getAvailableCountries: () => {
    const { channels } = get();
    const countries = new Set<string>();
    channels.forEach((ch) => {
      if (ch.country) countries.add(ch.country);
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
