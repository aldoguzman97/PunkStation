import { useEffect, useState } from 'react';
import { useAdminStore } from '../../store/adminStore';
import {
  Users, Search, Shield, ShieldOff, Trash2, UserCog,
  Ban, CheckCircle, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { users, fetchUsers, banUser, unbanUser, changeRole, deleteUser, loading } = useAdminStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionMenu, setActionMenu] = useState(null);

  useEffect(() => {
    fetchUsers({ search, role: roleFilter || undefined });
  }, [search, roleFilter, fetchUsers]);

  const handleBan = async (id) => {
    try {
      await banUser(id);
      toast.success('User banned');
    } catch { toast.error('Ban failed'); }
    setActionMenu(null);
  };

  const handleUnban = async (id) => {
    try {
      await unbanUser(id);
      toast.success('User unbanned');
    } catch { toast.error('Unban failed'); }
    setActionMenu(null);
  };

  const handleRoleChange = async (id, role) => {
    try {
      await changeRole(id, role);
      toast.success(`Role changed to ${role}`);
    } catch { toast.error('Role change failed'); }
    setActionMenu(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this user and all their data?')) return;
    try {
      await deleteUser(id);
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
    setActionMenu(null);
  };

  return (
    <div className="page-admin-users">
      <h1 className="font-display" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        <Users size={20} className="text-cyan" />{' '}
        <span className="text-cyan">USER</span> MANAGEMENT
      </h1>

      {/* Filters */}
      <div className="browse-controls" style={{ marginBottom: '1rem' }}>
        <div className="browse-search">
          <Search size={16} className="text-dim" />
          <input
            className="cyber-input"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="browse-filter-group">
          {['', 'user', 'admin'].map((r) => (
            <button
              key={r}
              className={`cyber-btn ${roleFilter === r ? 'cyber-btn--filled' : ''}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              onClick={() => setRoleFilter(r)}
            >
              {r ? r.toUpperCase() : 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="page-center"><div className="cyber-spinner" /></div>
      ) : (
        <div className="cyber-card" style={{ overflow: 'auto' }}>
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Media</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="text-cyan font-mono">@{u.username}</span>
                  </td>
                  <td className="text-dim">{u.email}</td>
                  <td>
                    <span className={`cyber-badge ${u.role === 'admin' ? 'cyber-badge--magenta' : ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.mediaCount}</td>
                  <td>
                    {u.is_banned ? (
                      <span className="cyber-badge cyber-badge--red">BANNED</span>
                    ) : (
                      <span className="cyber-badge cyber-badge--green">ACTIVE</span>
                    )}
                  </td>
                  <td className="text-dim font-mono" style={{ fontSize: '0.75rem' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ position: 'relative' }}>
                      <button
                        className="cyber-btn"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                        onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}
                      >
                        <UserCog size={12} /> <ChevronDown size={10} />
                      </button>

                      {actionMenu === u.id && (
                        <div className="admin-action-menu">
                          {u.is_banned ? (
                            <button onClick={() => handleUnban(u.id)}>
                              <CheckCircle size={12} className="text-green" /> Unban
                            </button>
                          ) : (
                            <button onClick={() => handleBan(u.id)}>
                              <Ban size={12} className="text-red" /> Ban
                            </button>
                          )}
                          {u.role === 'user' ? (
                            <button onClick={() => handleRoleChange(u.id, 'admin')}>
                              <Shield size={12} className="text-magenta" /> Make Admin
                            </button>
                          ) : (
                            <button onClick={() => handleRoleChange(u.id, 'user')}>
                              <ShieldOff size={12} /> Remove Admin
                            </button>
                          )}
                          <button onClick={() => handleDelete(u.id)} style={{ color: 'var(--red)' }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>
                    <span className="font-mono text-dim">No users found</span>
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
