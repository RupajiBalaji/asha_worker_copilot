import React, { useState } from 'react';
import {
  Heart, AlertTriangle, CheckCircle2, Baby, Activity, FileText,
  Calendar, ArrowLeft, Stethoscope, MapPin, Phone, Thermometer,
  Droplet, Loader2, ChevronRight, ShieldAlert
} from 'lucide-react';

const COLORS = {
  primary: '#0B4F4A',
  primaryDark: '#08362F',
  accent: '#E8871E',
  cream: '#FBF6EC',
  ink: '#1B2B2A',
  low: '#3C8A5B',
  medium: '#D9A300',
  high: '#E8871E',
  critical: '#C23B22',
};

const DEMO_CASES = [
  {
    id: 'pregnant',
    name: 'Lakshmi Devi',
    age: 28,
    gender: 'Female · Pregnant (3rd trimester)',
    village: 'Ramannapeta',
    icon: Heart,
    vitals: [
      { label: 'Blood Pressure', value: '165/112 mmHg', icon: Activity, warn: true },
      { label: 'Hemoglobin', value: '9.5 g/dL', icon: Droplet, warn: true },
      { label: 'Temperature', value: '37.2 °C', icon: Thermometer, warn: false },
    ],
    notes: 'Reports severe headache for 2 days, swelling in hands and feet',
    result: {
      risk_level: 'critical',
      rule_risk_level: 'critical',
      ml_risk_level: 'critical',
      confidence: 0.76,
      probs: { low: 0.0, medium: 0.02, high: 0.22, critical: 0.76 },
      flags: [
        { category: 'hypertension', severity: 'critical', message: 'Severe hypertension (BP 165/112 mmHg) — needs urgent medical attention' },
        { category: 'pregnancy', severity: 'critical', message: 'ANC danger sign: severe headache / blurred vision (possible pre-eclampsia)' },
        { category: 'pregnancy', severity: 'critical', message: 'ANC danger sign: sudden swelling of face/hands/feet' },
        { category: 'anemia', severity: 'medium', message: 'Mild anemia (Hb 9.5 g/dL)' },
      ],
      referral: true,
      followup: '3 days',
    },
  },
  {
    id: 'child',
    name: 'Baby Anjali',
    age: 2,
    gender: 'Female · Child',
    village: 'Kothapalli',
    icon: Baby,
    vitals: [
      { label: 'MUAC', value: '10.9 cm', icon: Activity, warn: true },
      { label: 'Weight', value: '8.3 kg', icon: Activity, warn: true },
      { label: 'Temperature', value: '37.6 °C', icon: Thermometer, warn: false },
    ],
    notes: 'Diarrhea for 3 days, mother reports reduced appetite',
    result: {
      risk_level: 'critical',
      rule_risk_level: 'critical',
      ml_risk_level: 'critical',
      confidence: 0.81,
      probs: { low: 0.0, medium: 0.01, high: 0.18, critical: 0.81 },
      flags: [
        { category: 'malnutrition', severity: 'critical', message: 'Severe Acute Malnutrition (MUAC 10.9 cm) — urgent referral required' },
        { category: 'nutrition', severity: 'high', message: 'Severely underweight (BMI 13.6)' },
        { category: 'child_illness', severity: 'medium', message: 'Diarrhea reported — monitor for dehydration' },
      ],
      referral: true,
      followup: '3 days',
    },
  },
  {
    id: 'healthy',
    name: 'Ravi Kumar',
    age: 34,
    gender: 'Male · General checkup',
    village: 'Kothapalli',
    icon: Stethoscope,
    vitals: [
      { label: 'Blood Pressure', value: '119/77 mmHg', icon: Activity, warn: false },
      { label: 'Blood Sugar', value: '96 mg/dL', icon: Droplet, warn: false },
      { label: 'Temperature', value: '36.9 °C', icon: Thermometer, warn: false },
    ],
    notes: 'Routine door-to-door checkup, no complaints',
    result: {
      risk_level: 'low',
      rule_risk_level: 'low',
      ml_risk_level: 'low',
      confidence: 0.94,
      probs: { low: 0.94, medium: 0.05, high: 0.01, critical: 0.0 },
      flags: [],
      referral: false,
      followup: null,
    },
  },
];

