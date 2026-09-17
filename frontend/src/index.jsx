import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import VoiceChatbot, { SUPPORTED_LANGUAGES } from './VoiceChatbot';
import VoiceFormCopilot from './VoiceFormCopilot';
import { getStoredUser, saveStoredUser, STATIC_PROFILES } from './profiles';
import LoginModal from './LoginModal';
import SupervisorScreen from './SupervisorScreen';
import WorkerProfileModal from './WorkerProfileModal';

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
function PatientForm({ onSuccess, onCancel, autoFillData, currentUser }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'female',
    village: (currentUser?.role === 'asha_worker' ? currentUser?.village : '') || '',
    phone: '',
    address: '',
    asha_worker_name: (currentUser?.role === 'asha_worker' ? currentUser?.name : '') || '',
    is_pregnant: false,
    is_child: false,
    existing_diabetes: false,
    existing_hypertension: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill from voice AI details
  useEffect(() => {
    if (autoFillData) {
      setForm(prev => ({
        ...prev,
        name: autoFillData.patient_name || autoFillData.name || prev.name,
        age: autoFillData.age !== undefined && autoFillData.age !== null ? String(autoFillData.age) : prev.age,
        gender: autoFillData.gender || prev.gender,
        village: autoFillData.village || prev.village,
        phone: autoFillData.phone || prev.phone,
        address: autoFillData.address || prev.address,
        is_pregnant: autoFillData.is_pregnant !== undefined ? Boolean(autoFillData.is_pregnant) : prev.is_pregnant,
        is_child: autoFillData.is_child !== undefined ? Boolean(autoFillData.is_child) : prev.is_child,
        existing_diabetes: autoFillData.existing_diabetes !== undefined ? Boolean(autoFillData.existing_diabetes) : prev.existing_diabetes,
        existing_hypertension: autoFillData.existing_hypertension !== undefined ? Boolean(autoFillData.existing_hypertension) : prev.existing_hypertension,
      }));
    }
  }, [autoFillData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Auto-set is_child when age < 5
  useEffect(() => {
    if (form.age !== '') {
      const age = parseInt(form.age, 10);
      setForm(prev => {
        const shouldBeChild = !isNaN(age) && age < 5;
        // Avoid redundant state update if value already matches
        if (prev.is_child === shouldBeChild) return prev;
        return { ...prev, is_child: shouldBeChild };
      });
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

  const handleVoiceExtracted = (extracted) => {
    if (!extracted) return;
    setForm(prev => ({
      ...prev,
      name: extracted.patient_name || extracted.name || prev.name,
      age: extracted.age !== undefined && extracted.age !== null ? String(extracted.age) : prev.age,
      gender: extracted.gender ? extracted.gender.toLowerCase() : prev.gender,
      village: extracted.village || prev.village,
      phone: extracted.phone || prev.phone,
      address: extracted.address || prev.address,
      is_pregnant: extracted.is_pregnant !== undefined ? Boolean(extracted.is_pregnant) : prev.is_pregnant,
      is_child: extracted.is_child !== undefined ? Boolean(extracted.is_child) : prev.is_child,
      existing_diabetes: extracted.existing_diabetes !== undefined ? Boolean(extracted.existing_diabetes) : prev.existing_diabetes,
      existing_hypertension: extracted.existing_hypertension !== undefined ? Boolean(extracted.existing_hypertension) : prev.existing_hypertension,
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <Alert type="error">{error}</Alert>}

        {/* 🎙️ Voice Copilot for Registration */}
        <VoiceFormCopilot
          formType="patient"
          onDetailsExtracted={handleVoiceExtracted}
          apiBase={API_BASE}
        />

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

function VisitForm({ patient, onSuccess, onCancel, autoFillData }) {
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

  // Auto-fill vitals from voice AI chatbot details
  useEffect(() => {
    if (autoFillData) {
      setForm(prev => ({
        ...prev,
        systolic_bp: autoFillData.systolic_bp !== undefined && autoFillData.systolic_bp !== null ? String(autoFillData.systolic_bp) : prev.systolic_bp,
        diastolic_bp: autoFillData.diastolic_bp !== undefined && autoFillData.diastolic_bp !== null ? String(autoFillData.diastolic_bp) : prev.diastolic_bp,
        blood_sugar_mg_dl: autoFillData.blood_sugar_mg_dl !== undefined && autoFillData.blood_sugar_mg_dl !== null ? String(autoFillData.blood_sugar_mg_dl) : prev.blood_sugar_mg_dl,
        hemoglobin_g_dl: autoFillData.hemoglobin_g_dl !== undefined && autoFillData.hemoglobin_g_dl !== null ? String(autoFillData.hemoglobin_g_dl) : prev.hemoglobin_g_dl,
        temperature_c: autoFillData.temperature_c !== undefined && autoFillData.temperature_c !== null ? String(autoFillData.temperature_c) : prev.temperature_c,
        pulse_bpm: autoFillData.pulse_bpm !== undefined && autoFillData.pulse_bpm !== null ? String(autoFillData.pulse_bpm) : prev.pulse_bpm,
        weight_kg: autoFillData.weight_kg !== undefined && autoFillData.weight_kg !== null ? String(autoFillData.weight_kg) : prev.weight_kg,
        height_cm: autoFillData.height_cm !== undefined && autoFillData.height_cm !== null ? String(autoFillData.height_cm) : prev.height_cm,
        trimester: autoFillData.trimester !== undefined && autoFillData.trimester !== null ? String(autoFillData.trimester) : prev.trimester,
        child_age_months: autoFillData.child_age_months !== undefined && autoFillData.child_age_months !== null ? String(autoFillData.child_age_months) : prev.child_age_months,
        muac_cm: autoFillData.muac_cm !== undefined && autoFillData.muac_cm !== null ? String(autoFillData.muac_cm) : prev.muac_cm,
        diarrhea: autoFillData.diarrhea !== undefined ? Boolean(autoFillData.diarrhea) : prev.diarrhea,
        pregnancy_danger_signs: Array.isArray(autoFillData.pregnancy_danger_signs) && autoFillData.pregnancy_danger_signs.length > 0 ? autoFillData.pregnancy_danger_signs : prev.pregnancy_danger_signs,
        symptoms: Array.isArray(autoFillData.symptoms) && autoFillData.symptoms.length > 0 ? autoFillData.symptoms : prev.symptoms,
        notes: autoFillData.notes ? (prev.notes ? `${prev.notes} | ${autoFillData.notes}` : autoFillData.notes) : prev.notes,
      }));
    }
  }, [autoFillData]);

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

  const handleVoiceExtracted = (extracted) => {
    if (!extracted) return;
    setForm(prev => ({
      ...prev,
      systolic_bp: extracted.systolic_bp !== undefined && extracted.systolic_bp !== null ? String(extracted.systolic_bp) : prev.systolic_bp,
      diastolic_bp: extracted.diastolic_bp !== undefined && extracted.diastolic_bp !== null ? String(extracted.diastolic_bp) : prev.diastolic_bp,
      blood_sugar_mg_dl: extracted.blood_sugar_mg_dl !== undefined && extracted.blood_sugar_mg_dl !== null ? String(extracted.blood_sugar_mg_dl) : prev.blood_sugar_mg_dl,
      hemoglobin_g_dl: extracted.hemoglobin_g_dl !== undefined && extracted.hemoglobin_g_dl !== null ? String(extracted.hemoglobin_g_dl) : prev.hemoglobin_g_dl,
      temperature_c: extracted.temperature_c !== undefined && extracted.temperature_c !== null ? String(extracted.temperature_c) : prev.temperature_c,
      pulse_bpm: extracted.pulse_bpm !== undefined && extracted.pulse_bpm !== null ? String(extracted.pulse_bpm) : prev.pulse_bpm,
      weight_kg: extracted.weight_kg !== undefined && extracted.weight_kg !== null ? String(extracted.weight_kg) : prev.weight_kg,
      height_cm: extracted.height_cm !== undefined && extracted.height_cm !== null ? String(extracted.height_cm) : prev.height_cm,
      trimester: extracted.trimester !== undefined && extracted.trimester !== null ? String(extracted.trimester) : prev.trimester,
      child_age_months: extracted.child_age_months !== undefined && extracted.child_age_months !== null ? String(extracted.child_age_months) : prev.child_age_months,
      muac_cm: extracted.muac_cm !== undefined && extracted.muac_cm !== null ? String(extracted.muac_cm) : prev.muac_cm,
      diarrhea: extracted.diarrhea !== undefined ? Boolean(extracted.diarrhea) : prev.diarrhea,
      pregnancy_danger_signs: Array.isArray(extracted.pregnancy_danger_signs) && extracted.pregnancy_danger_signs.length > 0 ? extracted.pregnancy_danger_signs : prev.pregnancy_danger_signs,
      symptoms: Array.isArray(extracted.symptoms) && extracted.symptoms.length > 0 ? extracted.symptoms : prev.symptoms,
      notes: extracted.notes ? (prev.notes ? `${prev.notes} | ${extracted.notes}` : extracted.notes) : prev.notes,
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <Alert type="error">{error}</Alert>}

        <div className="alert alert-info">
          📋 Recording visit for <strong>{patient.name}</strong> — {patient.age} years, {patient.village}
        </div>

        {/* 🎙️ Voice Copilot for Vitals & Symptoms */}
        <VoiceFormCopilot
          formType="visit"
          patientName={patient?.name}
          onDetailsExtracted={handleVoiceExtracted}
          apiBase={API_BASE}
        />

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
        console.error('Failed to load patient details:', e);
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
      console.error('Failed to mark follow-up done:', e);
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
function HomeScreen({ onNavigate, onRegisterPatient, onSelectPatient, apiBase, selectedLanguage, onLanguageChange, onApplyDetails, currentUser, onOpenLogin, onOpenProfile }) {
  const [stats, setStats] = useState(null);
  const [overdueFollowups, setOverdueFollowups] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(null);
  const [loadError, setLoadError] = useState('');

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
      setLoadError('');
    } catch (e) {
      setApiOnline(false);
      setLoadError(e?.message || 'Failed to reach the backend API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Reload when chatbot auto-registers a patient or sends emergency alert
  useEffect(() => {
    const handleUpdate = () => loadDashboard();
    window.addEventListener('patient-updated', handleUpdate);
    return () => window.removeEventListener('patient-updated', handleUpdate);
  }, [loadDashboard]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const isManager = currentUser?.role === 'manager';

  return (
    <div style={{ animation: 'slide-up 0.3s ease both' }}>
      {/* Hero greeting */}
      <div style={{
        background: isManager
          ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #0369a1 100%)'
          : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 60%, var(--color-accent) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl)',
        color: 'white',
        marginBottom: 'var(--space-lg)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{today}</div>

            {currentUser && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255,255,255,0.22)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onClick={onOpenLogin}
                title="Click to switch profile"
              >
                <span>{currentUser.avatar}</span>
                <span>{currentUser.name}</span>
                <span style={{ opacity: 0.8, fontSize: 11 }}>({currentUser.worker_label})</span>
                <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 4 }}>
                  Switch 🔄
                </span>
              </div>
            )}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>
            {isManager ? '👨🏽‍⚕️ PHC Health Supervisor Overview' : `Namaste, ${currentUser?.name || 'ASHA Worker'}! 🏥`}
          </h2>
          <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 'var(--space-lg)', maxWidth: 540 }}>
            {isManager
              ? 'Real-time frontline oversight portal. Review clinical entries logged by community ASHA workers, track patient coverage quotas, and inspect high-risk case escalations.'
              : `Welcome to your AI Co-pilot workspace. You are assigned to sector ${currentUser?.village || 'Palani'}. Record field vitals, check ANC danger signs, and triage patient risk in real-time.`}
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {isManager && (
              <button
                type="button"
                className="action-btn"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  color: 'white',
                  fontWeight: 800,
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.45)'
                }}
                onClick={() => onNavigate('supervisor')}
              >
                📊 Open Manager Oversight & Efficiency
              </button>
            )}
            <button
              id="hero-copilot-btn"
              className="action-btn"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                color: 'white',
                fontWeight: 800,
                padding: '10px 22px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.45)'
              }}
              onClick={() => onNavigate('copilot')}
            >
              🎙️ AI Voice Copilot
            </button>
            <button id="hero-register-btn" className="action-btn" style={{ background: 'white', color: 'var(--color-primary)', fontWeight: 700, padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={onRegisterPatient}>
              ➕ Register Patient
            </button>
            <button className="action-btn" style={{ background: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => onNavigate('patients')}>
              🔍 View All Patients
            </button>
            <button className="action-btn" style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--color-primary-dark)', fontWeight: 700, padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => document.getElementById('home-chatbot-section')?.scrollIntoView({ behavior: 'smooth' })}>
              🤖 Scroll to Assistant
            </button>
          </div>
        </div>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* 🌟 EMBEDDED MULTILINGUAL AI ASSISTANT – always visible on home */}
      <div className="home-ai-assistant-card mb-xl" id="home-chatbot-section">
        <div className="ai-card-header">
          <div className="ai-card-title">
            <span className="ai-sparkle">✨</span>
            <div>
              <h3>AI Voice & Chat Assistant</h3>
              <p>Speak or type in your language — I'll guide you, extract vitals, and help register patients.</p>
            </div>
          </div>
          {/* Language Selector */}
          <div className="ai-lang-wrapper">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>🌐 Language:</span>
            <select
              className="form-select home-lang-select"
              value={selectedLanguage || 'hi-IN'}
              onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
              id="home-language-select"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Inline chatbot panel */}
        <VoiceChatbot
          apiBase={apiBase}
          onApplyDetails={onApplyDetails}
          onRegisterPatient={onRegisterPatient}
          activeContext="home"
          inline={true}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* API Status */}
      {apiOnline === false && (
        <div className="alert alert-error mb-lg">
          ❌ Cannot connect to backend API at <code>{API_BASE}</code>. Make sure the backend server is running.
          {loadError && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Error: {loadError}</div>}
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

// ─── Dedicated Voice Copilot Screen ─────────────────────────────────────────
function CopilotScreen({ apiBase, onRegisterPatient, onApplyDetails, selectedLanguage, onLanguageChange }) {
  return (
    <div style={{ animation: 'slide-up 0.3s ease both', maxWidth: 960, margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #0284c7 60%, #4338ca 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl)',
        color: 'white',
        marginBottom: 'var(--space-lg)',
        boxShadow: '0 10px 30px rgba(2, 132, 199, 0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 32, animation: 'pulse-ring 2s infinite', display: 'inline-block' }}>🎙️</span>
                <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
                  AI Voice Copilot
                </h2>
                <span style={{ background: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>
                  AI POWERED
                </span>
              </div>
              <p style={{ fontSize: 13, opacity: 0.9, maxWidth: 620, margin: 0, lineHeight: 1.6 }}>
                Hands-free voice assistant for frontline ASHA workers. Speak naturally in your native language to register patients, record vitals, assess clinical risks, and trigger emergency SOS alerts.
              </p>
            </div>

            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', padding: '8px 14px', borderRadius: 'var(--radius-lg)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>🌐 Language:</span>
              <select
                className="form-select"
                style={{ background: 'white', color: '#0f172a', fontWeight: 700, fontSize: 13, border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}
                value={selectedLanguage || 'hi-IN'}
                onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Voice Feature Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 18 }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>🗣️ Speech-to-Text</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Real-time Indian language speech recognition</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>⚡ Instant Auto-Fill</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Extracts vitals, patient info & fills registration</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>🔊 Multilingual TTS</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Speaks responses aloud in your language</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>🚨 Emergency SOS</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Automated dispatch to nearest PHC / Hospital</div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Full-Screen Voice Copilot Assistant */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
        <VoiceChatbot
          apiBase={apiBase}
          onApplyDetails={onApplyDetails}
          onRegisterPatient={onRegisterPatient}
          activeContext="copilot-screen"
          inline={true}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      </div>
    </div>
  );
}

// ─── Patients Screen ──────────────────────────────────────────────────────
function PatientsScreen({ onRecordVisit, onSelectPatient, currentUser }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'my_patients', 'pregnant', 'children'

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/patients/');
      setPatients(data);
    } catch (e) {
      // Show user-facing error in the empty state rather than failing silently
      console.error('Failed to load patients:', e);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // Reload live when chatbot registers a patient or updates status
  useEffect(() => {
    const handleUpdate = () => loadPatients();
    window.addEventListener('patient-updated', handleUpdate);
    return () => window.removeEventListener('patient-updated', handleUpdate);
  }, [loadPatients]);

  const myPatientsCount = patients.filter(p =>
    (currentUser?.name && (p.asha_worker_name || '').toLowerCase() === currentUser.name.toLowerCase()) ||
    (currentUser?.village && (p.village || '').toLowerCase() === currentUser.village.toLowerCase())
  ).length;

  const filtered = patients.filter(p => {
    if (filterTab === 'my_patients') {
      const matchWorker = currentUser?.name && (p.asha_worker_name || '').toLowerCase() === currentUser.name.toLowerCase();
      const matchVillage = currentUser?.village && (p.village || '').toLowerCase() === currentUser.village.toLowerCase();
      if (!matchWorker && !matchVillage) return false;
    } else if (filterTab === 'pregnant' && !p.is_pregnant) {
      return false;
    } else if (filterTab === 'children' && !p.is_child) {
      return false;
    }

    return (
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.village.toLowerCase().includes(search.toLowerCase()) ||
      (p.asha_worker_name || '').toLowerCase().includes(search.toLowerCase())
    );
  });

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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${filterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
          onClick={() => setFilterTab('all')}
        >
          👥 All Patients ({patients.length})
        </button>
        {currentUser?.role === 'asha_worker' && (
          <button
            type="button"
            className={`btn ${filterTab === 'my_patients' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
            onClick={() => setFilterTab('my_patients')}
          >
            👩‍⚕️ My Sector ({currentUser.village}: {myPatientsCount})
          </button>
        )}
        <button
          type="button"
          className={`btn ${filterTab === 'pregnant' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
          onClick={() => setFilterTab('pregnant')}
        >
          🤰 Pregnant Mothers ({patients.filter(p => p.is_pregnant).length})
        </button>
        <button
          type="button"
          className={`btn ${filterTab === 'children' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
          onClick={() => setFilterTab('children')}
        >
          👶 Children &lt;5y ({patients.filter(p => p.is_child).length})
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
        console.error('Failed to load follow-ups:', e);
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
      console.error('Failed to mark follow-up done:', e);
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
      console.error('Failed to update referral status:', e);
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
  const [pendingAutoFill, setPendingAutoFill] = useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleSelectUser = (user) => {
    setCurrentUser(user);
    saveStoredUser(user);
    if (user.role === 'manager') {
      setScreen('supervisor');
    }
  };

  const handleApplyVoiceDetails = (details) => {
    setPendingAutoFill(details);
    // Auto-open appropriate modal based on extracted fields
    if (details.patient_name || details.age || details.village) {
      if (!showVisitModal) setShowRegisterModal(true);
    } else if (details.systolic_bp || details.blood_sugar_mg_dl || details.hemoglobin_g_dl || details.temperature_c) {
      if (!showRegisterModal && !showVisitModal && selectedPatient) {
        setVisitPatient(selectedPatient);
        setShowVisitModal(true);
      }
    }
  };

  const handleRegisterFromVoice = (details) => {
    setPendingAutoFill(details);
    setShowRegisterModal(true);
  };

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

  const isManager = currentUser?.role === 'manager';

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Dashboard' },
    {
      id: 'supervisor',
      icon: '📊',
      label: isManager ? '⭐ Manager Oversight' : '📊 Supervisor Portal',
      highlight: isManager,
    },
    { id: 'copilot', icon: '🎙️', label: 'AI Voice Copilot' },
    { id: 'patients', icon: '👥', label: 'Patients' },
    { id: 'followups', icon: '📅', label: 'Follow-ups' },
    { id: 'referrals', icon: '📄', label: 'Referrals' },
    {
      id: 'profile',
      icon: '👤',
      label: isManager ? 'Supervisor Profile' : 'My Worker Profile',
      action: () => setShowProfileModal(true)
    },
    {
      id: 'switch_user',
      icon: '🔄',
      label: 'Switch Account',
      action: () => setShowLoginModal(true)
    },
    { id: 'chatbot', icon: '🤖', label: 'Voice Assistant', action: () => setChatbotOpen(true) },
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

        {/* User Profile Widget */}
        <div
          className="sidebar-user-widget"
          onClick={() => setShowProfileModal(true)}
          title="Click to view worker details or switch account"
        >
          <div className="user-widget-avatar">{currentUser?.avatar || '👩🏽‍⚕️'}</div>
          <div className="user-widget-info">
            <div className="user-widget-name">{currentUser?.name || 'Asha Devi'}</div>
            <div className="user-widget-role">
              <span>{currentUser?.worker_label || 'ASHA Worker 1'}</span>
            </div>
          </div>
          <button
            type="button"
            className="user-widget-switch-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowLoginModal(true);
            }}
            title="Switch User / Login"
          >
            Switch 🔄
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-btn ${screen === item.id ? 'active' : ''} ${item.highlight ? 'supervisor-nav-highlight' : ''}`}
              onClick={() => item.action ? item.action() : navigate(item.id)}
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
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>v1.0.0 • Multilingual Voice AI</div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-content">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Open menu">☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 16 }}>🏥 ASHA Co-pilot</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="hamburger-btn"
              onClick={() => setShowLoginModal(true)}
              title="Switch Profile"
              style={{ fontSize: 16, background: 'rgba(0,0,0,0.05)', borderRadius: '50%' }}
            >
              {currentUser?.avatar || '👤'}
            </button>
            <button className="hamburger-btn" onClick={() => setShowRegisterModal(true)} aria-label="Add patient">➕</button>
          </div>
        </div>

        <div className="page-wrapper">
          {screen === 'home' && (
            <HomeScreen
              onNavigate={navigate}
              onRegisterPatient={() => setShowRegisterModal(true)}
              onSelectPatient={handleSelectPatient}
              apiBase={API_BASE}
              onApplyDetails={handleApplyVoiceDetails}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              currentUser={currentUser}
              onOpenLogin={() => setShowLoginModal(true)}
              onOpenProfile={() => setShowProfileModal(true)}
            />
          )}
          {screen === 'supervisor' && (
            <SupervisorScreen
              apiBase={API_BASE}
              onSelectPatient={handleSelectPatient}
              onSwitchUser={() => setShowLoginModal(true)}
            />
          )}
          {screen === 'copilot' && (
            <CopilotScreen
              apiBase={API_BASE}
              onRegisterPatient={handleRegisterFromVoice}
              onApplyDetails={handleApplyVoiceDetails}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          )}
          {screen === 'patients' && (
            <PatientsScreen
              onRecordVisit={handleRecordVisit}
              onSelectPatient={handleSelectPatient}
              currentUser={currentUser}
            />
          )}
          {screen === 'followups' && <FollowupsScreen />}
          {screen === 'referrals' && <ReferralsScreen />}
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.slice(0, 5).map(item => (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              className={`bottom-nav-btn ${!item.action && screen === item.id ? 'active' : ''}`}
              onClick={item.action ? item.action : () => navigate(item.id)}
            >
              <span className="bn-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="bottom-nav-btn"
            onClick={() => setShowLoginModal(true)}
            title="Profile Switcher"
          >
            <span className="bn-icon">{currentUser?.avatar || '👤'}</span>
            Profile
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {showRegisterModal && (
        <Modal title="Register New Patient" onClose={() => setShowRegisterModal(false)}>
          <PatientForm
            onSuccess={handleRegisterSuccess}
            onCancel={() => setShowRegisterModal(false)}
            autoFillData={pendingAutoFill}
            currentUser={currentUser}
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
            autoFillData={pendingAutoFill}
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

      {showLoginModal && (
        <LoginModal
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {showProfileModal && (
        <WorkerProfileModal
          user={currentUser}
          apiBase={API_BASE}
          onClose={() => setShowProfileModal(false)}
          onSwitchProfile={() => {
            setShowProfileModal(false);
            setShowLoginModal(true);
          }}
        />
      )}

      {/* Voice AI Chatbot Widget */}
      <VoiceChatbot
        apiBase={API_BASE}
        onApplyDetails={handleApplyVoiceDetails}
        onRegisterPatient={handleRegisterFromVoice}
        activeContext={screen}
        isOpen={chatbotOpen}
        setIsOpen={setChatbotOpen}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
