import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMediaStore } from '../store/mediaStore';
import {
  Film, Image, Music, Eye, Heart, Upload, TrendingUp, Clock, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { items, fetchMedia } = useMediaStore();
  const [stats, setStats] = useState({ videos: 0, images: 0, audio: 0, totalViews: 0 });

  useEffect(() => {
    fetchMedia({ user_id: user.id, limit: 50 }).then(() => {});
  }, [user.id, fetchMedia]);

  useEffect(() => {
    const videos = items.filter(i => i.type === 'video').length;
    const images = items.filter(i => i.type === 'image').length;
    const audio = items.filter(i => i.type === 'audio').length;
    const totalViews = items.reduce((s, i) => s + (i.views || 0), 0);
    setStats({ videos, images, audio, totalViews });
  }, [items]);

  return (
    <div className="page-dashboard">
      {/* Welcome header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title font-display">
            <span className="text-cyan">WELCOME BACK,</span>{' '}
            <span className="glitch-text" data-text={user.username.toUpperCase()}>
              {user.username.toUpperCase()}
            </span>
          </h1>
          <p className="font-mono text-dim" style={{ marginTop: '0.5rem' }}>
            System status: <span className="text-green">OPERATIONAL</span> // Session active
          </p>
        </div>
        <Link to="/upload" className="cyber-btn cyber-btn--filled">
          <Upload size={16} />
          UPLOAD MEDIA
        </Link>
      </div>

      {/* Stats grid */}
      <div className="dash-stats">
        <div className="stat-block border-cyan">
          <Film size={20} className="text-cyan" />
          <div className="stat-block__value">{stats.videos}</div>
          <div className="stat-block__label">Videos</div>
        </div>
        <div className="stat-block" style={{ borderLeftColor: 'var(--magenta)' }}>
          <Image size={20} className="text-magenta" />
          <div className="stat-block__value">{stats.images}</div>
          <div className="stat-block__label">Images</div>
        </div>
        <div className="stat-block" style={{ borderLeftColor: 'var(--purple)' }}>
          <Music size={20} style={{ color: 'var(--purple)' }} />
          <div className="stat-block__value">{stats.audio}</div>
          <div className="stat-block__label">Audio</div>
        </div>
        <div className="stat-block" style={{ borderLeftColor: 'var(--green)' }}>
          <Eye size={20} className="text-green" />
          <div className="stat-block__value">{stats.totalViews.toLocaleString()}</div>
          <div className="stat-block__label">Total Views</div>
        </div>
      </div>

      <div className="hud-line" />

      {/* Recent media */}
      <div className="dash-section">
        <h2 className="dash-section__title font-display">
          <Clock size={18} className="text-cyan" />
          RECENT UPLOADS
        </h2>

        {items.length === 0 ? (
          <div className="dash-empty cyber-card">
            <Zap size={48} className="text-dim" />
            <p className="font-mono text-dim">No media uploaded yet</p>
            <Link to="/upload" className="cyber-btn" style={{ marginTop: '1rem' }}>
              <Upload size={16} />
              UPLOAD YOUR FIRST FILE
            </Link>
          </div>
        ) : (
          <div className="media-grid">
            {items.slice(0, 8).map((item) => (
              <Link to={`/media/${item.id}`} key={item.id} className="media-card cyber-card">
                <div className="media-card__preview">
                  {item.type === 'video' && <Film size={32} className="text-cyan" />}
                  {item.type === 'image' && <Image size={32} className="text-magenta" />}
                  {item.type === 'audio' && <Music size={32} style={{ color: 'var(--purple)' }} />}
                  <span className={`cyber-badge cyber-badge--${item.type === 'video' ? '' : item.type === 'image' ? 'magenta' : 'yellow'}`}>
                    {item.type}
                  </span>
                </div>
                <div className="media-card__info">
                  <h3 className="media-card__title">{item.title}</h3>
                  <div className="media-card__meta font-mono text-dim">
                    <span><Eye size={12} /> {item.views}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
