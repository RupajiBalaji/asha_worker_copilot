import React, { useState, useEffect, useCallback, useMemo } from 'react';

export default function SupervisorScreen({ apiBase, onSelectPatient, onSwitchUser }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchWorker, setSearchWorker] = useState('');
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchEfficiencyData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/supervisor/efficiency`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch efficiency report`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load supervisor data');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchEfficiencyData();
  }, [fetchEfficiencyData]);

  // Load individual worker drilldown
  const handleInspectWorker = async (workerName) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${apiBase}/supervisor/worker/${encodeURIComponent(workerName)}/activity`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedWorkerDetail(detail);
      }
    } catch (e) {
      console.error('Error fetching worker detail:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    if (!report?.workers) return [];
    return report.workers.filter(w => {
      const matchSearch = (w.name || '').toLowerCase().includes(searchWorker.toLowerCase()) ||
        (w.village || '').toLowerCase().includes(searchWorker.toLowerCase()) ||
        (w.label || '').toLowerCase().includes(searchWorker.toLowerCase());
      return matchSearch;
    });
  }, [report, searchWorker]);

  // Filtered activity log entries
  const filteredActivity = useMemo(() => {
    if (!report?.activity_log) return [];
    return report.activity_log.filter(a => {
      if (workerFilter !== 'all' && a.worker_name !== workerFilter) return false;
      if (entryTypeFilter !== 'all' && a.type !== entryTypeFilter) return false;
      if (riskFilter !== 'all') {
        if (riskFilter === 'critical' && a.risk_level !== 'critical') return false;
        if (riskFilter === 'high' && a.risk_level !== 'high') return false;
        if (riskFilter === 'normal' && (a.risk_level === 'critical' || a.risk_level === 'high')) return false;
      }
      return true;
    });
  }, [report, workerFilter, entryTypeFilter, riskFilter]);

  const summary = report?.summary;

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      {/* ─── Manager Header Banner ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #0369a1 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl)',
        color: 'white',
        marginBottom: 'var(--space-lg)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.18)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 10,
              letterSpacing: '0.5px',
            }}>
              👨🏽‍⚕️ PHC HEALTH SUPERVISOR & MOIC PORTAL
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 }}>
              Frontline ASHA Worker Efficiency & Clinical Audit
            </h2>
            <p style={{ fontSize: 13, opacity: 0.9, margin: 0, maxWidth: 640 }}>
              Live managerial oversight dashboard. Monitor clinical entries recorded by ASHA workers, track patient coverage quotas, audit high-risk case escalations, and evaluate block-level healthcare performance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchEfficiencyData}
              className="btn-secondary"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
            >
              🔄 Refresh Metrics
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-secondary"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
            >
              🖨️ Print Audit Report
            </button>
          </div>
        </div>

        {/* Live Status indicator */}
        <div style={{ marginTop: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, opacity: 0.85 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Live Audit Stream Active
          </span>
          <span>•</span>
          <span>Jurisdiction: Nandipuram Block (8 Sub-Centers)</span>
          <span>•</span>
          <span>Date: {summary?.evaluation_date || 'Today'}</span>
        </div>
      </div>

      {loading && !report ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div className="spinner" style={{ margin: '0 auto var(--space-md)' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Analyzing ASHA worker entries and compiling efficiency scorecards...
          </p>
        </div>
      ) : error ? (
        <div style={{
          background: 'var(--color-critical-bg)',
          color: 'var(--color-critical)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      ) : (
        <>
          {/* ─── Top KPI Metric Cards ─── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
          }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #1e40af' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>👩‍⚕️</div>
              <div className="stat-value">{summary?.total_workers || 0}</div>
              <div className="stat-label">Active ASHA Staff</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Across all block hamlets</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #0d9488' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>👥</div>
              <div className="stat-value">{summary?.total_patients || 0}</div>
              <div className="stat-label">Patients Registered</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Digital health registry</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>🩺</div>
              <div className="stat-value">{summary?.total_visits || 0}</div>
              <div className="stat-label">Field Visits Logged</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Vitals & Danger signs audited</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>🚨</div>
              <div className="stat-value" style={{ color: '#dc2626' }}>{summary?.total_escalations || 0}</div>
              <div className="stat-label">High-Risk Interceptions</div>
              <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4 }}>
                {summary?.critical_cases || 0} Critical · {summary?.high_risk_cases || 0} High
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>📅</div>
              <div className="stat-value">{summary?.overall_compliance_rate || 0}%</div>
              <div className="stat-label">Follow-up Compliance</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {summary?.followups_completed || 0} Done · {summary?.followups_overdue || 0} Overdue
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>⚡</div>
              <div className="stat-value" style={{ color: '#b45309' }}>{summary?.average_efficiency_score || 0}%</div>
              <div className="stat-label">Block Efficiency Index</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Composite performance metric</div>
            </div>
          </div>

          {/* ─── Section 1: ASHA Worker Efficiency Leaderboard ─── */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📊 ASHA Worker Performance & Efficiency Leaderboard
                </h3>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Evaluated based on monthly visit quotas, timely follow-up resolutions, and clinical danger sign coverage
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="🔍 Search worker or village..."
                  className="form-input"
                  style={{ width: 220, fontSize: 12, padding: '6px 12px' }}
                  value={searchWorker}
                  onChange={(e) => setSearchWorker(e.target.value)}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>ASHA Worker</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700 }}>Sector / Village</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Patients</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Visits / Target Progress</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>High-Risk Detected</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Follow-ups (Done / Due)</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Efficiency Score</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map((w, index) => {
                    return (
                      <tr
                        key={w.name}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Worker Identity */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 24 }}>{w.avatar}</span>
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>
                                {w.name}
                                {index === 0 && <span style={{ marginLeft: 6, fontSize: 11, color: '#f59e0b' }}>⭐ Top</span>}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', gap: 6 }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{w.label}</span>
                                <span>•</span>
                                <span>{w.worker_id}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Village & PHC */}
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontWeight: 600 }}>📍 {w.village}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>🏥 {w.phc}</div>
                        </td>

                        {/* Registered Patients */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{w.patients_registered}</span>
                        </td>

                        {/* Visits / Target Progress Bar */}
                        <td style={{ padding: '12px 14px', minWidth: 160 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                            <span>{w.visits_completed} visits</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Target: {w.target_visits}</span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: 7,
                            background: '#e2e8f0',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${w.target_progress_pct}%`,
                              height: '100%',
                              background: w.target_progress_pct >= 100 ? '#16a34a' : w.target_progress_pct >= 70 ? '#0284c7' : '#f59e0b',
                              borderRadius: 'var(--radius-full)',
                            }} />
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {w.target_progress_pct}% quota completed
                          </div>
                        </td>

                        {/* High-Risk Detected */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            background: w.total_high_risk > 0 ? 'var(--color-critical-bg)' : '#f1f5f9',
                            color: w.total_high_risk > 0 ? 'var(--color-critical)' : '#64748b',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 700,
                          }}>
                            🚨 {w.critical_cases} Crit · {w.high_risk_cases} High
                          </span>
                        </td>

                        {/* Followups */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>
                            <span style={{ color: '#16a34a' }}>{w.followups_done} done</span> / <span style={{ color: '#dc2626' }}>{w.followups_overdue} overdue</span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                            {w.compliance_rate}% on-time
                          </div>
                        </td>

                        {/* Efficiency Rating */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                          }}>
                            <span style={{
                              background: w.badge_color,
                              color: '#fff',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 12,
                              fontWeight: 800,
                            }}>
                              {w.efficiency_score}%
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: w.badge_color }}>
                              {w.efficiency_grade}
                            </span>
                          </div>
                        </td>

                        {/* Action Drilldown */}
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleInspectWorker(w.name)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                          >
                            🔍 Audit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Section 2: Live Activity Audit Feed (Entries Logged by Workers) ─── */}
          <div className="card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📡 Live Worker Entry Audit Stream
                </h3>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Real-time audit log of patient registrations, vitals recorded, and referrals logged by ASHA workers
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Worker selector */}
                <select
                  className="form-select"
                  value={workerFilter}
                  onChange={(e) => setWorkerFilter(e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px' }}
                >
                  <option value="all">All Workers ({report?.workers?.length || 0})</option>
                  {report?.workers?.map(w => (
                    <option key={w.name} value={w.name}>{w.name} ({w.label})</option>
                  ))}
                </select>

                {/* Entry Type */}
                <select
                  className="form-select"
                  value={entryTypeFilter}
                  onChange={(e) => setEntryTypeFilter(e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px' }}
                >
                  <option value="all">All Action Types</option>
                  <option value="visit">🩺 Visits & Vitals</option>
                  <option value="registration">👥 Patient Registrations</option>
                </select>

                {/* Risk Filter */}
                <select
                  className="form-select"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px' }}
                >
                  <option value="all">All Severity</option>
                  <option value="critical">🔴 Critical Only</option>
                  <option value="high">🟠 High Risk</option>
                  <option value="normal">🟢 Normal / Low</option>
                </select>
              </div>
            </div>

            {/* Entries List */}
            {filteredActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-secondary)' }}>
                No entry records matched the selected filter criteria.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredActivity.slice(0, 25).map((entry) => {
                  const isVisit = entry.type === 'visit';
                  const isCrit = entry.risk_level === 'critical';
                  const isHigh = entry.risk_level === 'high';
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isCrit ? '#fef2f2' : isHigh ? '#fffbeb' : 'var(--color-surface-2)',
                        border: isCrit ? '1px solid #fecaca' : isHigh ? '1px solid #fde68a' : '1px solid var(--color-border)',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>{isVisit ? '🩺' : '📝'}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: '#0D5C55',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}>
                              {entry.worker_name}
                            </span>

                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                              {entry.patient_name} <span style={{ fontWeight: 500, fontSize: 11, color: 'var(--color-text-secondary)' }}>({entry.patient_age}y {entry.patient_gender})</span>
                            </span>

                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                              📍 {entry.village}
                            </span>
                          </div>

                          <div style={{ fontSize: 12, color: 'var(--color-text)', marginTop: 2 }}>
                            {entry.findings}
                          </div>

                          {entry.needs_referral && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                              🚨 Referral Generated — Escalated to PHC / Taluk Hospital
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: isCrit ? '#dc2626' : isHigh ? '#ea580c' : '#16a34a',
                          color: '#fff',
                        }}>
                          {entry.risk_level}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          🕒 {entry.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Worker Detail Drilldown Modal ─── */}
      {selectedWorkerDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedWorkerDetail(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: 680, width: '94%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  🔍 Clinical Activity Audit — {selectedWorkerDetail.worker_name}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Total {selectedWorkerDetail.total_patients} patients assigned • Detailed log of consultations and follow-up duties
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedWorkerDetail(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: 'var(--space-lg)', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Recent Visits Section */}
              <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 var(--space-sm)' }}>
                🩺 Recent Clinical Visits Conducted ({selectedWorkerDetail.recent_visits?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-lg)' }}>
                {selectedWorkerDetail.recent_visits?.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No recent visits recorded.</div>
                ) : (
                  selectedWorkerDetail.recent_visits.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{v.patient_name}</strong> • BP: {v.systolic_bp || '—'}/{v.diastolic_bp || '—'} mmHg • Sugar: {v.blood_sugar || '—'} mg/dL • Hb: {v.hemoglobin || '—'} g/dL
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{v.visit_date}</div>
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: v.risk_level === 'critical' ? '#dc2626' : v.risk_level === 'high' ? '#ea580c' : '#16a34a',
                        color: '#fff',
                      }}>
                        {v.risk_level}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Assigned Follow-ups Section */}
              <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 var(--space-sm)' }}>
                📅 Follow-up Obligations ({selectedWorkerDetail.followups?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedWorkerDetail.followups?.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No scheduled follow-ups pending.</div>
                ) : (
                  selectedWorkerDetail.followups.slice(0, 10).map((f) => (
                    <div
                      key={f.id}
                      style={{
                        padding: '8px 12px',
                        background: f.status === 'done' ? '#f0fdf4' : '#fff',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{f.patient_name}</strong> • Type: {f.type} • Due: {f.due_date}
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: f.status === 'done' ? '#16a34a' : '#ea580c',
                        color: '#fff',
                      }}>
                        {f.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-md)' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedWorkerDetail(null)}
                style={{ marginLeft: 'auto' }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
