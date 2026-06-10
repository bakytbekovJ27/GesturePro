import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: loginCtx } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      if (!res.user.is_staff) {
        setError('Access denied. Only admin users can log in here.');
        setLoading(false);
        return;
      }
      loginCtx(res.user, res.tokens);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card glass-card animate-fade-in" style={{ padding: '40px 36px' }}>
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={24} color="white" fill="white" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>GesturePro</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Panel</p>
          </div>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: 32 }}>
          Sign in with your administrator account
        </p>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--rose-dim)', border: '1px solid rgba(244,63,94,0.25)',
            color: 'var(--rose)', fontSize: '0.875rem', marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="input"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className="input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px 20px' }}
          >
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : (
              <><LogIn size={16} /> Sign In</>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 24 }}>
          Backend: <span style={{ color: 'var(--text-secondary)' }}>127.0.0.1:8000</span>
        </p>
      </div>
    </div>
  );
};
