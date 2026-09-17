import React, { useState } from 'react';
import { STATIC_PROFILES, authenticateUser } from './profiles';

export default function LoginModal({ currentUser, onSelectUser, onClose }) {
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' or 'form'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleQuickSelect = (profile) => {
    onSelectUser(profile);
    onClose();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');
    const user = authenticateUser(username, password);
    if (user) {
      onSelectUser(user);
      onClose();
    } else {
      setError('Invalid username or password. Check the demo credentials hint below.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 540, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔐 User Profiles & Static Logins
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Switch between Frontline ASHA Workers and PHC Supervisor / Manager mode
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Modal Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          padding: '0 var(--space-lg)',
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('quick'); setError(''); }}
            style={{
              padding: '12px 16px',
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'quick' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'quick' ? '3px solid var(--color-primary)' : '3px solid transparent',
            }}
          >
            ⚡ 1-Click Quick Switcher
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('form'); setError(''); }}
            style={{
              padding: '12px 16px',
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'form' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'form' ? '3px solid var(--color-primary)' : '3px solid transparent',
            }}
          >
            🔑 Credentials Login Form
          </button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--space-lg)' }}>
          {/* Currently Logged-in Indicator */}
          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-accent-light)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 'var(--space-md)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{currentUser.avatar}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary-dark)' }}>
                    Currently Active Profile
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
                    {currentUser.name} <span style={{ fontWeight: 500, fontSize: 12 }}>({currentUser.worker_label})</span>
                  </div>
                </div>
              </div>
              <span style={{
                background: currentUser.role === 'manager' ? '#1e3a8a' : 'var(--color-primary)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
              }}>
                {currentUser.role === 'manager' ? 'Supervisor Mode' : 'Worker Mode'}
              </span>
            </div>
          )}

          {activeTab === 'quick' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                Select a profile to switch instantly (no password required for presentation):
              </div>

              {STATIC_PROFILES.map((profile) => {
                const isActive = currentUser?.id === profile.id;
                const isManager = profile.role === 'manager';
                return (
                  <div
                    key={profile.id}
                    onClick={() => handleQuickSelect(profile)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isActive
                        ? '2px solid var(--color-primary)'
                        : isManager
                          ? '1px solid #93c5fd'
                          : '1px solid var(--color-border)',
                      background: isActive
                        ? 'rgba(13, 92, 85, 0.05)'
                        : isManager
                          ? '#f0f7ff'
                          : 'var(--color-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{profile.avatar}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{profile.name}</span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: isManager ? '#1e3a8a' : '#0D5C55',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}>
                            {profile.worker_label}
                          </span>
                          {isActive && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                              Active ✓
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          📍 {profile.village} • 🏥 {profile.phc} • ID: {profile.worker_id}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        padding: '6px 14px',
                        fontSize: 12,
                        background: isManager ? '#1e3a8a' : 'var(--color-primary)',
                      }}
                    >
                      {isActive ? 'Current' : 'Switch'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleFormSubmit}>
              {error && (
                <div style={{
                  background: 'var(--color-critical-bg)',
                  color: 'var(--color-critical)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 'var(--space-md)',
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Username
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. asha1, asha2, asha3, or manager"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 700 }}
              >
                Sign In to Account
              </button>

              {/* Demo Credentials Cheat Sheet for Professor */}
              <div style={{
                marginTop: 'var(--space-lg)',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 'var(--radius-md)',
                fontSize: 11,
              }}>
                <div style={{ fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  📋 Demo Login Credentials (for presentation):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: '#475569' }}>
                  <div>• <strong>asha1</strong> / <code>password123</code> (Worker 1)</div>
                  <div>• <strong>asha2</strong> / <code>password123</code> (Worker 2)</div>
                  <div>• <strong>asha3</strong> / <code>password123</code> (Worker 3)</div>
                  <div>• <strong>manager</strong> / <code>admin123</code> (Supervisor)</div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
