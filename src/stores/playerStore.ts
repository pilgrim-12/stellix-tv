import { create } from 'zustand';
import { VideoQuality } from '@/types';

interface PlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
  volume: number;
  quality: VideoQuality;
  isLoading: boolean;
  error: string | null;
  currentTime: number;

  // Actions
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;
  setPiP: (pip: boolean) => void;
  togglePiP: () => void;
  setQuality: (quality: VideoQuality) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentTime: (time: number) => void;
  reset: () => void;
}

const initialState = {
  isPlaying: false,
  isMuted: false,
  isFullscreen: false,
  isPiP: false,
  volume: 1,
  quality: 'auto' as VideoQuality,
  isLoading: false,
  error: null,
  currentTime: 0,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  setPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set({ isPlaying: !get().isPlaying }),

  setMuted: (muted) => set({ isMuted: muted }),
  toggleMute: () => set({ isMuted: !get().isMuted }),

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
  toggleFullscreen: () => set({ isFullscreen: !get().isFullscreen }),

  setPiP: (pip) => set({ isPiP: pip }),
  togglePiP: () => set({ isPiP: !get().isPiP }),

  setQuality: (quality) => set({ quality }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentTime: (time) => set({ currentTime: time }),

  reset: () => set(initialState),
}));
