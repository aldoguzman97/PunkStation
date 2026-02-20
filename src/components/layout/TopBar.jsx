import { useAuthStore } from '../../store/authStore';
import { Search, Bell, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/browse?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-system-status">
          <Zap size={14} className="text-green" />
          <span className="font-mono text-dim" style={{ fontSize: '0.7rem' }}>
            SYS:ONLINE
          </span>
        </div>
      </div>

      <form className="topbar-search" onSubmit={handleSearch}>
        <Search size={16} className="topbar-search__icon" />
        <input
          type="text"
          className="cyber-input topbar-search__input"
          placeholder="Search media..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <div className="topbar-right">
        <button className="topbar-icon-btn">
          <Bell size={18} />
        </button>
        <div className="topbar-user-chip">
          <div className="topbar-user-chip__avatar">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="font-mono">{user?.username}</span>
        </div>
      </div>
    </header>
  );
}