function MiniBar({ level, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 56, fontSize: 11, fontWeight: 700, color: COLORS.ink, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {level}
      </span>
      <div style={{ flex: 1, height: 8, background: '#EDE7D9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 100}%`, background: COLORS[level], borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ width: 32, fontSize: 11, color: '#6B6657', textAlign: 'right' }}>{Math.round(value * 100)}%</span>
    </div>
  );
}

function FlagCard({ flag }) {
  const color = COLORS[flag.severity] || '#999';
  return (
    <div style={{
      borderLeft: `4px solid ${color}`,
      background: '#fff',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: 0.5, marginBottom: 3 }}>
        {flag.category.toUpperCase().replace('_', ' ')} · {flag.severity.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.4 }}>{flag.message}</div>
    </div>
  );
}

export default function AshaCopilotDemo() {
  const [screen, setScreen] = useState('select'); // select | review | loading | result
  const [caseData, setCaseData] = useState(null);

  const selectCase = (c) => {
    setCaseData(c);
    setScreen('review');
  };

  const runAssessment = () => {
    setScreen('loading');
    setTimeout(() => setScreen('result'), 1400);
  };

  const reset = () => {
    setScreen('select');
    setCaseData(null);
  };

  const Icon = caseData?.icon;

  return (
    <div style={{
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      display: 'flex',
      justifyContent: 'center',
      padding: '20px 10px',
      background: 'transparent',
    }}>
      {/* Phone frame */}
      <div style={{
        width: 380,
        background: COLORS.cream,
        borderRadius: 28,
        boxShadow: '0 12px 40px rgba(11,79,74,0.25)',
        border: `8px solid ${COLORS.primaryDark}`,
        overflow: 'hidden',
        minHeight: 640,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* App header */}
        <div style={{
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          padding: '16px 18px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {screen !== 'select' && (
            <button onClick={reset} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.2 }}>ASHA Co-pilot</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>AI health visit assistant</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>

          {screen === 'select' && (
            <>
              <div style={{ fontSize: 12, color: '#6B6657', marginBottom: 10, fontWeight: 600 }}>
                DEMO — SELECT A FIELD VISIT
              </div>
              {DEMO_CASES.map((c) => {
                const CIcon = c.icon;
                return (
                  <button key={c.id} onClick={() => selectCase(c)} style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                    textAlign: 'left',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: COLORS.cream,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CIcon size={22} color={COLORS.primary} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.ink }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#6B6657' }}>{c.age} yrs · {c.gender}</div>
                      <div style={{ fontSize: 11, color: '#6B6657', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <MapPin size={10} /> {c.village}
                      </div>
                    </div>
                    <ChevronRight size={18} color="#BFB9A8" />
                  </button>
                );
              })}
            </>
          )}

          {screen === 'review' && caseData && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <Icon size={24} color={COLORS.primary} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.ink }}>{caseData.name}</div>
                  <div style={{ fontSize: 11, color: '#6B6657' }}>{caseData.age} yrs · {caseData.gender}</div>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6657', marginBottom: 8, letterSpacing: 0.3 }}>
                VITALS RECORDED
              </div>
              {caseData.vitals.map((v, i) => {
                const VIcon = v.icon;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <VIcon size={16} color={v.warn ? COLORS.critical : COLORS.primary} />
                      <span style={{ fontSize: 13, color: COLORS.ink }}>{v.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: v.warn ? COLORS.critical : COLORS.ink }}>
                      {v.value}
                    </span>
                  </div>
                );
              })}

              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6657', margin: '14px 0 8px', letterSpacing: 0.3 }}>
                ASHA WORKER NOTES
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: 12, fontSize: 13, color: COLORS.ink, lineHeight: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {caseData.notes}
              </div>

              <button onClick={runAssessment} style={{
                width: '100%', marginTop: 18, padding: '14px', border: 'none', borderRadius: 10,
                background: COLORS.accent, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 3px 10px rgba(232,135,30,0.4)',
              }}>
                <Activity size={16} /> Run AI Risk Assessment
              </button>
            </>
          )}

          {screen === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 14 }}>
              <Loader2 size={36} color={COLORS.primary} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#6B6657', fontWeight: 600 }}>Analyzing vitals with rule engine + ML model…</div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {screen === 'result' && caseData && (
            <>
              <div style={{
                background: COLORS[caseData.result.risk_level],
                borderRadius: 12, padding: 16, marginBottom: 14, color: '#fff',
              }}>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: 0.5 }}>FINAL RISK LEVEL</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 2 }}>{caseData.result.risk_level.toUpperCase()}</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                  Rule engine: {caseData.result.rule_risk_level} · ML model: {caseData.result.ml_risk_level} ({Math.round(caseData.result.confidence * 100)}% confidence)
                </div>
              </div>

              {caseData.result.referral && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FDEDE3',
                  border: `1px solid ${COLORS.critical}33`, borderRadius: 10, padding: 12, marginBottom: 14,
                }}>
                  <ShieldAlert size={18} color={COLORS.critical} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.critical }}>Referral letter generated</div>
                    <div style={{ fontSize: 12, color: COLORS.ink, marginTop: 2 }}>
                      Auto-sent to nearest PHC. Follow-up scheduled in {caseData.result.followup}.
                    </div>
                  </div>
                </div>
              )}

              {!caseData.result.referral && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, background: '#E9F4ED',
                  borderRadius: 10, padding: 12, marginBottom: 14,
                }}>
                  <CheckCircle2 size={18} color={COLORS.low} />
                  <div style={{ fontSize: 12, color: COLORS.ink }}>No referral needed. Routine monitoring only.</div>
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6657', marginBottom: 8, letterSpacing: 0.3 }}>
                CLINICAL FLAGS {caseData.result.flags.length > 0 ? `(${caseData.result.flags.length})` : ''}
              </div>
              {caseData.result.flags.length > 0 ? (
                caseData.result.flags.map((f, i) => <FlagCard key={i} flag={f} />)
              ) : (
                <div style={{ fontSize: 12, color: '#6B6657', fontStyle: 'italic', marginBottom: 10 }}>No flags triggered — vitals within normal range.</div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6657', margin: '14px 0 8px', letterSpacing: 0.3 }}>
                MODEL CONFIDENCE
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {Object.entries(caseData.result.probs).map(([level, val]) => (
                  <MiniBar key={level} level={level} value={val} />
                ))}
              </div>

              {caseData.result.referral && (
                <button style={{
                  width: '100%', marginTop: 16, padding: '12px', border: `1.5px solid ${COLORS.primary}`,
                  borderRadius: 10, background: '#fff', color: COLORS.primary, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <FileText size={15} /> View Referral PDF
                </button>
              )}

              <button onClick={reset} style={{
                width: '100%', marginTop: 10, padding: '12px', border: 'none', borderRadius: 10,
                background: COLORS.cream, color: '#6B6657', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                ← Try another case
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
