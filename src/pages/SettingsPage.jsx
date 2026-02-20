import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Settings, User, Lock, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const [bio, setBio] = useState(user?.bio || '');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ bio });
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      return toast.error('Passwords do not match');
    }
    if (passwords.new.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }

    setSaving(true);
    try {
      await changePassword(passwords.current, passwords.new);
      setPasswords({ current: '', new: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-settings">
      <h1 className="font-display" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        <Settings size={20} className="text-cyan" />{' '}
        <span className="text-cyan">SYSTEM</span> SETTINGS
      </h1>

      {/* Profile section */}
      <div className="cyber-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="font-display" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          <User size={16} className="text-cyan" /> IDENTITY MODULE
        </h2>

        <div className="settings-field">
          <label className="auth-label font-mono">USERNAME</label>
          <input
            type="text"
            className="cyber-input"
            value={user?.username || ''}
            disabled
            style={{ opacity: 0.5 }}
          />
          <span className="font-mono text-dim" style={{ fontSize: '0.7rem' }}>
            Handle cannot be changed
          </span>
        </div>

        <div className="settings-field">
          <label className="auth-label font-mono">EMAIL</label>
          <input
            type="email"
            className="cyber-input"
            value={user?.email || ''}
            disabled
            style={{ opacity: 0.5 }}
          />
        </div>

        <div className="settings-field">
          <label className="auth-label font-mono">BIO</label>
          <textarea
            className="cyber-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            style={{ resize: 'vertical', fontFamily: 'var(--font-mono)' }}
            placeholder="Tell the network about yourself..."
          />
          <span className="font-mono text-dim" style={{ fontSize: '0.7rem' }}>
            {bio.length}/500
          </span>
        </div>

        <button className="cyber-btn cyber-btn--filled" onClick={handleProfileSave} disabled={saving}>
          <Save size={14} /> SAVE PROFILE
        </button>
      </div>

      {/* Password section */}
      <div className="cyber-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="font-display" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          <Lock size={16} className="text-magenta" />{' '}
          <span className="text-magenta">SECURITY</span> MODULE
        </h2>

        <div className="settings-field">
          <label className="auth-label font-mono">CURRENT PASSWORD</label>
          <input
            type="password"
            className="cyber-input"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            autoComplete="current-password"
          />
        </div>

        <div className="settings-field">
          <label className="auth-label font-mono">NEW PASSWORD</label>
          <input
            type="password"
            className="cyber-input"
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            autoComplete="new-password"
          />
        </div>

        <div className="settings-field">
          <label className="auth-label font-mono">CONFIRM NEW PASSWORD</label>
          <input
            type="password"
            className="cyber-input"
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            autoComplete="new-password"
          />
        </div>

        <button className="cyber-btn cyber-btn--magenta" onClick={handlePasswordChange} disabled={saving}>
          <Shield size={14} /> UPDATE PASSWORD
        </button>
      </div>

      {/* Account info */}
      <div className="cyber-card">
        <h2 className="font-display" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          ACCOUNT DATA
        </h2>
        <div className="font-mono text-dim" style={{ fontSize: '0.8rem', lineHeight: 2 }}>
          <div>Role: <span className={user?.role === 'admin' ? 'text-magenta' : 'text-cyan'}>{user?.role?.toUpperCase()}</span></div>
          <div>Created: {new Date(user?.created_at).toLocaleDateString()}</div>
          <div>User ID: <span className="text-dim">{user?.id}</span></div>
        </div>
      </div>
    </div>
  );
}
