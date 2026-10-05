import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

interface YouTubeAudioEngineProps {
  youtubeId: string | null;
  isPlaying: boolean;
  volume: number; // 0 - 100
  seekTime: number | null;
  onTimeUpdate: (current: number, duration: number) => void;
  onStateChange: (isPlaying: boolean) => void;
  onEnded: () => void;
}

export function YouTubeAudioEngine({
  youtubeId,
  isPlaying,
  volume,
  seekTime,
  onTimeUpdate,
  onStateChange,
  onEnded,
}: YouTubeAudioEngineProps) {
  const playerRef = useRef<any>(null);
  const containerId = 'yt-hidden-audio-player';

  // Load YouTube IFrame API once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or reload video when youtubeId changes
  useEffect(() => {
    if (!youtubeId) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 150);
        return;
      }

      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({
            videoId: youtubeId,
            startSeconds: 0,
          });
          playerRef.current.playVideo();
          return;
        } catch {
          // Re-init below if loadVideoById failed
        }
      }

      playerRef.current = new window.YT.Player(containerId, {
        height: '10',
        width: '10',
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (event.data === 1) {
              onStateChange(true);
            } else if (event.data === 2) {
              onStateChange(false);
            } else if (event.data === 0) {
              onStateChange(false);
              onEnded();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [youtubeId]);

  // Handle Play/Pause
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // player might still be initializing
    }
  }, [isPlaying]);

  // Handle Volume change
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setVolume(volume);
    } catch {
      // ignore
    }
  }, [volume]);

  // Handle Seek
  useEffect(() => {
    if (seekTime === null || !playerRef.current) return;
    try {
      playerRef.current.seekTo(seekTime, true);
    } catch {
      // ignore
    }
  }, [seekTime]);

  // Poll current time and duration
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const current = playerRef.current.getCurrentTime() || 0;
          const total = playerRef.current.getDuration() || 0;
          if (total > 0) {
            onTimeUpdate(current, total);
          }
        } catch {
          // ignore
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [onTimeUpdate]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: -9999,
        left: -9999,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      <div id={containerId} />
    </div>
  );
}
