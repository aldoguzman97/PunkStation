import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useWatchPartyStore } from '../store/watchPartyStore';
import { useAuthStore } from '../store/authStore';
import VideoPlayer from '../components/VideoPlayer';
import {
  Users, Send, Copy, Check, ArrowLeft, Radio, X, Smile,
  Crown, Wifi, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const REACTIONS = ['🔥', '😂', '👏', '❤️', '😮', '🤯'];

export default function WatchPartyPage() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    room, viewers, messages, isConnected, isHost,
    syncTime, syncPlaying, loading, error,
    joinRoom, connectSocket, syncPlayback, syncSeek,
    sendMessage, sendReaction, endRoom, disconnect, reset,
  } = useWatchPartyStore();

  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [hlsReady, setHlsReady] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const chatEndRef = useRef(null);
  const lastSyncRef = useRef(0);

  // Join room and connect WebSocket
  useEffect(() => {
    if (!code) return;

    const init = async () => {
      try {
        const roomData = await joinRoom(code);

        // Check if HLS is ready
        try {
          const { data: status } = await axios.get(`${API}/stream/${roomData.media_id}/status`);
          setHlsReady(status.hasHls === true);
        } catch {
          setHlsReady(false);
        }

        // Connect WebSocket
        const token = localStorage.getItem('punk_token');
        if (token) {
          connectSocket(code, token);
        }
      } catch {
        toast.error('Failed to join watch party');
      }
    };

    init();
    return () => {
      disconnect();
      reset();
    };
  }, [code]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for reactions
  useEffect(() => {
    const handler = (e) => {
      const { emoji, username } = e.detail;
      const id = Date.now() + Math.random();
      setFloatingReactions(prev => [...prev, { id, emoji, username }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2000);
    };
    window.addEventListener('watchparty-reaction', handler);
    return () => window.removeEventListener('watchparty-reaction', handler);
  }, []);

  // Host sync handlers
  const handleTimeUpdate = useCallback((time) => {
    if (!isHost) return;
    const now = Date.now();
    // Throttle sync updates to every 3 seconds
    if (now - lastSyncRef.current > 3000) {
      syncPlayback(time, true);
      lastSyncRef.current = now;
    }
  }, [isHost, syncPlayback]);

  const handlePlay = useCallback(() => {
    if (isHost) {
      syncPlayback(0, true); // time will be corrected by timeupdate
    }
  }, [isHost, syncPlayback]);

  const handlePause = useCallback(() => {
    if (isHost) {
      syncPlayback(0, false);
    }
  }, [isHost, syncPlayback]);

  const handleSeeked = useCallback((time) => {
    if (isHost) {
      syncSeek(time);
    }
  }, [isHost, syncSeek]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage(message);
    setMessage('');
  };

  const copyLink = () => {
    const url = `${window.location.origin}/party/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleEndParty = () => {
    if (!window.confirm('End this watch party for everyone?')) return;
    endRoom(room.id);
    navigate('/browse');
  };

  if (loading || !room) {
    return (
      <div className="page-center">
        <div className="cyber-spinner" />
        <p className="font-mono text-dim" style={{ marginTop: '1rem' }}>
          Joining watch party...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-center">
        <p className="text-red font-mono">{error}</p>
        <Link to="/browse" className="cyber-btn" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> BACK TO BROWSE
        </Link>
      </div>
    );
  }

  return (
    <div className="watchparty-page">
      {/* Header */}
      <div className="watchparty-header">
        <div className="watchparty-header__left">
          <Link to="/browse" className="cyber-btn" style={{ padding: '0.5rem 0.75rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} className="text-magenta" />
              WATCH PARTY
            </h1>
            <p className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>
              {room.media_title}
            </p>
          </div>
        </div>
        <div className="watchparty-header__right">
          <span className={`cyber-badge ${isConnected ? 'cyber-badge--green' : 'cyber-badge--red'}`}>
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="cyber-badge">
            <Users size={12} /> {viewers.length}
          </span>
          <button className="cyber-btn" onClick={copyLink} style={{ padding: '0.5rem 0.75rem' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'COPIED' : 'SHARE'}
          </button>
          {isHost && (
            <button className="cyber-btn cyber-btn--red" onClick={handleEndParty} style={{ padding: '0.5rem 0.75rem' }}>
              <X size={14} /> END
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="watchparty-layout">
        {/* Video + reactions */}
        <div className="watchparty-video-section">
          <div className="watchparty-video-wrapper cyber-card" style={{ padding: 0 }}>
            <VideoPlayer
              mediaId={room.media_id}
              filename={room.filename}
              hlsReady={hlsReady}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
              syncTime={syncTime}
              syncPlaying={syncPlaying}
              isWatchParty={true}
              isHost={isHost}
            />

            {/* Floating reactions */}
            <div className="watchparty-reactions-overlay">
              {floatingReactions.map(r => (
                <div key={r.id} className="watchparty-floating-reaction">
                  <span className="watchparty-floating-reaction__emoji">{r.emoji}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reaction bar */}
          <div className="watchparty-reaction-bar">
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                className="watchparty-reaction-btn"
                onClick={() => sendReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar: viewers + chat */}
        <div className="watchparty-sidebar">
          {/* Viewers */}
          <div className="cyber-card watchparty-viewers">
            <h3 className="font-display" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              <Users size={14} className="text-cyan" /> VIEWERS ({viewers.length})
            </h3>
            <div className="watchparty-viewer-list">
              {viewers.map(v => (
                <div key={v.id} className="watchparty-viewer">
                  <div className="watchparty-viewer__avatar">
                    {v.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="font-mono" style={{ fontSize: '0.75rem' }}>
                    {v.username}
                    {v.id === room.host_id && (
                      <Crown size={12} className="text-yellow" style={{ marginLeft: '0.25rem' }} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="cyber-card watchparty-chat">
            <h3 className="font-display" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              LIVE CHAT
            </h3>
            <div className="watchparty-chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className="watchparty-chat-msg">
                  <span className="text-cyan font-mono" style={{ fontSize: '0.7rem' }}>
                    {msg.username}:
                  </span>
                  <span style={{ fontSize: '0.8rem' }}>{msg.message}</span>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="font-mono text-dim" style={{ fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>
                  No messages yet — say hi!
                </p>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="watchparty-chat-input">
              <input
                type="text"
                className="cyber-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={500}
                style={{ fontSize: '0.8rem' }}
              />
              <button type="submit" className="cyber-btn cyber-btn--filled" style={{ padding: '0.5rem 0.75rem' }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Shareable link */}
      <div className="watchparty-share-bar cyber-card" style={{ marginTop: '1rem', padding: '0.75rem 1rem' }}>
        <span className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>SHARE LINK:</span>
        <code className="font-mono text-cyan" style={{ fontSize: '0.8rem', flex: 1 }}>
          {window.location.origin}/party/{code}
        </code>
        <button className="cyber-btn" onClick={copyLink} style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem' }}>
          <Copy size={12} /> COPY
        </button>
      </div>
    </div>
  );
}
