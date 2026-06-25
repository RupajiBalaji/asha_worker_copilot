import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const RISK_COLOR = {
  low: 'var(--color-low)',
  medium: 'var(--color-medium)',
  high: 'var(--color-high)',
  critical: 'var(--color-critical)',
};

// ─── API Client ───────────────────────────────────────────────────────────
const api = {
  async post(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `API error: ${res.status}`);
    }
    return res.json();
  },
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `API error: ${res.status}`);
    }
    return res.json();
  },
  async patch(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `API error: ${res.status}`);
    }
    return res.json();
  },
};

// ─── Utility helpers ──────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(dateStr) {
  return dateStr && new Date(dateStr) < new Date();
}

function daysFromNow(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function patientInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  return (parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1);
}

// ─── Shared UI Components ─────────────────────────────────────────────────

function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}

function RiskBadge({ level }) {
  if (!level) return null;
  return <span className={`risk-badge ${level}`}>{level}</span>;
}

function Alert({ type = 'error', children }) {
  const icons = { error: '⚠️', success: '✅', warning: '⚡', info: 'ℹ️' };
  return (
    <div className={`alert alert-${type}`} role="alert">
      <span>{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}

function EmptyState({ icon, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || '📭'}</div>
      <p>{message}</p>
      {action && <div className="mt-md">{action}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Patient Registration Form ────────────────────────────────────────────
function PatientForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'female',
    village: '',
    phone: '',
    address: '',
    asha_worker_name: '',
    is_pregnant: false,
    is_child: false,
    existing_diabetes: false,
    existing_hypertension: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Auto-set is_child when age < 5
  useEffect(() => {
    if (form.age !== '') {
      setForm(prev => ({ ...prev, is_child: parseInt(form.age) < 5 }));
    }
  }, [form.age]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const patient = await api.post('/patients/', {
        ...form,
        age: parseInt(form.age),
      });
      onSuccess(patient);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <Alert type="error">{error}</Alert>}

        <p className="form-section-title">👤 Personal Details</p>

        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input
            id="reg-name"
            className="form-input"
            type="text"
            name="name"
            placeholder="Enter patient name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Age (years) *</label>
            <input
              id="reg-age"
              className="form-input"
              type="number"
              name="age"
              placeholder="Age"
              value={form.age}
              onChange={handleChange}
              min="0"
              max="120"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Gender *</label>
            <select id="reg-gender" className="form-select" name="gender" value={form.gender} onChange={handleChange}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Village *</label>
          <input
            id="reg-village"
            className="form-input"
            type="text"
            name="village"
            placeholder="Village / town name"
            value={form.village}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input id="reg-phone" className="form-input" type="tel" name="phone" placeholder="Mobile number" value={form.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">ASHA Worker Name</label>
            <input id="reg-asha" className="form-input" type="text" name="asha_worker_name" placeholder="Your name" value={form.asha_worker_name} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <input id="reg-address" className="form-input" type="text" name="address" placeholder="Full address" value={form.address} onChange={handleChange} />
        </div>

        <p className="form-section-title">🏥 Medical Profile</p>

        <div className="checkbox-grid">
          <label className="checkbox-label">
            <input type="checkbox" name="is_pregnant" checked={form.is_pregnant} onChange={handleChange} id="chk-pregnant" />
            🤰 Pregnant
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="is_child" checked={form.is_child} onChange={handleChange} id="chk-child" />
            👶 Child (&lt;5 yrs)
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="existing_diabetes" checked={form.existing_diabetes} onChange={handleChange} id="chk-diabetes" />
            🩸 Diabetes
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="existing_hypertension" checked={form.existing_hypertension} onChange={handleChange} id="chk-hypertension" />
            💉 Hypertension
          </label>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <button id="submit-register" type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <><Spinner /> Registering...</> : '✅ Register Patient'}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flexShrink: 0 }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

// ─── Visit Form ───────────────────────────────────────────────────────────
const DANGER_SIGNS = [
  { id: 'bleeding',              label: '🩸 Vaginal bleeding' },
  { id: 'severe_headache',       label: '🤕 Severe headache / blurred vision' },
  { id: 'reduced_fetal_movement',label: '🚼 Reduced fetal movement' },
  { id: 'high_fever',            label: '🌡️ High fever' },
  { id: 'convulsions',           label: '⚡ Convulsions / fits' },
  { id: 'severe_abdominal_pain', label: '😣 Severe abdominal pain' },
  { id: 'swelling',              label: '🦶 Sudden swelling of face/hands/feet' },
];

function VisitForm({ patient, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    blood_sugar_mg_dl: '',
    hemoglobin_g_dl: '',
    temperature_c: '',
    pulse_bpm: '',
    weight_kg: '',
    height_cm: '',
    pregnancy_danger_signs: [],
    trimester: '',
    child_age_months: '',
    muac_cm: '',
    diarrhea: false,
    symptoms: [],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bmi = calcBMI(form.weight_kg, form.height_cm);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleDangerSign = (id) => {
    setForm(prev => ({
      ...prev,
      pregnancy_danger_signs: prev.pregnancy_danger_signs.includes(id)
        ? prev.pregnancy_danger_signs.filter(s => s !== id)
        : [...prev.pregnancy_danger_signs, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const assessment = await api.post(`/visits/${patient.id}/assess`, {
        ...form,
        patient_id: patient.id,
        systolic_bp: form.systolic_bp ? parseInt(form.systolic_bp) : null,
        diastolic_bp: form.diastolic_bp ? parseInt(form.diastolic_bp) : null,
        blood_sugar_mg_dl: form.blood_sugar_mg_dl ? parseFloat(form.blood_sugar_mg_dl) : null,
        hemoglobin_g_dl: form.hemoglobin_g_dl ? parseFloat(form.hemoglobin_g_dl) : null,
        temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
        pulse_bpm: form.pulse_bpm ? parseInt(form.pulse_bpm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        trimester: form.trimester ? parseInt(form.trimester) : null,
        child_age_months: form.child_age_months ? parseInt(form.child_age_months) : null,
        muac_cm: form.muac_cm ? parseFloat(form.muac_cm) : null,
      });
      onSuccess(assessment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <Alert type="error">{error}</Alert>}

        <div className="alert alert-info">
          📋 Recording visit for <strong>{patient.name}</strong> — {patient.age} years, {patient.village}
        </div>

        {/* Vitals */}
        <p className="form-section-title">🩺 Vital Signs</p>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Systolic BP (mmHg)</label>
            <input id="v-sbp" className="form-input" type="number" name="systolic_bp" placeholder="e.g. 120" value={form.systolic_bp} onChange={handleChange} min="40" max="300" />
          </div>
          <div className="form-group">
            <label className="form-label">Diastolic BP (mmHg)</label>
            <input id="v-dbp" className="form-input" type="number" name="diastolic_bp" placeholder="e.g. 80" value={form.diastolic_bp} onChange={handleChange} min="20" max="200" />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Blood Sugar (mg/dL)</label>
            <input id="v-sugar" className="form-input" type="number" name="blood_sugar_mg_dl" placeholder="e.g. 100" value={form.blood_sugar_mg_dl} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Hemoglobin (g/dL)</label>
            <input id="v-hb" className="form-input" type="number" step="0.1" name="hemoglobin_g_dl" placeholder="e.g. 12.5" value={form.hemoglobin_g_dl} onChange={handleChange} />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Temperature (°C)</label>
            <input id="v-temp" className="form-input" type="number" step="0.1" name="temperature_c" placeholder="e.g. 37.0" value={form.temperature_c} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Pulse Rate (bpm)</label>
            <input id="v-pulse" className="form-input" type="number" name="pulse_bpm" placeholder="e.g. 80" value={form.pulse_bpm} onChange={handleChange} />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input id="v-weight" className="form-input" type="number" step="0.1" name="weight_kg" placeholder="e.g. 55.0" value={form.weight_kg} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Height (cm)</label>
            <input id="v-height" className="form-input" type="number" step="0.1" name="height_cm" placeholder="e.g. 160" value={form.height_cm} onChange={handleChange} />
          </div>
        </div>

        {/* Live BMI */}
        {bmi && (
          <div className="alert alert-info">
            📊 Calculated BMI: <strong>{bmi}</strong>
            {parseFloat(bmi) < 16 ? ' — Severely underweight' :
             parseFloat(bmi) < 18.5 ? ' — Underweight' :
             parseFloat(bmi) < 25 ? ' — Normal' :
             parseFloat(bmi) < 30 ? ' — Overweight' : ' — Obese'}
          </div>
        )}

        {/* Pregnancy section */}
        {patient.is_pregnant && (
          <>
            <p className="form-section-title">🤰 Pregnancy Assessment</p>

            <div className="form-group">
              <label className="form-label">Trimester</label>
              <select id="v-trimester" className="form-select" name="trimester" value={form.trimester} onChange={handleChange}>
                <option value="">Select trimester</option>
                <option value="1">1st Trimester (0–12 weeks)</option>
                <option value="2">2nd Trimester (13–26 weeks)</option>
                <option value="3">3rd Trimester (27+ weeks)</option>
              </select>
            </div>

            <div style={{ background: 'var(--color-critical-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid #f5b7b1' }}>
              <p style={{ fontWeight: 700, color: 'var(--color-critical)', marginBottom: 'var(--space-sm)', fontSize: 13 }}>
                ⚠️ Check for ANC Danger Signs:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)' }}>
                {DANGER_SIGNS.map(sign => (
                  <label key={sign.id} className="checkbox-label" style={{ fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={form.pregnancy_danger_signs.includes(sign.id)}
                      onChange={() => toggleDangerSign(sign.id)}
                    />
                    {sign.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Child section */}
        {patient.is_child && (
          <>
            <p className="form-section-title">👶 Child Assessment</p>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Age (months)</label>
                <input id="v-child-age" className="form-input" type="number" name="child_age_months" placeholder="Age in months" value={form.child_age_months} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">MUAC (cm)</label>
                <input id="v-muac" className="form-input" type="number" step="0.1" name="muac_cm" placeholder="e.g. 13.5" value={form.muac_cm} onChange={handleChange} />
              </div>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" id="v-diarrhea" name="diarrhea" checked={form.diarrhea} onChange={handleChange} />
              💧 Diarrhea present
            </label>
          </>
        )}

        {/* Notes */}
        <p className="form-section-title">📝 Notes</p>
        <div className="form-group">
          <textarea
            id="v-notes"
            className="form-input"
            name="notes"
            placeholder="Additional observations, symptoms, or remarks..."
            value={form.notes}
            onChange={handleChange}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button id="submit-visit" type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <><Spinner /> Assessing...</> : '🔬 Record Visit & Assess'}
          </button>
          {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flexShrink: 0 }}>Cancel</button>}
        </div>
      </div>
    </form>
  );
}

// ─── Assessment Result ────────────────────────────────────────────────────
function AssessmentResult({ assessment, patient, onNewVisit, onDone }) {
  const level = assessment.risk_level;
  const riskBgColors = {
    low: 'var(--color-low)',
    medium: 'var(--color-medium)',
    high: 'var(--color-high)',
    critical: 'var(--color-critical)',
  };
  const sortOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedFlags = [...(assessment.flags || [])].sort((a, b) =>
    (sortOrder[a.severity] ?? 4) - (sortOrder[b.severity] ?? 4)
  );

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      {/* Risk Banner */}
      <div className={`risk-banner ${level}`}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: riskBgColors[level], marginBottom: 4 }}>
            Final Risk Assessment
          </div>
          <div className="risk-level-big">{level.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {patient?.name} • {formatDate(assessment.visit?.visit_date)}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>ML Confidence</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: riskBgColors[level] }}>
            {(assessment.ml_confidence * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Rule: <strong style={{ color: 'var(--color-text)' }}>{assessment.rule_risk_level?.toUpperCase()}</strong>
            {' '}· ML: <strong style={{ color: 'var(--color-text)' }}>{assessment.ml_risk_level?.toUpperCase()}</strong>
          </div>
        </div>
      </div>

      {/* Referral Alert */}
      {assessment.needs_referral && (
        <div className="alert alert-error mb-lg">
          <div>
            <strong>⚠️ Referral Required</strong>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              This patient must be referred to a Primary Health Center (PHC) or hospital.
              {assessment.referral_id && (
                <a
                  href={`${API_BASE}/referrals/pdf/${assessment.referral_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 8, color: 'var(--color-critical)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  📄 Download Referral Letter (PDF)
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clinical Flags */}
      <div className="card mb-lg">
        <div className="card-header">
          <h3 className="card-title">🚩 Clinical Flags ({sortedFlags.length})</h3>
        </div>
        <div className="card-body">
          {sortedFlags.length > 0 ? (
            sortedFlags.map((flag, i) => (
              <div key={i} className={`flag-card ${flag.severity}`}>
                <div className="flag-header">{flag.category.replace(/_/g, ' ')} — {flag.severity}</div>
                <div className="flag-message">{flag.message}</div>
              </div>
            ))
          ) : (
            <div className="alert alert-success">✅ No clinical flags triggered. Patient appears stable.</div>
          )}
        </div>
      </div>

      {/* AI Confidence Distribution */}
      <div className="card mb-lg">
        <div className="card-header">
          <h3 className="card-title">🤖 AI Model Confidence Distribution</h3>
        </div>
        <div className="card-body">
          {Object.entries(assessment.class_probabilities || {}).map(([lvl, prob]) => (
            <div key={lvl} className="prob-bar-row">
              <span className="prob-label" style={{ color: RISK_COLOR[lvl] || '#888' }}>{lvl}</span>
              <div className="prob-track">
                <div
                  className="prob-fill"
                  style={{ width: `${prob * 100}%`, background: RISK_COLOR[lvl] || '#888' }}
                />
              </div>
              <span className="prob-pct">{(prob * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visit Vitals summary */}
      {assessment.visit && (
        <div className="card mb-lg">
          <div className="card-header">
            <h3 className="card-title">📊 Recorded Vitals</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-md)' }}>
              {[
                { label: 'Blood Pressure', value: assessment.visit.systolic_bp ? `${assessment.visit.systolic_bp}/${assessment.visit.diastolic_bp} mmHg` : '—' },
                { label: 'Blood Sugar', value: assessment.visit.blood_sugar_mg_dl ? `${assessment.visit.blood_sugar_mg_dl} mg/dL` : '—' },
                { label: 'Hemoglobin', value: assessment.visit.hemoglobin_g_dl ? `${assessment.visit.hemoglobin_g_dl} g/dL` : '—' },
                { label: 'Temperature', value: assessment.visit.temperature_c ? `${assessment.visit.temperature_c}°C` : '—' },
                { label: 'Pulse', value: assessment.visit.pulse_bpm ? `${assessment.visit.pulse_bpm} bpm` : '—' },
                { label: 'BMI', value: assessment.visit.bmi ? assessment.visit.bmi : '—' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button className="btn btn-primary" onClick={onDone}>✅ Done</button>
        {onNewVisit && <button className="btn btn-ghost" onClick={onNewVisit}>🔁 Record Another Visit</button>}
      </div>
    </div>
  );
}

// ─── Patient Detail Modal ─────────────────────────────────────────────────
function PatientDetailModal({ patient, onClose, onRecordVisit }) {
  const [visits, setVisits] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [v, r, f] = await Promise.all([
          api.get(`/visits/${patient.id}`),
          api.get(`/referrals/${patient.id}`),
          api.get(`/followups/${patient.id}`),
        ]);
        setVisits(v);
        setReferrals(r);
        setFollowups(f);
      } catch (e) {
        // ignore — just show empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patient.id]);

  const markFollowupDone = async (id) => {
    setMarkingDone(id);
    try {
      await api.patch(`/followups/${id}/status`, { status: 'done' });
      setFollowups(prev => prev.map(f => f.id === id ? { ...f, status: 'done' } : f));
    } catch (e) {
      // ignore
    } finally {
      setMarkingDone(null);
    }
  };

  const lastVisit = visits[0];

  return (
    <Modal
      title={`${patient.name} — Patient Profile`}
      onClose={onClose}
      footer={
        <button className="btn btn-primary" onClick={() => { onClose(); onRecordVisit(patient); }}>
          🔬 Record New Visit
        </button>
      }
    >
      {/* Patient Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="patient-avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
          {patientInitial(patient.name)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{patient.name}</div>
          <div className="text-muted text-sm">{patient.age} years • {patient.gender} • {patient.village}</div>
          {patient.phone && <div className="text-sm" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>📞 {patient.phone}</div>}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            {patient.is_pregnant && <span className="patient-tag">🤰 Pregnant</span>}
            {patient.is_child && <span className="patient-tag">👶 Child</span>}
            {patient.existing_diabetes && <span className="patient-tag">🩸 Diabetes</span>}
            {patient.existing_hypertension && <span className="patient-tag">💉 Hypertension</span>}
            {lastVisit?.risk_level && <RiskBadge level={lastVisit.risk_level} />}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 'var(--space-2xl)' }}><Spinner /></div>
      ) : (
        <>
          <div className="divider" />

          {/* Visit History */}
          <p className="section-title">🗂️ Visit History ({visits.length})</p>
          {visits.length === 0 ? (
            <EmptyState icon="📋" message="No visits recorded yet" />
          ) : (
            <div className="visit-timeline mb-lg">
              {visits.slice(0, 5).map(v => (
                <div key={v.id} className="visit-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{formatDateTime(v.visit_date)}</span>
                    <RiskBadge level={v.risk_level} />
                  </div>
                  <div className="text-muted text-sm mt-sm">
                    {v.systolic_bp && `BP: ${v.systolic_bp}/${v.diastolic_bp} • `}
                    {v.hemoglobin_g_dl && `Hb: ${v.hemoglobin_g_dl} • `}
                    {v.blood_sugar_mg_dl && `Sugar: ${v.blood_sugar_mg_dl}`}
                  </div>
                  {v.needs_referral && (
                    <span className="risk-badge critical" style={{ marginTop: 4, display: 'inline-flex' }}>Referral issued</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="divider" />

          {/* Referrals */}
          <p className="section-title">📄 Referrals ({referrals.length})</p>
          {referrals.length === 0 ? (
            <EmptyState icon="📋" message="No referrals issued" />
          ) : (
            <div className="mb-lg">
              {referrals.map(r => (
                <div key={r.id} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-sm)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.facility_name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <RiskBadge level={r.risk_level} />
                      <span className={`risk-badge ${r.status === 'pending' ? 'high' : r.status === 'completed' ? 'low' : 'medium'}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-muted text-sm mt-sm">{formatDate(r.created_at)}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{r.reason_summary}</div>
                  {r.pdf_filename && (
                    <a
                      href={`${API_BASE}/referral-pdfs/${r.pdf_filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{ display: 'inline-flex', marginTop: 8, textDecoration: 'none' }}
                    >
                      📄 Download PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="divider" />

          {/* Follow-ups */}
          <p className="section-title">📅 Follow-ups ({followups.length})</p>
          {followups.length === 0 ? (
            <EmptyState icon="📅" message="No follow-ups scheduled" />
          ) : (
            followups.map(f => (
              <div key={f.id} className={`followup-card ${f.status === 'done' ? 'done' : isOverdue(f.due_date) && f.status === 'upcoming' ? 'overdue' : ''}`}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{f.type.replace(/_/g, ' ')}</div>
                  <div className="text-muted text-sm">{formatDate(f.due_date)}</div>
                  {f.notes && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{f.notes}</div>}
                </div>
                <span className={`due-badge ${f.status === 'done' ? 'done' : isOverdue(f.due_date) ? 'overdue' : 'upcoming'}`}>
                  {f.status === 'done' ? '✅ Done' : daysFromNow(f.due_date)}
                </span>
                {f.status !== 'done' && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => markFollowupDone(f.id)}
                    disabled={markingDone === f.id}
                  >
                    {markingDone === f.id ? <Spinner /> : '✓ Done'}
                  </button>
                )}
              </div>
            ))
          )}
        </>
      )}
    </Modal>
  );
}

// ─── Home Dashboard ───────────────────────────────────────────────────────
function HomeScreen({ onNavigate, onRegisterPatient, onSelectPatient }) {
  const [stats, setStats] = useState(null);
  const [overdueFollowups, setOverdueFollowups] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [s, fu, pts] = await Promise.all([
        api.get('/patients/stats'),
        api.get('/followups/all?status=upcoming'),
        api.get('/patients/'),
      ]);
      setStats(s);
      // Show only overdue
      const now = new Date();
      setOverdueFollowups(fu.filter(f => new Date(f.due_date) < now).slice(0, 5));
      setRecentPatients(pts.slice(0, 3));
      setApiOnline(true);
    } catch (e) {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      {/* Hero greeting */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 60%, var(--color-accent) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl)',
        color: 'white',
        marginBottom: 'var(--space-xl)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>{today}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>
            🏥 ASHA Co-pilot Dashboard
          </h2>
          <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 'var(--space-lg)', maxWidth: 480 }}>
            AI-powered health screening assistant for frontline ASHA workers. Monitor patients, record visits, and get instant risk assessments.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button id="hero-register-btn" className="action-btn" style={{ background: 'white', color: 'var(--color-primary)', fontWeight: 700, padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={onRegisterPatient}>
              ➕ Register Patient
            </button>
            <button className="action-btn" style={{ background: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => onNavigate('patients')}>
              🔍 View All Patients
            </button>
          </div>
        </div>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* API Status */}
      {apiOnline === false && (
        <div className="alert alert-error mb-lg">
          ❌ Cannot connect to backend API at <code>{API_BASE}</code>. Make sure the backend server is running.
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card teal">
          <span className="stat-icon">👥</span>
          <div className="stat-value">{loading ? '—' : stats?.total_patients ?? 0}</div>
          <div className="stat-label">Total Patients</div>
        </div>
        <div className="stat-card red">
          <span className="stat-icon">🚨</span>
          <div className="stat-value">{loading ? '—' : stats?.critical_patients ?? 0}</div>
          <div className="stat-label">Critical Risk</div>
        </div>
        <div className="stat-card orange">
          <span className="stat-icon">📄</span>
          <div className="stat-value">{loading ? '—' : stats?.pending_referrals ?? 0}</div>
          <div className="stat-label">Pending Referrals</div>
        </div>
        <div className="stat-card amber">
          <span className="stat-icon">⏰</span>
          <div className="stat-value">{loading ? '—' : stats?.overdue_followups ?? 0}</div>
          <div className="stat-label">Overdue Follow-ups</div>
        </div>
        <div className="stat-card green">
          <span className="stat-icon">📅</span>
          <div className="stat-value">{loading ? '—' : stats?.upcoming_followups ?? 0}</div>
          <div className="stat-label">Upcoming Follow-ups</div>
        </div>
        <div className="stat-card orange">
          <span className="stat-icon">⚠️</span>
          <div className="stat-value">{loading ? '—' : stats?.high_risk_patients ?? 0}</div>
          <div className="stat-label">High Risk (Total)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Overdue Follow-ups */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⏰ Overdue Follow-ups</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('followups')}>View All</button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="flex-center" style={{ padding: 'var(--space-lg)' }}><Spinner /></div>
            ) : overdueFollowups.length === 0 ? (
              <EmptyState icon="✅" message="No overdue follow-ups!" />
            ) : (
              overdueFollowups.map(f => (
                <div key={f.id} className="followup-card overdue" style={{ marginBottom: 'var(--space-sm)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>Patient #{f.patient_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-critical)' }}>{daysFromNow(f.due_date)}</div>
                  </div>
                  <span className="due-badge overdue">{f.type?.replace(/_/g, ' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👥 Recent Patients</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('patients')}>View All</button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="flex-center" style={{ padding: 'var(--space-lg)' }}><Spinner /></div>
            ) : recentPatients.length === 0 ? (
              <EmptyState icon="👤" message="No patients registered yet" action={<button className="btn btn-primary btn-sm" onClick={onRegisterPatient}>Register First Patient</button>} />
            ) : (
              recentPatients.map(p => (
                <div key={p.id} className="patient-card" style={{ marginBottom: 'var(--space-sm)' }} onClick={() => onSelectPatient(p)}>
                  <div className="patient-avatar">{patientInitial(p.name)}</div>
                  <div className="patient-info">
                    <div className="patient-name">{p.name}</div>
                    <div className="patient-meta">
                      <span>{p.age}y</span>
                      <span>•</span>
                      <span>{p.village}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Patients Screen ──────────────────────────────────────────────────────
function PatientsScreen({ onRecordVisit, onSelectPatient }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/patients/');
      setPatients(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const filtered = patients.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.village.toLowerCase().includes(search.toLowerCase()) ||
    (p.asha_worker_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleRegistered = (newPatient) => {
    setPatients(prev => [newPatient, ...prev]);
    setShowRegister(false);
  };

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
        <div>
          <h2 className="page-title">Patients</h2>
          <p className="page-subtitle">{patients.length} registered patient{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="open-register-modal" className="btn btn-primary" onClick={() => setShowRegister(true)}>
          ➕ New Patient
        </button>
      </div>

      {/* Search */}
      <div className="search-bar mb-lg">
        <span className="search-icon">🔍</span>
        <input
          id="patient-search"
          className="form-input"
          type="text"
          placeholder="Search by name, village, or ASHA worker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 'var(--space-2xl)' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={search ? '🔍' : '👥'}
          message={search ? `No patients found for "${search}"` : 'No patients registered yet'}
          action={!search && <button className="btn btn-primary" onClick={() => setShowRegister(true)}>Register First Patient</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {filtered.map(p => (
            <div key={p.id} className="patient-card" onClick={() => onSelectPatient(p)}>
              <div className="patient-avatar">{patientInitial(p.name)}</div>
              <div className="patient-info">
                <div className="patient-name">{p.name}</div>
                <div className="patient-meta">
                  <span>{p.age} years</span>
                  <span>•</span>
                  <span>{p.gender}</span>
                  <span>•</span>
                  <span>📍 {p.village}</span>
                  {p.phone && <><span>•</span><span>📞 {p.phone}</span></>}
                </div>
                <div className="patient-tags">
                  {p.is_pregnant && <span className="patient-tag">🤰 Pregnant</span>}
                  {p.is_child && <span className="patient-tag">👶 Child</span>}
                  {p.existing_diabetes && <span className="patient-tag">🩸 Diabetes</span>}
                  {p.existing_hypertension && <span className="patient-tag">💉 Hypertension</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={e => { e.stopPropagation(); onRecordVisit(p); }}
                >
                  🔬 Visit
                </button>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  #{p.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRegister && (
        <Modal title="Register New Patient" onClose={() => setShowRegister(false)}>
          <PatientForm
            onSuccess={handleRegistered}
            onCancel={() => setShowRegister(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Follow-ups Screen ────────────────────────────────────────────────────
function FollowupsScreen() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(null);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.get('/followups/all');
        setFollowups(data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markDone = async (id) => {
    setMarkingDone(id);
    try {
      await api.patch(`/followups/${id}/status`, { status: 'done' });
      setFollowups(prev => prev.map(f => f.id === id ? { ...f, status: 'done' } : f));
    } catch (e) {
      // ignore
    } finally {
      setMarkingDone(null);
    }
  };

  const now = new Date();
  const overdue = followups.filter(f => f.status === 'upcoming' && new Date(f.due_date) < now);
  const upcoming = followups.filter(f => f.status === 'upcoming' && new Date(f.due_date) >= now);
  const done = followups.filter(f => f.status === 'done');

  const tabs = [
    { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
    { key: 'overdue', label: `Overdue (${overdue.length})` },
    { key: 'done', label: `Done (${done.length})` },
  ];

  const displayList = filter === 'upcoming' ? upcoming : filter === 'overdue' ? overdue : done;

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      <div className="page-header">
        <h2 className="page-title">Follow-ups</h2>
        <p className="page-subtitle">Track and manage patient follow-up visits</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-lg)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 4, border: '1px solid var(--color-border)', alignSelf: 'flex-start', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className="btn"
            style={{
              padding: '7px 16px',
              fontSize: 12,
              background: filter === t.key ? 'var(--color-primary)' : 'transparent',
              color: filter === t.key ? 'white' : 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 'var(--space-2xl)' }}><Spinner /></div>
      ) : displayList.length === 0 ? (
        <EmptyState icon="📅" message={`No ${filter} follow-ups`} />
      ) : (
        displayList.map(f => (
          <div key={f.id} className={`followup-card ${filter === 'overdue' ? 'overdue' : f.status === 'done' ? 'done' : ''}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{f.type?.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Patient #{f.patient_id} • Due: {formatDate(f.due_date)}
              </div>
              {f.notes && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{f.notes}</div>}
            </div>
            <span className={`due-badge ${filter === 'overdue' ? 'overdue' : f.status === 'done' ? 'done' : 'upcoming'}`}>
              {f.status === 'done' ? '✅ Done' : daysFromNow(f.due_date)}
            </span>
            {f.status !== 'done' && (
              <button
                className="btn btn-sm btn-success"
                onClick={() => markDone(f.id)}
                disabled={markingDone === f.id}
              >
                {markingDone === f.id ? <Spinner /> : '✓ Mark Done'}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Referrals Screen ─────────────────────────────────────────────────────
function ReferralsScreen() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.get('/referrals/all');
        setReferrals(data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.patch(`/referrals/${id}/status`, { status });
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = statusFilter === 'all' ? referrals : referrals.filter(r => r.status === statusFilter);

  const statusColor = { pending: 'high', acknowledged: 'medium', completed: 'low' };

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      <div className="page-header">
        <h2 className="page-title">Referrals</h2>
        <p className="page-subtitle">{referrals.length} total referral{referrals.length !== 1 ? 's' : ''} generated</p>
      </div>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {['all', 'pending', 'acknowledged', 'completed'].map(s => (
          <button
            key={s}
            className="btn btn-ghost btn-sm"
            style={{
              background: statusFilter === s ? 'var(--color-primary)' : undefined,
              color: statusFilter === s ? 'white' : undefined,
              border: statusFilter === s ? 'none' : undefined,
            }}
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && ` (${referrals.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 'var(--space-2xl)' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📄" message="No referrals found" />
      ) : (
        filtered.map(r => (
          <div key={r.id} className="card mb-md" style={{ borderLeft: `4px solid ${RISK_COLOR[r.risk_level] || '#ccc'}` }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.facility_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Patient #{r.patient_id} • {formatDate(r.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <RiskBadge level={r.risk_level} />
                  <span className={`risk-badge ${statusColor[r.status] || 'medium'}`}>{r.status}</span>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)', lineHeight: 1.5 }}>
                {r.reason_summary}
              </p>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                {r.pdf_filename && (
                  <a
                    href={`${API_BASE}/referral-pdfs/${r.pdf_filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    📄 Download PDF
                  </a>
                )}
                {r.status === 'pending' && (
                  <button
                    className="btn btn-sm btn-success"
                    disabled={updatingId === r.id}
                    onClick={() => updateStatus(r.id, 'acknowledged')}
                  >
                    {updatingId === r.id ? <Spinner /> : '✓ Acknowledge'}
                  </button>
                )}
                {r.status === 'acknowledged' && (
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={updatingId === r.id}
                    onClick={() => updateStatus(r.id, 'completed')}
                  >
                    {updatingId === r.id ? <Spinner /> : '✅ Mark Completed'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState('home');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitPatient, setVisitPatient] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);

  // Check API health on load
  useEffect(() => {
    api.get('/health')
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const handleRegisterSuccess = (newPatient) => {
    setShowRegisterModal(false);
    setVisitPatient(newPatient);
    setShowVisitModal(true);
  };

  const handleVisitSuccess = (result) => {
    setAssessment(result);
    setShowVisitModal(false);
    setShowDetailModal(false);
    setShowResultModal(true);
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setShowDetailModal(true);
  };

  const handleRecordVisit = (p) => {
    setVisitPatient(p);
    setShowVisitModal(true);
  };

  const navigate = (s) => {
    setScreen(s);
    setSidebarOpen(false);
  };

  const navItems = [
    { id: 'home',      icon: '🏠', label: 'Dashboard' },
    { id: 'patients',  icon: '👥', label: 'Patients' },
    { id: 'followups', icon: '📅', label: 'Follow-ups' },
    { id: 'referrals', icon: '📄', label: 'Referrals' },
  ];

  return (
    <div className="app-shell">
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h1>🏥 ASHA Co-pilot</h1>
          <p>AI Healthcare Assistant</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-btn ${screen === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 'var(--space-md)' }} />

          <button
            id="sidebar-register-btn"
            className="nav-btn"
            style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700 }}
            onClick={() => setShowRegisterModal(true)}
          >
            <span className="nav-icon">➕</span>
            Register Patient
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="api-status">
            <span className={`status-dot ${apiOnline === true ? 'online' : apiOnline === false ? 'offline' : ''}`} />
            <span>
              {apiOnline === true ? 'API Connected' : apiOnline === false ? 'API Offline' : 'Checking...'}
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>v1.0.0 • Synthetic demo</div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-content">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Open menu">☰</button>
          <h1>🏥 ASHA Co-pilot</h1>
          <button className="hamburger-btn" onClick={() => setShowRegisterModal(true)} aria-label="Add patient">➕</button>
        </div>

        <div className="page-wrapper">
          {screen === 'home' && (
            <HomeScreen
              onNavigate={navigate}
              onRegisterPatient={() => setShowRegisterModal(true)}
              onSelectPatient={handleSelectPatient}
            />
          )}
          {screen === 'patients' && (
            <PatientsScreen
              onRecordVisit={handleRecordVisit}
              onSelectPatient={handleSelectPatient}
            />
          )}
          {screen === 'followups' && <FollowupsScreen />}
          {screen === 'referrals' && <ReferralsScreen />}
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`bottom-nav-btn ${screen === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="bn-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      {showRegisterModal && (
        <Modal title="Register New Patient" onClose={() => setShowRegisterModal(false)}>
          <PatientForm
            onSuccess={handleRegisterSuccess}
            onCancel={() => setShowRegisterModal(false)}
          />
        </Modal>
      )}

      {showVisitModal && visitPatient && (
        <Modal
          title={`Record Visit — ${visitPatient.name}`}
          onClose={() => setShowVisitModal(false)}
        >
          <VisitForm
            patient={visitPatient}
            onSuccess={handleVisitSuccess}
            onCancel={() => setShowVisitModal(false)}
          />
        </Modal>
      )}

      {showDetailModal && selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setShowDetailModal(false)}
          onRecordVisit={handleRecordVisit}
        />
      )}

      {showResultModal && assessment && (
        <Modal
          title="Assessment Result"
          onClose={() => setShowResultModal(false)}
        >
          <AssessmentResult
            assessment={assessment}
            patient={visitPatient}
            onDone={() => setShowResultModal(false)}
            onNewVisit={() => {
              setShowResultModal(false);
              setShowVisitModal(true);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
