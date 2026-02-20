import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Zap, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ login: '', username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        if (!form.login.trim()) {
          toast.error('Enter your username or email');
          return;
        }
        if (!form.password) {
          toast.error('Enter your password');
          return;
        }
        const user = await login(form.login.trim(), form.password);
        toast.success(`Welcome back, ${user.username}`);
        navigate(user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        if (!form.username.trim()) {
          toast.error('Choose a username');
          return;
        }
        if (!form.email.trim()) {
          toast.error('Enter your email');
          return;
        }
        if (!form.password) {
          toast.error('Enter a password');
          return;
        }
        const user = await register(form.username.trim(), form.email.trim(), form.password);
        toast.success(`Account created. Welcome, ${user.username}`);
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const switchMode = (newMode) => {
    setMode(newMode);
    useAuthStore.setState({ error: null });
  };

  return (
    <div className="auth-page grid-bg">
      {/* Decorative background elements */}
      <div className="auth-bg-grid" />
      <div className="auth-bg-glow auth-bg-glow--cyan" />
      <div className="auth-bg-glow auth-bg-glow--magenta" />

      <div className="auth-container">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <Zap size={40} className="text-cyan" style={{ filter: 'drop-shadow(0 0 12px rgba(0,240,255,.6))' }} />
          </div>
          <h1 className="auth-title glitch-text" data-text="PUNKSTATION">
            PUNKSTATION
          </h1>
          <p className="auth-subtitle font-mono text-dim">
            MEDIA // INFOTAINMENT // SYSTEM v1.0
          </p>
          <div className="hud-line" style={{ margin: '1rem auto', maxWidth: '200px' }} />
        </div>

        {/* Mode toggle */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            <Shield size={14} />
            AUTHENTICATE
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            <Zap size={14} />
            REGISTER
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <div className="auth-field">
              <label className="auth-label font-mono">USERNAME / EMAIL</label>
              <input
                type="text"
                className="cyber-input"
                placeholder="Enter credentials..."
                value={form.login}
                onChange={update('login')}
                required
                autoComplete="username"
              />
            </div>
          ) : (
            <>
              <div className="auth-field">
                <label className="auth-label font-mono">USERNAME</label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Choose handle..."
                  value={form.username}
                  onChange={update('username')}
                  required
                  minLength={3}
                  maxLength={30}
                  autoComplete="username"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label font-mono">EMAIL</label>
                <input
                  type="email"
                  className="cyber-input"
                  placeholder="your@email.net"
                  value={form.email}
                  onChange={update('email')}
                  required
                  autoComplete="email"
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label className="auth-label font-mono">PASSWORD</label>
            <div className="auth-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="cyber-input"
                placeholder="••••••••"
                value={form.password}
                onChange={update('password')}
                required
                minLength={mode === 'register' ? 8 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {mode === 'register' && (
              <p className="auth-hint font-mono text-dim">
                Min 8 chars · uppercase · lowercase · number · special char
              </p>
            )}
          </div>

          <button
            type="submit"
            className="cyber-btn cyber-btn--filled cyber-btn--lg auth-submit"
            disabled={loading}
          >
            {loading ? (
              <div className="cyber-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                {mode === 'login' ? 'JACK IN' : 'CREATE IDENTITY'}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer font-mono text-dim">
          <div className="auth-security-badge">
            <Shield size={12} />
            <span>AES-256 // BCRYPT-12 // JWT-HS256</span>
          </div>
        </div>
      </div>
    </div>
  );
}
