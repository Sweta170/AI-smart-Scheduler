import React, { useState, useEffect } from 'react';

export default function Integrations() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check connection status on page load
  const checkConnection = async () => {
    try {
      const token = localStorage.getItem('meetai_token');
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsConnected(data.user.googleCalendar?.connected || false);
      }
    } catch (err) {
      console.error('Failed to fetch connection status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect button click handler
  const connectGoogle = () => {
    const token = localStorage.getItem('meetai_token');
    window.location.href = `http://localhost:5000/api/calendar/connect?token=${token}`;
  };

  const disconnectGoogle = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('meetai_token');
      const res = await fetch('http://localhost:5000/api/calendar/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsConnected(false);
      }
    } catch (err) {
      console.error('Failed to disconnect Google Calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncGoogle = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('meetai_token');
      const res = await fetch('http://localhost:5000/api/calendar/sync/google', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.synced) {
        alert(`Successfully imported ${data.eventsImported} events!`);
      }
    } catch (err) {
      console.error('Failed to sync Google Calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // After redirect back from Google
  // URL will have ?connected=true
  useEffect(() => {
    checkConnection();

    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setIsConnected(true);
      // Clean up the URL query params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="integrations-page" style={{ padding: '24px', color: 'var(--text-primary)' }}>
      <h2>Calendar Integrations</h2>
      <div className="integration-card" style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginTop: '16px' }}>
        <h3>Google Calendar</h3>
        <p>Sync work meetings and auto-detect scheduling conflicts.</p>
        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓ Connected</span>
            <button onClick={syncGoogle} className="btn btn-primary" disabled={isLoading}>Sync Now</button>
            <button onClick={disconnectGoogle} className="btn btn-secondary" disabled={isLoading}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connectGoogle} className="btn btn-primary" style={{ marginTop: '12px' }} disabled={isLoading}>Connect</button>
        )}
      </div>
    </div>
  );
}
