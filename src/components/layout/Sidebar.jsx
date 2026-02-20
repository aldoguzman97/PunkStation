import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, Upload, Film, Image, Music, ListVideo,
  Settings, Shield, Users, BarChart3, Flag, ScrollText,
  LogOut, Zap, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const userLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'Upload' },
    { to: '/browse', icon: Film, label: 'Browse' },
    { to: '/playlists', icon: ListVideo, label: 'Playlists' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: 'Admin Panel' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/media', icon: Film, label: 'All Media' },
    { to: '/admin/reports', icon: Flag, label: 'Reports' },
    { to: '/admin/audit', icon: ScrollText, label: 'Audit Log' },
  ];

  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`;

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <Zap size={24} className="text-cyan" />
        {!collapsed && (
          <span className="sidebar-logo__text glitch-text" data-text="PUNKSTATION">
            PUNKSTATION
          </span>
        )}
      </div>

      <div className="hud-line" />

      {/* Nav links */}
      <nav className="sidebar-nav">
        {userLinks.map((link) => (
          <NavLink key={link.to} to={link.to} className={linkClass}>
            <link.icon size={20} />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}

        {isAdmin() && (
          <>
            <div className="sidebar-divider">
              {!collapsed && <span className="text-magenta font-mono">ADMIN</span>}
            </div>
            {adminLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass} end={link.to === '/admin'}>
                <link.icon size={20} />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="sidebar-footer">
        <div className="hud-line" />
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user__avatar">
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="sidebar-user__info">
              <div className="sidebar-user__name">{user?.username}</div>
              <div className="sidebar-user__role">
                <span className={`cyber-badge ${user?.role === 'admin' ? 'cyber-badge--magenta' : ''}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        )}
        <button className="sidebar-link sidebar-link--logout" onClick={logout}>
          <LogOut size={20} />
          {!collapsed && <span>Disconnect</span>}
        </button>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
