import { create } from 'zustand';
import { Channel, ChannelCategory } from '@/types';

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
  searchQuery: string;
  favorites: string[];
  isLoading: boolean;
  error: string | null;
  offlineChannels: Set<string>;
  disabledChannels: Set<string>; // admin-disabled channels

  // Actions
  setChannels: (channels: Channel[]) => void;
  addCustomPlaylist: (playlist: CustomPlaylist) => void;
  removeCustomPlaylist: (playlistId: string) => void;
  togglePlaylistEnabled: (playlistId: string) => void;
  loadCustomPlaylists: () => void;
  setCurrentChannel: (channel: Channel | null) => void;
  setCategory: (category: ChannelCategory) => void;
  setLanguage: (language: string) => void;
  setSearchQuery: (query: string) => void;
  toggleFavorite: (channelId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markChannelOffline: (channelId: string) => void;
  markChannelOnline: (channelId: string) => void;
  setChannelStatus: (channelId: string, isOnline: boolean) => void;
  toggleChannelEnabled: (channelId: string) => void;
  loadDisabledChannels: () => void;

  // Computed
  getFilteredChannels: () => Channel[];
  getAvailableLanguages: () => string[];
  getAllChannelsWithStatus: () => Channel[];
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  customPlaylists: [],
  currentChannel: null,
  selectedCategory: 'all',
  selectedLanguage: 'all',
  searchQuery: '',
  favorites: [],
  isLoading: false,
  error: null,
  offlineChannels: new Set(),
  disabledChannels: new Set(),

  setChannels: (channels) => set({ channels }),

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
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  setCategory: (category) => set({ selectedCategory: category }),
  setLanguage: (language) => set({ selectedLanguage: language }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleFavorite: (channelId) => {
    const { favorites } = get();
    const newFavorites = favorites.includes(channelId)
      ? favorites.filter((id) => id !== channelId)
      : [...favorites, channelId];
    set({ favorites: newFavorites });
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-favorites', JSON.stringify(newFavorites));
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

  getFilteredChannels: () => {
    const { channels, selectedCategory, selectedLanguage, searchQuery, offlineChannels, disabledChannels } = get();

    return channels
      .filter((channel) => !disabledChannels.has(channel.id)) // exclude disabled channels
      .map((channel) => ({
        ...channel,
        isOffline: offlineChannels.has(channel.id),
      }))
      .filter((channel) => {
        const matchesCategory =
          selectedCategory === 'all' ||
          channel.group.toLowerCase() === selectedCategory;

        const matchesLanguage =
          selectedLanguage === 'all' ||
          channel.language === selectedLanguage;

        const matchesSearch =
          !searchQuery ||
          channel.name.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesLanguage && matchesSearch;
      })
      .sort((a, b) => {
        // Online channels first
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

  getAllChannelsWithStatus: () => {
    const { channels, offlineChannels, disabledChannels } = get();
    return channels.map((channel) => ({
      ...channel,
      isOffline: offlineChannels.has(channel.id),
      enabled: !disabledChannels.has(channel.id),
    }));
  },
}));
