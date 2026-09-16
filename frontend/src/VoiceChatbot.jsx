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

export default function VoiceChatbot({
  apiBase,
  onApplyDetails,
  onRegisterPatient,
  activeContext,
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  selectedLanguage: externalSelectedLang,
  onLanguageChange: externalOnLangChange,
  inline = false,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  // In inline mode, the panel is always open
  const isOpen = inline ? true : (externalIsOpen !== undefined ? externalIsOpen : internalIsOpen);
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;

  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const activeLang = externalSelectedLang || selectedLang;

  const handleLangChange = (newLang) => {
    setSelectedLang(newLang);
    if (externalOnLangChange) externalOnLangChange(newLang);
  };

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste! 🙏 I am your ASHA AI Voice & Chat Assistant. Select your preferred language, speak or type patient details, and I will guide you and auto-fill your forms!',
      spokenSummary: 'Namaste! Speak or type health details in your language, and I will extract vitals and guide you.',
      extractedDetails: null,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [appliedMsgId, setAppliedMsgId] = useState(null);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, interimText]);

  // Speech Recognition initialization
  useEffect(() => {
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = activeLang;

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

        if (finalTranscript) {
          setInputText((prev) => (prev ? prev + ' ' + finalTranscript : finalTranscript).trim());
          setInterimText('');
        } else {
          setInterimText(currentInterim);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to initialize speech recognition', err);
    }
  }, [activeLang]);

  // Text-To-Speech (TTS) engine
  const speakText = (text, msgId = null) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop ongoing speech

    if (currentlySpeakingId === msgId && msgId !== null) {
      setCurrentlySpeakingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find matching voice for selected language
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = activeLang.split('-')[0]; // 'hi', 'te', 'ta', etc.
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith(langPrefix) || v.lang.includes('IN') || v.name.includes('India')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setCurrentlySpeakingId(msgId);
    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Toggle Voice Recording
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInterimText('');
      try {
        recognitionRef.current.lang = activeLang;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  };

  // Send message to Gemini Backend
  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isProcessing) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const userMsgId = Date.now();
    const newUserMsg = {
      id: userMsgId,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    if (!customText) setInputText('');
    setInterimText('');
    setIsProcessing(true);

    try {
      // Build history for backend API
      const history = messages
        .filter((m) => m.id !== 1)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text,
        }));

      const res = await fetch(`${apiBase}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: history,
          context: activeContext || 'general',
          language: activeLang,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const botMsgId = Date.now() + 1;

      const newBotMsg = {
        id: botMsgId,
        sender: 'bot',
        text: data.reply,
        spokenSummary: data.spoken_summary || data.reply,
        extractedDetails: data.extracted_details,
        autoRegisteredPatient: data.auto_registered_patient,
        emergencyAlert: data.emergency_alert,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newBotMsg]);

      // Trigger global event so Patients screen & Dashboard update live
      if (data.auto_registered_patient || data.emergency_alert) {
        window.dispatchEvent(new CustomEvent('patient-updated', { detail: data }));
      }

      // Auto TTS if enabled
      if (ttsEnabled && data.spoken_summary) {
        speakText(data.spoken_summary, botMsgId);
      }

      // Auto-apply to form if user requested and extracted data exists
      if (data.extracted_details && onApplyDetails) {
        onApplyDetails(data.extracted_details);
        setAppliedMsgId(botMsgId);
      }
    } catch (err) {
      console.error('Chatbot API error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Sorry, I encountered an error communicating with the AI model (${err.message}). Please try again.`,
          spokenSummary: 'Sorry, I encountered a network error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyClick = (extractedDetails, msgId) => {
    if (onApplyDetails && extractedDetails) {
      onApplyDetails(extractedDetails);
      setAppliedMsgId(msgId);
    }
  };

  const handleRegisterClick = (extractedDetails) => {
    if (onRegisterPatient && extractedDetails) {
      onRegisterPatient(extractedDetails);
    }
  };

  // Quick Prompt Chips based on selected language
  const getQuickPrompts = () => {
    if (activeLang.startsWith('hi')) {
      return [
        '🎙️ गर्भवती महिला: नाम सुनीता, 28 साल, बीपी 140/90',
        '🚨 आपातकालीन संदेश: मरीज के लिए तुरंत मदद भेजें!',
        '🩺 मरीज का बीपी 160/110, हीमोग्लोबिन 8',
        '👶 बच्चा 2 साल, दस्त और बुखार',
      ];
    }
    if (activeLang.startsWith('te')) {
      return [
        '🎙️ గర్భిణీ స్త్రీ: సునీత, 28 సంవత్సరాలు, బిపి 140/90',
        '🚨 అత్యవసర సహాయ సందేశాన్ని పంపండి!',
        '🩺 రక్తపోటు 160/110, హిమోగ్లోబిన్ 8',
        '👶 2 సంవత్సరాల బాబు, విరేచనాలు',
      ];
    }
    if (activeLang.startsWith('ta')) {
      return [
        '🎙️ கர்ப்பிணி பெண்: சுனிதா, 28 வயது, பிபி 140/90',
        '🚨 அவசர உதவிச் செய்தி அனுப்பவும்!',
        '🩺 ரத்த அழுத்தம் 160/110, ஹீமோகுளோபின் 8',
        '👶 2 வயது குழந்தை, வயிற்றுப்போக்கு',
      ];
    }
    return [
      '🎙️ Register patient Sunita, 28 yrs, Rampur, pregnant',
      '🚨 Send Emergency Help SOS Message for critical patient',
      '🩺 Record BP 160/110 and hemoglobin 9.5',
      '👶 Child 18 months with diarrhea',
    ];
  };

  return (
    <div className={inline ? 'inline-chatbot-wrapper' : 'voice-chatbot-wrapper'}>
      {/* Floating Action Trigger Button – only in floating mode */}
      {!inline && !isOpen && (
        <button
          className="chatbot-trigger-btn"
          onClick={() => setIsOpen(true)}
          title="Open ASHA Voice AI Assistant"
          aria-label="Open ASHA Voice AI Assistant"
          id="floating-ai-copilot-trigger"
        >
          <span className="chatbot-trigger-icon">🎙️</span>
          <span style={{ fontWeight: 800 }}>AI Voice Copilot</span>
          <span className="chatbot-trigger-badge">LIVE AI</span>
        </button>
      )}

      {/* Chatbot Panel – floating or inline */}
      {isOpen && (
        <div className={inline ? 'chatbot-panel-inline' : 'chatbot-panel'}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-title-area">
              <div className="chatbot-avatar">✨</div>
              <div>
                <h3 className="chatbot-title">ASHA AI Co-pilot</h3>
                <span className="chatbot-subtitle">Voice & Text Healthcare Assistant</span>
              </div>
            </div>

            <div className="chatbot-header-actions">
              {/* Language Selector – hidden in inline mode (it's in the card header above) */}
              {!inline && (
                <select
                  className="chatbot-lang-select"
                  value={activeLang}
                  onChange={(e) => handleLangChange(e.target.value)}
                  title="Select Assistant Language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                className={`chatbot-tts-toggle ${ttsEnabled ? 'active' : ''}`}
                onClick={() => {
                  setTtsEnabled(!ttsEnabled);
                  if (currentlySpeakingId) window.speechSynthesis?.cancel();
                }}
                title={ttsEnabled ? 'TTS Audio Mute' : 'TTS Audio Enable'}
              >
                {ttsEnabled ? '🔊' : '🔇'}
              </button>

              {/* Close button only in floating mode */}
              {!inline && (
                <button
                  className="chatbot-close-btn"
                  onClick={() => {
                    setIsOpen(false);
                    window.speechSynthesis?.cancel();
                  }}
                  aria-label="Close Assistant"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Messages Body */}
          <div className="chatbot-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-container ${msg.sender === 'user' ? 'user-msg' : 'bot-msg'}`}
              >
                <div className="chat-avatar">{msg.sender === 'user' ? '👤' : '🤖'}</div>
                <div className="chat-content">
                  <div className="chat-bubble">
                    <p className="chat-text">{msg.text}</p>

                    {/* Emergency SOS Dispatch Card */}
                    {msg.emergencyAlert && (
                      <div className="emergency-sos-card">
                        <div className="sos-header">
                          <span className="sos-pulse">🚨</span>
                          <strong>EMERGENCY SOS DISPATCHED</strong>
                          <span className="sos-badge">{msg.emergencyAlert.status}</span>
                        </div>
                        <p className="sos-msg">{msg.emergencyAlert.message}</p>
                        <div className="sos-meta">
                          <span>📋 Ref ID: <code>{msg.emergencyAlert.sos_id}</code></span>
                          <span>🏥 Facility: {msg.emergencyAlert.target_facility}</span>
                        </div>
                      </div>
                    )}

                    {/* Auto Registered Patient Card */}
                    {msg.autoRegisteredPatient && (
                      <div className="auto-reg-card">
                        <span style={{ fontSize: 16 }}>✅</span>
                        <div>
                          <strong>Saved to Patients Section</strong>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>
                            Patient #{msg.autoRegisteredPatient.id} — {msg.autoRegisteredPatient.name} ({msg.autoRegisteredPatient.village})
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Extracted Details Card */}
                    {msg.extractedDetails && (
                      <div className="extracted-details-card">
                        <div className="extracted-header">
                          <span>📋 Extracted Details</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {onRegisterPatient && (msg.extractedDetails.patient_name || msg.extractedDetails.age || msg.extractedDetails.village) && (
                              <button
                                className="btn-apply-details"
                                style={{ background: 'var(--color-primary)', color: 'white' }}
                                onClick={() => handleRegisterClick(msg.extractedDetails)}
                              >
                                👤 Register Patient
                              </button>
                            )}
                            {appliedMsgId === msg.id ? (
                              <span className="badge-applied">✓ Applied</span>
                            ) : (
                              <button
                                className="btn-apply-details"
                                onClick={() => handleApplyClick(msg.extractedDetails, msg.id)}
                              >
                                ⚡ Fill Form
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="extracted-grid">
                          {Object.entries(msg.extractedDetails).map(([key, val]) => (
                            <div key={key} className="extracted-chip">
                              <span className="chip-key">{key.replace(/_/g, ' ')}:</span>
                              <span className="chip-val">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions under bubble */}
                  {msg.sender === 'bot' && (
                    <div className="chat-footer-actions">
                      <button
                        className="btn-tts-speak"
                        onClick={() => speakText(msg.spokenSummary || msg.text, msg.id)}
                      >
                        {currentlySpeakingId === msg.id ? '⏹️ Stop' : '🔊 Listen'}
                      </button>
                      <span className="chat-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Interim voice transcript indicator */}
            {(isRecording || interimText) && (
              <div className="interim-speech-bar">
                <span className="pulse-dot">🔴</span>
                <span className="interim-text">{interimText || 'Listening in ' + (SUPPORTED_LANGUAGES.find(l => l.code === activeLang)?.name || activeLang) + '...'}</span>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="chat-bubble-container bot-msg">
                <div className="chat-avatar">🤖</div>
                <div className="chat-bubble loading-bubble">
                  <span className="spinner-dots">AI model is thinking...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="quick-prompts-bar">
            {getQuickPrompts().map((prompt, idx) => (
              <button
                key={idx}
                className="quick-prompt-chip"
                onClick={() => handleSendMessage(prompt.replace(/^[^\w]+/, ''))}
                disabled={isProcessing}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Footer Input Area */}
          <div className="chatbot-footer">
            <button
              className={`btn-mic-record ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title={isRecording ? 'Stop Recording' : 'Voice Input (Microphone)'}
              type="button"
            >
              {isRecording ? '⏹️' : '🎙️'}
            </button>

            <input
              type="text"
              className="chatbot-input"
              placeholder={isRecording ? 'Listening... speak now' : 'Speak or type patient details...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              disabled={isProcessing}
            />

            <button
              className="btn-send"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isProcessing}
              type="button"
            >
              ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
