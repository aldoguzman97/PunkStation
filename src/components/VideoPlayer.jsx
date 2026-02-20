import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Settings, Maximize, Minimize, Volume2, VolumeX, Play, Pause } from 'lucide-react';

const SERVER_URL = 'http://localhost:3001';

export default function VideoPlayer({
  mediaId,
  filename,
  hlsReady = false,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeeked,
  syncTime,
  syncPlaying,
  isWatchParty = false,
  isHost = false,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState(-1); // -1 = auto
  const [qualities, setQualities] = useState([]);
  const [showQuality, setShowQuality] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const syncingRef = useRef(false);

  // Initialize HLS or fallback to direct playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsReady && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(`${SERVER_URL}/api/stream/${mediaId}/master.m3u8`);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((level, i) => ({
          index: i,
          height: level.height,
          bitrate: level.bitrate,
          label: `${level.height}p`,
        }));
        setQualities(levels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('[HLS] Fatal error:', data.type);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });

      hlsRef.current = hls;
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (hlsReady && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = `${SERVER_URL}/api/stream/${mediaId}/master.m3u8`;
    } else {
      // Fallback to direct file playback
      video.src = `${SERVER_URL}/uploads/${filename}`;
    }
  }, [mediaId, filename, hlsReady]);

  // Handle watch party sync (incoming commands)
  useEffect(() => {
    if (!isWatchParty || isHost) return;
    const video = videoRef.current;
    if (!video) return;

    if (syncTime !== undefined && Math.abs(video.currentTime - syncTime) > 2) {
      syncingRef.current = true;
      video.currentTime = syncTime;
      setTimeout(() => { syncingRef.current = false; }, 500);
    }

    if (syncPlaying !== undefined) {
      if (syncPlaying && video.paused) {
        video.play().catch(() => {});
      } else if (!syncPlaying && !video.paused) {
        video.pause();
      }
    }
  }, [syncTime, syncPlaying, isWatchParty, isHost]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
    if (onTimeUpdate && !syncingRef.current) {
      onTimeUpdate(video.currentTime);
    }
  }, [onTimeUpdate]);

  const handlePlay = () => {
    setIsPlaying(true);
    if (onPlay) onPlay();
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (onPause) onPause();
  };

  const handleSeeked = () => {
    if (onSeeked && !syncingRef.current) {
      onSeeked(videoRef.current?.currentTime || 0);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isWatchParty && !isHost) return; // Only host controls in watch party
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleSeek = (e) => {
    if (isWatchParty && !isHost) return;
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
    if (videoRef.current) videoRef.current.volume = val;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !muted;
    setMuted(newMuted);
    video.muted = newMuted;
  };

  const setQualityLevel = (index) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
    setShowQuality(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="video-player-container">
      <video
        ref={videoRef}
        className="video-player-element"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        onClick={togglePlay}
        playsInline
      />

      {/* Custom controls */}
      <div className="video-player-controls">
        {/* Progress bar */}
        <div className="video-player-progress" onClick={handleSeek}>
          <div className="video-player-progress__buffered" style={{ width: `${(buffered / duration) * 100}%` }} />
          <div className="video-player-progress__fill" style={{ width: `${(currentTime / duration) * 100}%` }} />
        </div>

        <div className="video-player-controls__row">
          {/* Play/Pause */}
          <button className="video-player-btn" onClick={togglePlay} disabled={isWatchParty && !isHost}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Volume */}
          <button className="video-player-btn" onClick={toggleMute}>
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            className="video-player-volume"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
          />

          {/* Time */}
          <span className="video-player-time font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Quality selector */}
          {qualities.length > 0 && (
            <div className="video-player-quality-wrapper">
              <button className="video-player-btn" onClick={() => setShowQuality(!showQuality)}>
                <Settings size={16} />
                <span className="font-mono" style={{ fontSize: '0.7rem' }}>
                  {quality === -1 ? 'AUTO' : qualities[quality]?.label || ''}
                </span>
              </button>
              {showQuality && (
                <div className="video-player-quality-menu">
                  <button
                    className={quality === -1 ? 'active' : ''}
                    onClick={() => setQualityLevel(-1)}
                  >
                    Auto
                  </button>
                  {qualities.map((q) => (
                    <button
                      key={q.index}
                      className={quality === q.index ? 'active' : ''}
                      onClick={() => setQualityLevel(q.index)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button className="video-player-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Watch party overlay */}
      {isWatchParty && !isHost && (
        <div className="video-player-sync-badge font-mono">
          HOST CONTROLS PLAYBACK
        </div>
      )}
    </div>
  );
}
