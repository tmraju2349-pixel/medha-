import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Volume2,
  VolumeX,
  Navigation,
  MessageSquare,
  Battery,
  Clock,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Radio,
  Minimize2,
  Maximize2,
  Send,
  Sparkles,
  Heart,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';

export const CaregiverSOSAlertModal: React.FC = () => {
  const {
    sosActive,
    sosDetails,
    clearSOS,
    currentLocation,
    distanceToHome,
    db,
    getWhatsAppSOSUrl,
    currentPatient,
    patientName,
    patientFirstName,
    caregiverName,
    isSirenMuted,
    toggleSirenMute,
    sendVoiceReassurance,
    addToast,
  } = useMedha();

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [reassuranceText, setReassuranceText] = useState<string>('');
  const [justSentReassurance, setJustSentReassurance] = useState<boolean>(false);

  // Calculate elapsed time from SOS start
  useEffect(() => {
    if (!sosActive) {
      setElapsedSeconds(0);
      setIsMinimized(false);
      return;
    }

    const startTs = sosDetails?.timestamp || Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startTs) / 1000));
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [sosActive, sosDetails?.timestamp]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeLat = sosDetails?.location?.lat ?? currentLocation?.lat ?? 26.1832;
  const activeLng = sosDetails?.location?.lng ?? currentLocation?.lng ?? 91.7425;
  const patientPhone = sosDetails?.patientPhone || currentPatient?.emergencyPhone || '+919876543210';
  const effectiveDistance = sosDetails?.distanceToHome ?? distanceToHome ?? 320;
  const batteryLvl = sosDetails?.batteryLevel ?? 82;
  const breachReason = sosDetails?.src || 'Perimeter Safety Boundary Breached';
  const patientAge = sosDetails?.patientAge ?? currentPatient?.age ?? 72;
  const dementiaStage = sosDetails?.stage ?? currentPatient?.stage ?? 'Stage 2 (Moderate Dementia)';
  const bloodGroup = sosDetails?.bloodGroup ?? currentPatient?.bloodGroup ?? 'O+';
  const homeZone = db.zones.find((z) => z.id === 1 || z.category === 'home') || db.zones[0];

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${activeLat},${activeLng}&travelmode=walking`;
    window.open(url, '_blank');
  };

  const handleSendQuickReassurance = (text: string) => {
    sendVoiceReassurance(text);
    setJustSentReassurance(true);
    setTimeout(() => setJustSentReassurance(false), 3000);
  };

  const handleCustomReassuranceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassuranceText.trim()) return;
    sendVoiceReassurance(reassuranceText.trim());
    setReassuranceText('');
    setJustSentReassurance(true);
    setTimeout(() => setJustSentReassurance(false), 3000);
  };

  if (!sosActive) return null;

  // Minimized Sticky Floating Bar
  if (isMinimized) {
    return (
      <div
        id="caregiverSosMinimizedBar"
        className="fixed bottom-6 right-6 z-[95] max-w-lg w-[calc(100%-3rem)] animate-in slide-in-from-bottom-4 duration-300"
      >
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl p-4 shadow-2xl border-2 border-red-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm truncate">🚨 SOS ACTIVE: {patientFirstName}</span>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/30 text-amber-200">
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <p className="text-xs text-white/85 truncate">
                {effectiveDistance}m outside safe zone · Live GPS transmitting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSirenMute}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
              title={isSirenMuted ? 'Unmute Siren' : 'Mute Siren'}
            >
              {isSirenMuted ? <VolumeX className="w-4 h-4 text-amber-300" /> : <Volume2 className="w-4 h-4 text-white animate-bounce" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="px-3 py-1.5 rounded-xl bg-white text-red-700 font-extrabold text-xs hover:bg-red-50 transition flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Command View</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full-Screen Emergency Command Center Modal
  return (
    <div
      id="caregiverSosModalOverlay"
      className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      style={{ background: 'rgba(15, 2, 2, 0.88)', backdropFilter: 'blur(10px)' }}
    >
      <div className="w-full max-w-3xl my-auto bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white rounded-3xl border-2 border-red-500 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
        {/* Pulsing Emergency Top Strip */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-5 py-3.5 flex items-center justify-between gap-3 text-white flex-wrap shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-3.5 h-3.5 rounded-full bg-white block animate-ping absolute inset-0" />
              <div className="w-8 h-8 rounded-xl bg-white text-red-600 flex items-center justify-center font-bold text-lg shadow-sm">
                🚨
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">
                  Real-Time Emergency SOS Alert
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-400 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-300" />
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium">
                Live Geofence Boundary Breach detected on {patientFirstName}’s device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Siren toggle */}
            <button
              onClick={toggleSirenMute}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                isSirenMuted
                  ? 'bg-red-950 text-amber-200 border border-red-400'
                  : 'bg-white text-red-700 shadow-md animate-pulse'
              }`}
            >
              {isSirenMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-amber-300" />
                  <span>Siren Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-red-600" />
                  <span>Siren Active</span>
                </>
              )}
            </button>

            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition cursor-pointer"
              title="Minimize to floating banner"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Elder Snapshot & Breach telemetry */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Elder Profile & Status */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                  👴
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">{patientName}</h3>
                  <p className="text-xs text-rose-300 font-semibold">{dementiaStage} · Age {patientAge}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Assam, India · Blood: {bloodGroup}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Elder Phone Battery</span>
                  </div>
                  <p className="font-mono font-bold text-white mt-1 text-sm">{batteryLvl}% Active</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase">
                    <Radio className="w-3.5 h-3.5 text-rose-400" />
                    <span>Signal Transmit</span>
                  </div>
                  <p className="font-bold text-emerald-400 mt-1 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Real-time Live
                  </p>
                </div>
              </div>
            </div>

            {/* GPS Telemetry & Breach Card */}
            <div className="bg-red-950/40 rounded-2xl p-4 border border-red-500/30 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                    <ShieldAlert className="w-3 h-3" />
                    Breach Incident
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1.5">{breachReason}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Distance Outside</p>
                  <p className="text-lg font-black text-rose-400 font-mono">+{effectiveDistance}m</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Designated Safe Zone:</span>
                  <span className="font-bold text-white truncate max-w-[170px]">{homeZone?.name || 'Home Sanctuary'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current GPS Pin:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {activeLat.toFixed(5)}, {activeLng.toFixed(5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coordinates Accuracy:</span>
                  <span className="text-emerald-400 font-medium">±12m (High Confidence)</span>
                </div>
              </div>

              <button
                onClick={handleOpenGoogleMaps}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open Direct Navigation in Google Maps</span>
                <ExternalLink className="w-3 h-3 text-white/70" />
              </button>
            </div>
          </div>

          {/* Quick Voice Reassurance Dispatcher */}
          <div className="bg-gradient-to-r from-teal-950/50 via-emerald-950/40 to-teal-950/50 rounded-2xl p-4 border border-teal-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📢</span>
                <div>
                  <h4 className="text-xs font-bold text-teal-200 uppercase tracking-wider">
                    Instant Voice Reassurance to Elder's Device
                  </h4>
                  <p className="text-[11px] text-gray-300">
                    Transmits your soothing voice message to play out loud on {patientFirstName}’s speaker to keep them calm.
                  </p>
                </div>
              </div>
              {justSentReassurance && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3" />
                  Spoken on Elder's Phone!
                </span>
              )}
            </div>

            {/* Quick preset chips */}
            <div className="flex gap-2 flex-wrap mt-2.5">
              <button
                type="button"
                onClick={() => handleSendQuickReassurance(`Stay calm ${patientFirstName}, Pooja is on the way right now. Please sit down and stay safe.`)}
                className="px-3 py-1.5 rounded-xl bg-teal-900/60 hover:bg-teal-800 text-teal-100 text-xs font-semibold border border-teal-700/50 transition cursor-pointer"
              >
                💬 "I'm on the way, please stay safe"
              </button>
              <button
                type="button"
                onClick={() => handleSendQuickReassurance(`ভয় নকৰিব ${patientFirstName} ডাঙৰীয়া, মই আহি আছোঁ। আপুনি তাতে জিৰণি লওক।`)}
                className="px-3 py-1.5 rounded-xl bg-teal-900/60 hover:bg-teal-800 text-teal-100 text-xs font-semibold border border-teal-700/50 transition cursor-pointer"
              >
                Assamese: "ভয় নকৰিব, মই আহি আছোঁ"
              </button>
              <button
                type="button"
                onClick={() => handleSendQuickReassurance(`${patientFirstName}, find a nearby bench or shopkeeper and wait for me. I am 3 minutes away.`)}
                className="px-3 py-1.5 rounded-xl bg-teal-900/60 hover:bg-teal-800 text-teal-100 text-xs font-semibold border border-teal-700/50 transition cursor-pointer"
              >
                💬 "Wait at a nearby shop, 3 mins away"
              </button>
            </div>

            {/* Custom message input */}
            <form onSubmit={handleCustomReassuranceSubmit} className="mt-3 flex gap-2">
              <input
                type="text"
                value={reassuranceText}
                onChange={(e) => setReassuranceText(e.target.value)}
                placeholder="Type custom comforting message to speak on elder's phone..."
                className="flex-1 bg-black/40 border border-teal-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-teal-400"
              />
              <button
                type="submit"
                disabled={!reassuranceText.trim()}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Speak Now</span>
              </button>
            </form>
          </div>

          {/* Primary Action Buttons Bar */}
          <div className="space-y-3 pt-1">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
              Immediate Emergency Response Actions
            </h4>

            <div className="grid sm:grid-cols-3 gap-2.5">
              {/* Call Elder */}
              <a
                href={`tel:${patientPhone}`}
                className="py-3 px-4 rounded-2xl bg-white hover:bg-gray-100 text-red-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg active:scale-98"
              >
                <PhoneCall className="w-4 h-4 text-red-600" />
                <span>Call {patientFirstName} Now</span>
              </a>

              {/* WhatsApp Location */}
              <a
                href={getWhatsAppSOSUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg active:scale-98"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>Dispatch WhatsApp SOS Pin</span>
              </a>

              {/* Navigate Google Maps */}
              <button
                onClick={handleOpenGoogleMaps}
                className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg active:scale-98 cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-white" />
                <span>Turn-by-Turn Route</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Emergency Ambulance 108 */}
              <a
                href="tel:108"
                className="py-2.5 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Dial 108 Ambulance</span>
              </a>

              {/* Emergency 112 National */}
              <a
                href="tel:112"
                className="py-2.5 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>Dial 112 Police / Helpline</span>
              </a>
            </div>
          </div>

          {/* Resolution Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>
                Resolving will halt sirens and broadcast confirmation that {patientFirstName} is safe.
              </span>
            </div>

            <button
              id="caregiverResolveSosBtn"
              onClick={() => {
                clearSOS();
                addToast(`✓ Incident resolved: ${patientFirstName} marked safe!`, '🛡️');
              }}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-xl transition-transform active:scale-98 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Elder Located & Safe · Clear Emergency ✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
