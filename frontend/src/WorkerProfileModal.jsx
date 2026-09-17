import React, { useState, useEffect } from 'react';

export default function WorkerProfileModal({ user, apiBase, onClose, onSwitchProfile }) {
  const [workerData, setWorkerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${apiBase}/supervisor/worker/${encodeURIComponent(user.name)}/activity`)
      .then(res => res.json())
      .then(data => setWorkerData(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [user, apiBase]);

  const isManager = user?.role === 'manager';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 580, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              {isManager ? '👨🏽‍⚕️ Supervisor Profile' : '👩🏽‍⚕️ ASHA Worker Profile'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Official Frontline Healthcare Credentials & Work Log
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--space-lg)', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Identity Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: isManager ? '#eff6ff' : 'var(--color-accent-light)',
            border: isManager ? '1px solid #bfdbfe' : '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div style={{
              fontSize: 42,
              background: '#fff',
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {user.avatar}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>
                  {user.name}
                </h3>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: isManager ? '#1e3a8a' : 'var(--color-primary)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}>
                  {user.worker_label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Worker ID: <strong>{user.worker_id}</strong> • Experience: {user.experience}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                📍 Sector: <strong>{user.village}</strong> • 🏥 PHC: <strong>{user.phc}</strong>
              </div>
            </div>
          </div>

          {/* Quick Contact & Bio */}
          <div style={{
            background: 'var(--color-surface-2)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            marginBottom: 'var(--space-md)',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-text)' }}>Role Description:</div>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {user.bio}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <span>📞 {user.phone}</span>
              {user.email && <span>✉️ {user.email}</span>}
            </div>
          </div>

          {/* Work Efficiency Metrics */}
          {!isManager && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-primary)', margin: '0 0 8px' }}>
                📈 My Monthly Efficiency & Quotas
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 12,
              }}>
                <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                    {loading ? '...' : (workerData?.total_patients || 0)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>Registered Patients</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0284c7' }}>
                    {loading ? '...' : (workerData?.recent_visits?.length || 0)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>Recent Consultations</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c' }}>
                    {loading ? '...' : (workerData?.followups?.filter(f => f.status === 'upcoming')?.length || 0)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>Pending Follow-ups</div>
                </div>
              </div>

              {/* Progress to target */}
              {user.monthly_target_visits > 0 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    <span>Monthly Field Consultation Target</span>
                    <span>{workerData?.recent_visits?.length || 0} / {user.monthly_target_visits} Visits</span>
                  </div>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round(((workerData?.recent_visits?.length || 0) / user.monthly_target_visits) * 100))}%`,
                      background: 'var(--color-primary)',
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supervisor Information */}
          {!isManager && (
            <div style={{
              border: '1px dashed #cbd5e1',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontSize: 12,
              background: '#fafafa',
            }}>
              <div style={{ fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                👨🏽‍⚕️ Reporting Supervisor / MOIC:
              </div>
              <div style={{ color: 'var(--color-text)' }}>
                <strong>Dr. Rajesh Sharma</strong> (PHC Medical Officer In-Charge)
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Field consultations and risk referrals are automatically audited by supervisor portal.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-md)', display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onSwitchProfile}
          >
            🔄 Switch Profile / Login
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
