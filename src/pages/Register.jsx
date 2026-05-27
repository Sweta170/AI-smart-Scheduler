import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, timezone }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.user, data.token);
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Registration failed');
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
          <p style={styles.subtitle}>Create your FYP Account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. priya@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Local Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={styles.select}
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
              <option value="Europe/London">Europe/London (GMT/BST - UTC+1:00)</option>
              <option value="America/New_York">America/New_York (EST - UTC-5:00)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST - UTC-8:00)</option>
            </select>
          </div>

          <button type="submit" style={styles.submitBtn}>
            Register Account
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <a href="/login" style={styles.link}>
              Login
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
    padding: '20px',
  },
  card: {
    background: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
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
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
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
  select: {
    background: 'rgba(15, 23, 42, 0.35)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#f1f5f9',
    outline: 'none',
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
    marginTop: '24px',
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
