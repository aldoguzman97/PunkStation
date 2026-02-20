import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMediaStore } from '../store/mediaStore';
import { Film, Image, Music, Eye, Search, Grid, List, SlidersHorizontal } from 'lucide-react';

const TYPE_ICONS = { video: Film, image: Image, audio: Music };
const TYPE_COLORS = { video: 'cyan', image: 'magenta', audio: 'yellow' };

export default function BrowsePage() {
  const { items, pagination, fetchMedia, loading } = useMediaStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    sort: searchParams.get('sort') || 'newest',
    search: searchParams.get('search') || '',
  });

  useEffect(() => {
    const params = { page: searchParams.get('page') || 1, limit: 20 };
    if (filters.type) params.type = filters.type;
    if (filters.sort) params.sort = filters.sort;
    if (filters.search) params.search = filters.search;
    fetchMedia(params);
  }, [searchParams, filters, fetchMedia]);

  const applyFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params);
  };

  return (
    <div className="page-browse">
      <div className="browse-header">
        <h1 className="font-display" style={{ fontSize: '1.5rem' }}>
          <span className="text-cyan">MEDIA</span> BROWSER
        </h1>

        <div className="browse-controls">
          {/* Search */}
          <div className="browse-search">
            <Search size={16} className="text-dim" />
            <input
              type="text"
              className="cyber-input"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => applyFilter('search', e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div className="browse-filter-group">
            <SlidersHorizontal size={14} className="text-dim" />
            {['', 'video', 'image', 'audio'].map((t) => (
              <button
                key={t}
                className={`cyber-btn ${filters.type === t ? 'cyber-btn--filled' : ''}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                onClick={() => applyFilter('type', t)}
              >
                {t || 'ALL'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            className="cyber-input"
            style={{ width: 'auto' }}
            value={filters.sort}
            onChange={(e) => applyFilter('sort', e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Popular</option>
            <option value="title">Title</option>
          </select>

          {/* View mode */}
          <div className="browse-view-toggle">
            <button
              className={`topbar-icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} />
            </button>
            <button
              className={`topbar-icon-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="hud-line" />

      {loading ? (
        <div className="page-center">
          <div className="cyber-spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="page-center">
          <p className="font-mono text-dim">No media found</p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'media-grid' : 'media-list'}>
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] || Film;
              const color = TYPE_COLORS[item.type] || 'cyan';

              return (
                <Link to={`/media/${item.id}`} key={item.id} className="media-card cyber-card">
                  <div className="media-card__preview">
                    {item.type === 'image' && item.filename ? (
                      <img
                        src={`http://localhost:3001/uploads/${item.filename}`}
                        alt={item.title}
                        className="media-card__thumb"
                      />
                    ) : (
                      <Icon size={32} className={`text-${color}`} />
                    )}
                    <span className={`cyber-badge cyber-badge--${color === 'cyan' ? '' : color}`}>
                      {item.type}
                    </span>
                  </div>
                  <div className="media-card__info">
                    <h3 className="media-card__title">{item.title}</h3>
                    <div className="media-card__meta font-mono text-dim">
                      <span>@{item.username}</span>
                      <span><Eye size={12} /> {item.views}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="browse-pagination">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`cyber-btn ${p === pagination.page ? 'cyber-btn--filled' : ''}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: p })}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
