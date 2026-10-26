import React, { useState, useEffect, useRef } from 'react';
import { useMedha } from '../../context/MedhaContext';
import { parseOfflineVoiceCommand, generateScreenSummary, ParsedVoiceCommand } from '../../services/localCommandParser';
import { memoryService } from '../../modules/memory/services/memoryService';
import {
  Mic,
  MicOff,
  Sparkles,
  Wifi,
  WifiOff,
  Volume2,
  X,
  Check,
  RotateCcw,
  Search,
  Trees,
  Clock,
  Heart,
  AlertTriangle,
  BookOpen,
  Send,
  HelpCircle,
} from 'lucide-react';

export const MedhaVoiceAssistant: React.FC = () => {
  const {
    isVoiceAssistantOpen,
    setIsVoiceAssistantOpen,
    currentPage,
    setPage,
    treeSearchQuery,
    setTreeSearchQuery,
    activePatientId,
    db,
    addTask,
    incrementHydration,
    triggerSOS,
    addDiaryEntry,
    addToast,
    speakText,
    currentPatient,
  } = useMedha();

  // Mode: Online (Gemini AI) vs Offline (SpeechRecognition + Local Parser)
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [networkAvailable, setNetworkAvailable] = useState<boolean>(true);

  // Language selection for ASR
  const [selectedLang, setSelectedLang] = useState<string>('en-IN');

  // Assistant states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<ParsedVoiceCommand | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Tap the mic or select a quick command below');

  const recognitionRef = useRef<any>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkAvailable(true);
    };
    const handleOffline = () => {
      setNetworkAvailable(false);
      setIsOnlineMode(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Web Speech API if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = selectedLang;

      rec.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening… speak clearly into your microphone');
      };

      rec.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setStatusMessage('Microphone access denied. You can type commands below.');
        } else {
          setStatusMessage('Could not hear clearly. Please try again or type below.');
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [selectedLang]);

  // When speech ends and we have a transcript, process it automatically
  useEffect(() => {
    if (!isListening && transcript.trim().length > 1 && !pendingConfirmation) {
      processCommand(transcript);
    }
  }, [isListening, transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setPendingConfirmation(null);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = selectedLang;
          recognitionRef.current.start();
        } else {
          setStatusMessage('Speech recognition not supported in this browser. Please type below.');
        }
      } catch (e) {
        console.warn('Recognition start failed:', e);
      }
    }
  };

  // Process user speech via ONLINE (Gemini API) or OFFLINE (Local Command Parser)
  const processCommand = async (inputText: string) => {
    const query = inputText.trim();
    if (!query) return;

    setIsProcessing(true);
    setStatusMessage('Analyzing intent and preparing action…');

    let resolvedCommand: ParsedVoiceCommand | null = null;

    if (isOnlineMode && networkAvailable) {
      // ⚡ ONLINE PATH: Gemini API
      try {
        const response = await fetch('/api/assistant/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            language: selectedLang,
            currentPage,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (!data.fallbackToLocal && data.action) {
            resolvedCommand = {
              action: data.action,
              originalText: query,
              detectedLanguage: data.detectedLanguage || 'Detected by Gemini',
              confirmationPrompt: data.confirmationPrompt || '',
              answer: data.answer || '',
              payload: data.payload || {},
            };
          }
        }
      } catch (err) {
        console.warn('Gemini online API error, falling back to offline parser:', err);
      }
    }

    // 📴 OFFLINE PATH or Fallback: Local Command Parser
    if (!resolvedCommand) {
      resolvedCommand = parseOfflineVoiceCommand(query, currentPage);
    }

    setIsProcessing(false);
    setPendingConfirmation(resolvedCommand);

    // Speak answer or confirmation query aloud to elderly user
    if (resolvedCommand.action === 'answer' && resolvedCommand.answer) {
      speakText(resolvedCommand.answer);
    } else if (resolvedCommand.confirmationPrompt) {
      speakText(resolvedCommand.confirmationPrompt);
    }
  };

  // Execute confirmed action
  const handleConfirmAction = () => {
    if (!pendingConfirmation) return;

    const { action, payload, originalText } = pendingConfirmation;

    switch (action) {
      case 'search_tree': {
        const query = payload?.query || 'pets';
        setPage('tree');
        setTreeSearchQuery(query);
        addToast(`Found memories for "${query}" in Memory Tree`, '🌳');
        speakText(`Opened Memory Tree and filtered for ${query}.`);
        break;
      }

      case 'navigate': {
        const targetPage = payload?.page || 'home';
        setPage(targetPage);
        addToast(`Switched to ${targetPage}`, '🧭');
        break;
      }

      case 'read_screen': {
        const contextData = {
          tasksCount: db.tasks.length,
          uncompletedTasks: db.tasks.filter((t) => !t.done).length,
          hydrationCount: db.hydration.count,
          hydrationGoal: db.hydration.goal,
          patientName: currentPatient?.name || db.book.profile.name || 'Patient',
          safeZonesCount: db.zones.length,
          memoriesCount: memoryService.getNodes(activePatientId).length,
        };
        const summary = generateScreenSummary(currentPage, contextData);
        speakText(summary);
        addToast('Reading current screen…', '🔊');
        break;
      }

      case 'hydrate': {
        incrementHydration();
        addToast('Logged 1 glass of drinking water 💧', '💧');
        speakText('Water logged! Keep it up.');
        break;
      }

      case 'sos': {
        triggerSOS('MEDHA Voice Assistant');
        addToast('Emergency SOS alert activated!', '🚨');
        break;
      }

      case 'reminder': {
        const title = payload?.title || originalText || 'Reminder';
        const time = payload?.time || '17:00';
        addTask(title, time);
        addToast(`Scheduled reminder: "${title}" at ${time}`, '⏰');
        speakText(`Scheduled: ${title} at ${time}.`);
        break;
      }

      case 'memory': {
        const title = payload?.title || originalText.slice(0, 40);
        const description = payload?.description || originalText;
        // Default to family or personal category in the tree
        const nodes = memoryService.getNodes(activePatientId);
        const categoryNode = nodes.find((n) => n.nodeType === 'category') || nodes[0];
        const parentId = categoryNode ? categoryNode.id : null;

        memoryService.createNode({
          patientId: activePatientId,
          parentId,
          nodeType: 'memory',
          title,
          description,
          importance: payload?.importance || 'medium',
          icon: 'sparkles',
        });

        addToast(`Added new memory to Memory Tree 🌳`, '🌳');
        speakText(`Saved "${title}" to your Memory Tree.`);
        setPage('tree');
        break;
      }

      case 'diary': {
        const entryText = payload?.text || originalText;
        addDiaryEntry(entryText, '', selectedLang, 'en', null);
        addToast('Saved note to Voice Diary 🎙', '🎙');
        speakText('Recorded into your Voice Diary.');
        break;
      }

      default:
        addToast('Command completed', '✅');
        break;
    }

    // Reset & close assistant
    setPendingConfirmation(null);
    setTranscript('');
    setIsVoiceAssistantOpen(false);
  };

  const handleCancelAction = () => {
    setPendingConfirmation(null);
    setTranscript('');
    setStatusMessage('Action cancelled. Speak or choose another command.');
    speakText('Cancelled.');
  };

  if (!isVoiceAssistantOpen) return null;

  return (
    <div
      id="medhaVoiceModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-[var(--line)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#074236] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0E7C66] flex items-center justify-center text-xl shadow-inner">
              🎙
            </div>
            <div>
              <h2 className="font-display text-xl font-bold leading-tight">
                MEDHA Voice Assistant
              </h2>
              <p className="text-xs text-white/70">
                Elderly-friendly dual online / offline intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online / Offline Toggle */}
            <button
              onClick={() => setIsOnlineMode(!isOnlineMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                isOnlineMode
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                  : 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
              }`}
              title="Toggle Online (Gemini AI) or Offline (Local Command Parser)"
            >
              {isOnlineMode ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Online (Gemini AI)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                  <span>Offline (Local Mode)</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                recognitionRef.current?.stop();
                setIsVoiceAssistantOpen(false);
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Selector Bar */}
        <div className="bg-[#FAF6EF] px-5 py-2.5 border-b border-[var(--line)] flex items-center justify-between text-xs">
          <span className="font-bold text-[#8A7E72]">Speech Language:</span>
          <div className="flex items-center gap-1.5">
            {[
              { code: 'en-IN', label: 'English' },
              { code: 'as-IN', label: 'অসমীয়া (Assamese)' },
              { code: 'bn-IN', label: 'বাংলা (Bengali)' },
              { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedLang === lang.code
                    ? 'bg-[#0E7C66] text-white shadow-xs'
                    : 'bg-white text-[#2B2320] border border-[var(--line)] hover:bg-[#F2EEE4]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Active Listening / Mic Control */}
          {!pendingConfirmation && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="relative">
                {isListening && (
                  <span className="absolute -inset-4 rounded-full bg-emerald-400/30 animate-ping" />
                )}
                <button
                  id="micBigPulseButton"
                  onClick={toggleListening}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gradient-to-tr from-[#074236] to-[#0E7C66] text-white hover:scale-105'
                  }`}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                >
                  {isListening ? (
                    <Mic className="w-10 h-10 animate-bounce" />
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                </button>
              </div>

              <p className="mt-4 font-bold text-base text-[#2B2320]">
                {isListening ? 'Listening now…' : 'Tap to Speak'}
              </p>
              <p className="text-xs text-[#8A7E72] mt-1 max-w-sm">{statusMessage}</p>

              {/* Real-time transcript display */}
              {transcript && (
                <div className="mt-4 w-full p-4 rounded-2xl bg-[#F4EFE6] border border-[#ECE3D6] text-sm text-[#2B2320] font-medium text-left">
                  <span className="text-xs font-bold text-[#8A7E72] uppercase block mb-1">
                    Heard Speech:
                  </span>
                  "{transcript}"
                </div>
              )}

              {/* Text Input Fallback */}
              <div className="mt-6 w-full flex items-center gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      processCommand(textInput);
                      setTextInput('');
                    }
                  }}
                  placeholder="Or type your command here (e.g. 'search pets')"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C66] bg-white"
                />
                <button
                  onClick={() => {
                    if (textInput.trim()) {
                      processCommand(textInput);
                      setTextInput('');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0E7C66] text-white font-bold text-sm shadow hover:bg-[#0A5C4C] transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="mt-6 w-full text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A7E72] mb-2">
                  Quick Voice Commands & Questions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { text: 'tell me about Nepal floods', label: '🌊 Tell me about Nepal floods' },
                    { text: 'open trees and search for pets', label: '🌳 Search for pets in Memory Tree' },
                    { text: 'read screen', label: '🔊 Read screen aloud' },
                    { text: 'tell me about Assam tea gardens', label: '🌿 Tell me about Assam tea gardens' },
                    { text: 'drink water', label: '💧 Record 1 glass of water' },
                    { text: 'remind me to take medicine at 5pm', label: '⏰ Set 5 PM pill reminder' },
                    { text: 'remember our morning walk with Bruno', label: '✨ Add memory to tree' },
                    { text: 'emergency sos', label: '🚨 Emergency SOS' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => processCommand(p.text)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[var(--line)] text-xs font-semibold text-[#2B2320] hover:bg-[#F2EEE4] hover:border-[#0E7C66] transition cursor-pointer text-left"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* User Confirmation or Answer Card (Step 4 in Architecture) */}
          {pendingConfirmation && (
            <div className="space-y-4 animate-fadeIn">
              {pendingConfirmation.action === 'answer' ? (
                /* 🧠 AI Knowledge / Conversational Answer Card */
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-amber-50/40 border border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0E7C66] text-white">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isOnlineMode ? 'Gemini Live Answer' : 'Offline Answer'}</span>
                      </span>

                      <span className="text-xs text-[#8A7E72] font-semibold">
                        {pendingConfirmation.detectedLanguage}
                      </span>
                    </div>

                    <p className="text-xs text-[#8A7E72] uppercase font-bold tracking-wider">
                      You Asked:
                    </p>
                    <p className="text-base font-bold text-[#2B2320] mt-0.5">
                      "{pendingConfirmation.originalText}"
                    </p>

                    <div className="mt-4 pt-3.5 border-t border-emerald-200/80">
                      <p className="text-xs text-[#0E7C66] uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4" />
                        Voice Assistant Response:
                      </p>
                      <p className="text-base font-medium text-[#074236] mt-2 leading-relaxed">
                        {pendingConfirmation.answer || 'No spoken answer generated.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <button
                      onClick={() => speakText(pendingConfirmation.answer || '')}
                      className="py-2.5 px-3 rounded-xl bg-white border border-[#0E7C66] text-[#0E7C66] font-bold text-xs hover:bg-emerald-50 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen Again</span>
                    </button>

                    <button
                      onClick={() => {
                        const title = pendingConfirmation.originalText.slice(0, 35);
                        const desc = pendingConfirmation.answer || '';
                        const nodes = memoryService.getNodes(activePatientId);
                        const parentId = nodes[0]?.id || null;
                        memoryService.createNode({
                          patientId: activePatientId,
                          parentId,
                          nodeType: 'memory',
                          title,
                          description: desc,
                          importance: 'medium',
                          icon: 'sparkles',
                        });
                        addToast('Saved to Memory Tree 🌳', '🌳');
                        setPendingConfirmation(null);
                        setIsVoiceAssistantOpen(false);
                        setPage('tree');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[#0E7C66] text-white font-bold text-xs shadow hover:bg-[#0A5C4C] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trees className="w-3.5 h-3.5" />
                      <span>Save to Tree</span>
                    </button>

                    <button
                      onClick={() => {
                        setPendingConfirmation(null);
                        setTranscript('');
                        toggleListening();
                      }}
                      className="py-2.5 px-3 rounded-xl border border-[#ECE3D6] text-xs font-bold text-[#8A7E72] hover:bg-[#F2EEE4] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ask Another</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ⚙️ Action Confirmation Card */
                <>
                  <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0E7C66] text-white">
                        {pendingConfirmation.action === 'search_tree' && <Trees className="w-3.5 h-3.5" />}
                        {pendingConfirmation.action === 'reminder' && <Clock className="w-3.5 h-3.5" />}
                        {pendingConfirmation.action === 'memory' && <Sparkles className="w-3.5 h-3.5" />}
                        {pendingConfirmation.action === 'sos' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {pendingConfirmation.action === 'read_screen' && <Volume2 className="w-3.5 h-3.5" />}
                        {pendingConfirmation.action === 'hydrate' && <span>💧</span>}
                        {pendingConfirmation.action === 'navigate' && <span>🧭</span>}
                        <span className="capitalize">{pendingConfirmation.action.replace('_', ' ')}</span>
                      </span>

                      <span className="text-xs text-[#8A7E72] font-semibold">
                        {pendingConfirmation.detectedLanguage}
                      </span>
                    </div>

                    <p className="text-xs text-[#8A7E72] uppercase font-bold tracking-wider">
                      You Said:
                    </p>
                    <p className="text-base font-semibold text-[#2B2320] mt-0.5">
                      "{pendingConfirmation.originalText}"
                    </p>

                    <div className="mt-4 pt-3 border-t border-amber-200/80">
                      <p className="text-xs text-[#8A7E72] uppercase font-bold tracking-wider">
                        Confirmation Prompt:
                      </p>
                      <p className="text-lg font-bold text-[#074236] mt-1">
                        {pendingConfirmation.confirmationPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Action Preview Detail */}
                  {pendingConfirmation.action === 'search_tree' && (
                    <div className="p-3 bg-white rounded-xl border border-[var(--line)] text-xs text-[#2B2320] flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#0E7C66]" />
                      <span>
                        Will switch to <b>Memory Tree</b> and highlight branches matching: <b>"{pendingConfirmation.payload?.query || 'pets'}"</b>
                      </span>
                    </div>
                  )}

                  {pendingConfirmation.action === 'reminder' && (
                    <div className="p-3 bg-white rounded-xl border border-[var(--line)] text-xs text-[#2B2320] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0E7C66]" />
                      <span>
                        Will add task: <b>{pendingConfirmation.payload?.title}</b> scheduled at <b>{pendingConfirmation.payload?.time}</b>
                      </span>
                    </div>
                  )}

                  {/* Execution Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      id="assistantCancelBtn"
                      onClick={handleCancelAction}
                      className="py-3 px-4 rounded-xl border border-[#ECE3D6] font-bold text-sm text-[#8A7E72] hover:bg-[#F2EEE4] transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel / Redo</span>
                    </button>

                    <button
                      id="assistantConfirmBtn"
                      onClick={handleConfirmAction}
                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#0E7C66] to-[#0A5C4C] text-white font-bold text-sm shadow-md hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm & Execute</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
