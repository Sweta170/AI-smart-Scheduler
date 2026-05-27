import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.user, data.token);
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failed. Make sure the server is running.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoIcon}>M</div>
          <h1 style={styles.title}>MeetAI</h1>
          <p style={styles.subtitle}>Smart Scheduling Workspace</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleBtn}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" style={styles.submitBtn}>
            Sign in to MeetAI
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an account?{' '}
            <a href="/register" style={styles.link}>
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#060a14',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    background: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  logoIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: '800',
    marginBottom: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: 0,
    fontFamily: "'Outfit', sans-serif",
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: 'rgba(15, 23, 42, 0.35)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#f1f5f9',
    outline: 'none',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.35)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '10px',
    padding: '12px 16px',
    paddingRight: '60px',
    fontSize: '14px',
    color: '#f1f5f9',
    outline: 'none',
  },
  toggleBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#6366f1',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    marginTop: '10px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    color: '#ef4444',
    padding: '10px 14px',
    fontSize: '13px',
    textAlign: 'center',
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '600',
  },
};
