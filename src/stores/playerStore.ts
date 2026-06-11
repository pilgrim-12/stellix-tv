import { create } from 'zustand';
import { VideoQuality } from '@/types';

// Load saved volume/mute from localStorage
function loadVolumeSettings(): { volume: number; isMuted: boolean } {
  if (typeof window === 'undefined') return { volume: 1, isMuted: false };
  try {
    const saved = localStorage.getItem('stellix-volume');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 1,
        isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : false,
      };
    }
  } catch { /* ignore */ }
  return { volume: 1, isMuted: false };
}

function saveVolumeSettings(volume: number, isMuted: boolean) {
  try {
    localStorage.setItem('stellix-volume', JSON.stringify({ volume, isMuted }));
  } catch { /* ignore */ }
}

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

const savedVolume = loadVolumeSettings();

const initialState = {
  isPlaying: false,
  isMuted: savedVolume.isMuted,
  isFullscreen: false,
  isPiP: false,
  volume: savedVolume.volume,
  quality: 'auto' as VideoQuality,
  isLoading: false,
  error: null,
  currentTime: 0,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  setPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set({ isPlaying: !get().isPlaying }),

  setMuted: (muted) => {
    set({ isMuted: muted });
    saveVolumeSettings(get().volume, muted);
  },
  toggleMute: () => {
    const muted = !get().isMuted;
    set({ isMuted: muted });
    saveVolumeSettings(get().volume, muted);
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
    saveVolumeSettings(clamped, get().isMuted);
  },

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
