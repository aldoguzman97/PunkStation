import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import {
  Users, Film, Eye, Flag, AlertTriangle, Shield,
  HardDrive, TrendingUp, UserPlus, Zap
} from 'lucide-react';

export default function AdminDashboard() {
  const { stats, fetchStats, loading } = useAdminStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading || !stats) {
    return (
      <div className="page-center">
        <div className="cyber-spinner" />
      </div>
    );
  }

  const statCards = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'cyan', link: '/admin/users' },
    { icon: Film, label: 'Total Media', value: stats.totalMedia, color: 'magenta', link: '/admin/media' },
    { icon: Eye, label: 'Total Views', value: stats.totalViews.toLocaleString(), color: 'green' },
    { icon: Flag, label: 'Pending Reports', value: stats.pendingReports, color: 'red', link: '/admin/reports' },
    { icon: AlertTriangle, label: 'Flagged Media', value: stats.flaggedMedia, color: 'yellow' },
    { icon: Shield, label: 'Banned Users', value: stats.bannedUsers, color: 'red' },
    { icon: UserPlus, label: 'New Users (7d)', value: stats.recentSignups, color: 'cyan' },
    { icon: HardDrive, label: 'Storage Used', value: formatBytes(stats.storageUsed), color: 'magenta' },
  ];

  return (
    <div className="page-admin-dash">
      <div className="dash-header">
        <div>
          <h1 className="font-display" style={{ fontSize: '1.5rem' }}>
            <Shield size={20} className="text-magenta" />{' '}
            <span className="text-magenta">ADMIN</span> CONTROL PANEL
          </h1>
          <p className="font-mono text-dim" style={{ marginTop: '0.5rem' }}>
            System overview // All sectors <span className="text-green">OPERATIONAL</span>
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="admin-stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-block" style={{ borderLeftColor: `var(--${card.color})` }}>
            <card.icon size={20} style={{ color: `var(--${card.color})` }} />
            <div className="stat-block__value">{card.value}</div>
            <div className="stat-block__label">{card.label}</div>
            {card.link && (
              <Link
                to={card.link}
                className="font-mono"
                style={{ fontSize: '0.65rem', color: `var(--${card.color})`, textDecoration: 'none', marginTop: '0.25rem' }}
              >
                VIEW &rarr;
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="hud-line" />

      {/* Media distribution */}
      <div className="cyber-card" style={{ marginTop: '1.5rem' }}>
        <h2 className="font-display" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          <TrendingUp size={16} className="text-cyan" /> MEDIA DISTRIBUTION
        </h2>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {stats.mediaByType.map((t) => {
            const pct = stats.totalMedia > 0 ? ((t.count / stats.totalMedia) * 100).toFixed(1) : 0;
            const colors = { video: 'cyan', image: 'magenta', audio: 'yellow' };
            return (
              <div key={t.type} style={{ flex: '1 1 200px' }}>
                <div className="font-mono" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: `var(--${colors[t.type] || 'cyan'})` }}>
                    {t.type.toUpperCase()}
                  </span>
                  <span className="text-dim"> — {t.count} ({pct}%)</span>
                </div>
                <div className="cyber-progress">
                  <div
                    className="cyber-progress__fill"
                    style={{
                      width: `${pct}%`,
                      background: `var(--${colors[t.type] || 'cyan'})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <Link to="/admin/users" className="cyber-btn" style={{ justifyContent: 'center' }}>
          <Users size={16} /> MANAGE USERS
        </Link>
        <Link to="/admin/media" className="cyber-btn cyber-btn--magenta" style={{ justifyContent: 'center' }}>
          <Film size={16} /> MANAGE MEDIA
        </Link>
        <Link to="/admin/reports" className="cyber-btn cyber-btn--red" style={{ justifyContent: 'center' }}>
          <Flag size={16} /> VIEW REPORTS
        </Link>
        <Link to="/admin/audit" className="cyber-btn cyber-btn--green" style={{ justifyContent: 'center' }}>
          <Zap size={16} /> AUDIT LOG
        </Link>
      </div>
    </div>
  );
}
