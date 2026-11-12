import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LayoutGrid, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back to Tackboard!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
      toast.success(`Logged in as demo user: ${demoEmail}`);
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: 'var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-modal)',
          padding: '32px 28px',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              marginBottom: '12px',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <LayoutGrid size={20} />
          </div>
          <h1 className="font-display" style={{ fontSize: '24px', fontWeight: 600 }}>
            Tackboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
            Tactile task & board management
          </p>
        </div>

        {/* Demo Account Quick-Fill Buttons */}
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-canvas)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UserCheck size={12} />
            Instant Demo Sign-In
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('alex@tackboard.dev')}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 6px', flexDirection: 'column', gap: '2px' }}
            >
              <strong>Alex</strong>
              <span style={{ fontSize: '9px', color: 'var(--palette-terracotta)' }}>Owner</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('sam@tackboard.dev')}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 6px', flexDirection: 'column', gap: '2px' }}
            >
              <strong>Sam</strong>
              <span style={{ fontSize: '9px', color: 'var(--palette-forest)' }}>Member</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('jordan@tackboard.dev')}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 6px', flexDirection: 'column', gap: '2px' }}
            >
              <strong>Jordan</strong>
              <span style={{ fontSize: '9px', color: 'var(--palette-cobalt)' }}>Viewer</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@tackboard.dev"
              required
              className="input"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '9px', marginTop: '6px' }}
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

