import { useEffect, useState } from 'react';
import { ListVideo, Plus, Trash2, Lock, Globe } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = async () => {
    try {
      const { data } = await axios.get(`${API}/playlists`);
      setPlaylists(data.playlists);
    } catch {
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlaylists(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await axios.post(`${API}/playlists`, { name, description });
      setName('');
      setDescription('');
      setShowCreate(false);
      fetchPlaylists();
      toast.success('Playlist created');
    } catch {
      toast.error('Create failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this playlist?')) return;
    try {
      await axios.delete(`${API}/playlists/${id}`);
      setPlaylists(playlists.filter(p => p.id !== id));
      toast.success('Playlist deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="page-playlists">
      <div className="browse-header">
        <h1 className="font-display" style={{ fontSize: '1.5rem' }}>
          <ListVideo size={20} className="text-cyan" />{' '}
          <span className="text-cyan">MY</span> PLAYLISTS
        </h1>
        <button className="cyber-btn cyber-btn--filled" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} /> NEW PLAYLIST
        </button>
      </div>

      {showCreate && (
        <div className="cyber-card" style={{ marginTop: '1rem' }}>
          <div className="auth-field">
            <label className="auth-label font-mono">NAME</label>
            <input
              className="cyber-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Playlist name..."
              maxLength={200}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label font-mono">DESCRIPTION</label>
            <input
              className="cyber-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="cyber-btn cyber-btn--filled" onClick={handleCreate}>CREATE</button>
            <button className="cyber-btn" onClick={() => setShowCreate(false)}>CANCEL</button>
          </div>
        </div>
      )}

      <div className="hud-line" />

      {loading ? (
        <div className="page-center"><div className="cyber-spinner" /></div>
      ) : playlists.length === 0 ? (
        <div className="page-center">
          <ListVideo size={48} className="text-dim" />
          <p className="font-mono text-dim" style={{ marginTop: '1rem' }}>No playlists yet</p>
        </div>
      ) : (
        <div className="media-grid">
          {playlists.map((p) => (
            <div key={p.id} className="cyber-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 className="font-display" style={{ fontSize: '1rem' }}>{p.name}</h3>
                  <p className="font-mono text-dim" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {p.item_count} items
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {p.is_public ? (
                    <Globe size={14} className="text-green" />
                  ) : (
                    <Lock size={14} className="text-yellow" />
                  )}
                  <button
                    className="cyber-btn cyber-btn--red"
                    style={{ padding: '0.3rem 0.5rem' }}
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {p.description && (
                <p className="text-dim" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  {p.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
