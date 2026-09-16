import React, { useState, useEffect, useRef } from 'react';

// Speech Recognition setup (Web Speech API)
const SpeechRecognition = typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
];

/**
 * VoiceFormCopilot — In-form AI voice assistant that populates form fields
 * with voice speech recognition, Gemini extraction, and Text-To-Speech (TTS) voice confirmation.
 */
export default function VoiceFormCopilot({
  formType = 'patient', // 'patient' or 'visit'
  patientName = '',
  onDetailsExtracted,
  apiBase = 'http://localhost:8000',
  defaultLanguage = 'hi-IN',
}) {
  const [selectedLang, setSelectedLang] = useState(defaultLanguage);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastExtracted, setLastExtracted] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const recognitionRef = useRef(null);

  // Initialize SpeechRecognition on language change
  useEffect(() => {
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop when pause detected
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onresult = (event) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }

        if (finalTranscript.trim()) {
          setInterimText('');
          processVoiceInput(finalTranscript.trim());
        } else {
          setInterimText(currentInterim);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[VoiceCopilot] Speech error:', event.error);
        setIsRecording(false);
        setInterimText('');
        if (event.error === 'not-allowed') {
          setStatusMessage('⚠️ Microphone access blocked. Please allow mic permissions in your browser.');
        } else if (event.error !== 'no-speech') {
          setStatusMessage(`⚠️ Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('[VoiceCopilot] Init failed:', err);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [selectedLang]);

  // Text-To-Speech (TTS) voice confirmation
  const speakText = (text) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = selectedLang.split('-')[0];
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith(langPrefix) || v.lang.includes('IN') || v.name.includes('India')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Toggle Microphone
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setStatusMessage('');
      setInterimText('');
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current.lang = selectedLang;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Send speech transcript to backend AI for structured extraction
  const processVoiceInput = async (spokenText) => {
    setIsProcessing(true);
    setStatusMessage(`🤖 Analyzing speech: "${spokenText}"...`);

    try {
      const contextDesc = formType === 'patient'
        ? 'Register New Patient Form: Extract patient_name, age, gender, village, phone, is_pregnant, is_child, existing_diabetes, existing_hypertension.'
        : `Record Visit Form for patient ${patientName || 'current patient'}: Extract systolic_bp, diastolic_bp, blood_sugar_mg_dl, hemoglobin_g_dl, temperature_c, pulse_bpm, weight_kg, height_cm, symptoms, pregnancy_danger_signs, notes.`;

      const res = await fetch(`${apiBase}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: spokenText,
          context: contextDesc,
          language: selectedLang,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const extracted = data.extracted_details || {};

      setLastExtracted(extracted);

      // Auto-populate parent form
      if (onDetailsExtracted) {
        onDetailsExtracted(extracted);
      }

      // Voice Assistance TTS confirmation
      const speechSummary = data.spoken_summary || (formType === 'patient'
        ? `Details recorded for ${extracted.patient_name || 'patient'}. Form populated.`
        : `Vitals recorded. Blood pressure ${extracted.systolic_bp || ''} over ${extracted.diastolic_bp || ''}. Form updated.`);

      setStatusMessage(`✅ Extracted details successfully! Form auto-filled.`);
      speakText(speechSummary);

    } catch (err) {
      console.error('[VoiceCopilot] Extraction error:', err);
      setStatusMessage(`⚠️ Failed to parse speech. Please try speaking clearly or type manually.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const placeholderTip = formType === 'patient'
    ? 'Speak: "Sunita, 28 years, pregnant, Rampur village, phone 9876543210"'
    : 'Speak: "BP 140 over 90, hemoglobin 9.5, sugar 130, temp 38 degrees, severe headache"';

  return (
    <div className="voice-form-copilot">
      <div className="vfc-header">
        <div className="vfc-title">
          <span className="vfc-sparkle">🎙️</span>
          <div>
            <h4>Voice Copilot — Speak to Fill All Details</h4>
            <p>{placeholderTip}</p>
          </div>
        </div>

        <div className="vfc-controls">
          {/* Language Selector */}
          <select
            className="vfc-lang-select"
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            disabled={isRecording || isProcessing}
            title="Select Voice Language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>

          {/* TTS Audio toggle */}
          <button
            type="button"
            className={`vfc-tts-btn ${ttsEnabled ? 'active' : ''}`}
            onClick={() => {
              setTtsEnabled(!ttsEnabled);
              if (isSpeaking) window.speechSynthesis?.cancel();
            }}
            title={ttsEnabled ? 'Voice Feedback Enabled (TTS)' : 'Voice Feedback Muted'}
          >
            {ttsEnabled ? (isSpeaking ? '🔊 Speaking...' : '🔊 Voice ON') : '🔇 Voice OFF'}
          </button>
        </div>
      </div>

      {/* Mic Trigger & Realtime Feedback */}
      <div className="vfc-mic-bar">
        <button
          type="button"
          className={`vfc-mic-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={toggleRecording}
          disabled={isProcessing}
        >
          {isProcessing ? '⏳' : isRecording ? '⏹️ Stop' : '🎙️ Tap to Speak All Details'}
        </button>

        {/* Live speech feedback */}
        <div className="vfc-speech-preview">
          {isRecording ? (
            <div className="vfc-live-pulse">
              <span className="vfc-red-dot" />
              <span>Listening in {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name || selectedLang}... {interimText}</span>
            </div>
          ) : isProcessing ? (
            <span className="vfc-analyzing">⚡ AI model is thinking and extracting details...</span>
          ) : statusMessage ? (
            <span className="vfc-status">{statusMessage}</span>
          ) : (
            <span className="vfc-idle-hint">Click the mic and speak naturally in your chosen language. Every field will be filled automatically.</span>
          )}
        </div>
      </div>

      {/* Extracted Chips Badge Display */}
      {lastExtracted && Object.keys(lastExtracted).length > 0 && (
        <div className="vfc-extracted-preview">
          <span className="vfc-preview-label">⚡ Auto-Filled Fields:</span>
          <div className="vfc-chips-list">
            {Object.entries(lastExtracted).map(([k, v]) => {
              if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return null;
              return (
                <span key={k} className="vfc-chip">
                  <strong>{k.replace(/_/g, ' ')}:</strong> {Array.isArray(v) ? v.join(', ') : String(v)}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
