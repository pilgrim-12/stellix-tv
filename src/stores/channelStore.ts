import { create } from 'zustand';
import { Channel, ChannelCategory } from '@/types';

interface ChannelState {
  channels: Channel[];
  currentChannel: Channel | null;
  selectedCategory: ChannelCategory;
  searchQuery: string;
  favorites: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  setCategory: (category: ChannelCategory) => void;
  setSearchQuery: (query: string) => void;
  toggleFavorite: (channelId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredChannels: () => Channel[];
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  currentChannel: null,
  selectedCategory: 'all',
  searchQuery: '',
  favorites: [],
  isLoading: false,
  error: null,

  setChannels: (channels) => set({ channels }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleFavorite: (channelId) => {
    const { favorites } = get();
    const newFavorites = favorites.includes(channelId)
      ? favorites.filter((id) => id !== channelId)
      : [...favorites, channelId];
    set({ favorites: newFavorites });
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('stellix-favorites', JSON.stringify(newFavorites));
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getFilteredChannels: () => {
    const { channels, selectedCategory, searchQuery } = get();

    return channels.filter((channel) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        channel.group.toLowerCase() === selectedCategory;

      const matchesSearch =
        !searchQuery ||
        channel.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  },
}));
