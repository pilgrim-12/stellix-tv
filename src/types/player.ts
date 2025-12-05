export interface PlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
  volume: number;
  quality: VideoQuality;
  isLoading: boolean;
  error: string | null;
}

export type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export interface PlayerControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
  setQuality: (quality: VideoQuality) => void;
}
