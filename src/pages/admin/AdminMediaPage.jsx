import { useEffect, useState } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { Film, Search, Eye, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  active:  { icon: CheckCircle, color: 'green', label: 'Active' },
  pending: { icon: Clock, color: 'yellow', label: 'Pending' },
  flagged: { icon: AlertTriangle, color: 'red', label: 'Flagged' },
  removed: { icon: XCircle, color: 'red', label: 'Removed' },
};

export default function AdminMediaPage() {
  const { media, fetchMedia, changeMediaStatus, loading } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchMedia({
      search: search || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
    });
  }, [search, statusFilter, typeFilter, fetchMedia]);

  const handleStatusChange = async (id, status) => {
    try {
      await changeMediaStatus(id, status);
      toast.success(`Status changed to ${status}`);
    } catch { toast.error('Status change failed'); }
  };

  return (
    <div className="page-admin-media">
      <h1 className="font-display" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        <Film size={20} className="text-magenta" />{' '}
        <span className="text-magenta">MEDIA</span> MANAGEMENT
      </h1>

      <div className="browse-controls" style={{ marginBottom: '1rem' }}>
        <div className="browse-search">
          <Search size={16} className="text-dim" />
          <input
            className="cyber-input"
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="browse-filter-group">
          {['', 'active', 'pending', 'flagged', 'removed'].map((s) => (
            <button
              key={s}
              className={`cyber-btn ${statusFilter === s ? 'cyber-btn--filled' : ''}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
              onClick={() => setStatusFilter(s)}
            >
              {s ? s.toUpperCase() : 'ALL'}
            </button>
          ))}
        </div>

        <div className="browse-filter-group">
          {['', 'video', 'image', 'audio'].map((t) => (
            <button
              key={t}
              className={`cyber-btn ${typeFilter === t ? 'cyber-btn--filled' : ''}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
              onClick={() => setTypeFilter(t)}
            >
              {t ? t.toUpperCase() : 'TYPE'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="page-center"><div className="cyber-spinner" /></div>
      ) : (
        <div className="cyber-card" style={{ overflow: 'auto' }}>
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>User</th>
                <th>Views</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {media.map((m) => {
                const st = STATUS_MAP[m.status] || STATUS_MAP.active;
                return (
                  <tr key={m.id}>
                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title}
                    </td>
                    <td>
                      <span className={`cyber-badge ${m.type === 'image' ? 'cyber-badge--magenta' : m.type === 'audio' ? 'cyber-badge--yellow' : ''}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="text-cyan font-mono">@{m.username}</td>
                    <td><Eye size={12} /> {m.views}</td>
                    <td>
                      <span className={`cyber-badge cyber-badge--${st.color}`}>
                        <st.icon size={10} /> {st.label}
                      </span>
                    </td>
                    <td className="text-dim font-mono" style={{ fontSize: '0.75rem' }}>
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <select
                        className="cyber-input"
                        style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                        value={m.status}
                        onChange={(e) => handleStatusChange(m.id, e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="flagged">Flagged</option>
                        <option value="removed">Removed</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {media.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>
                    <span className="font-mono text-dim">No media found</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
