import { create } from 'zustand';
import { Channel, ChannelCategory } from '@/types';

interface ChannelState {
  channels: Channel[];
  currentChannel: Channel | null;
  selectedCategory: ChannelCategory;
  selectedLanguage: string; // 'all' or language code
  searchQuery: string;
  favorites: string[];
  isLoading: boolean;
  error: string | null;
  offlineChannels: Set<string>;

  // Actions
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  setCategory: (category: ChannelCategory) => void;
  setLanguage: (language: string) => void;
  setSearchQuery: (query: string) => void;
  toggleFavorite: (channelId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markChannelOffline: (channelId: string) => void;
  markChannelOnline: (channelId: string) => void;

  // Computed
  getFilteredChannels: () => Channel[];
  getAvailableLanguages: () => string[];
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  currentChannel: null,
  selectedCategory: 'all',
  selectedLanguage: 'all',
  searchQuery: '',
  favorites: [],
  isLoading: false,
  error: null,
  offlineChannels: new Set(),

  setChannels: (channels) => set({ channels }),
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

  getFilteredChannels: () => {
    const { channels, selectedCategory, selectedLanguage, searchQuery, offlineChannels } = get();

    return channels
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
}));
