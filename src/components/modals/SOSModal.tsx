import React from 'react';
import { useMedha } from '../../context/MedhaContext';

export const SOSModal: React.FC = () => {
  const {
    sosActive,
    clearSOS,
    currentLocation,
    distanceToHome,
    db,
    getWhatsAppSOSUrl,
    currentPatient,
    patientName,
    patientFirstName,
    caregiverName,
    caregiverFirstName,
    caregiverPhone,
  } = useMedha();

  if (!sosActive) return null;

  const homeZone = db.zones.find((z) => z.id === 1 || z.category === 'home') || db.zones[0];
  const primaryContact = db.emergencyContacts?.[0] || {
    name: caregiverName,
    phone: caregiverPhone,
    relation: 'Primary Guardian',
  };

  const handleTakeMeHome = () => {
    const lat = homeZone?.lat || 26.1832;
    const lng = homeZone?.lng || 91.7425;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="sosModal"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(120,20,5,.75)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="card w-full max-w-md p-6 text-center pop sos-pulse shadow-2xl border-2 border-red-400/50"
        style={{ background: 'linear-gradient(155deg,#DC2626,#991B1B)', border: 'none' }}
      >
        <div className="text-5xl animate-bounce">🚨</div>
        <h3 className="font-display text-2xl font-bold text-white mt-2">Emergency SOS Active</h3>
        <p className="text-white/95 text-sm mt-1 leading-snug">
          {patientName} has left designated safe areas ({distanceToHome ?? 0}m from Home).
        </p>

        {/* Live Location Box */}
        <div className="mt-3 p-3 rounded-xl bg-black/25 text-left border border-white/20 text-xs text-white/90 space-y-1">
          <div className="flex justify-between">
            <span className="text-white/70">Patient:</span>
            <span className="font-bold text-white">
              {patientName} {currentPatient?.age ? `(${currentPatient.age}y)` : ''} {currentPatient?.notes ? `· ${currentPatient.notes}` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Home Address:</span>
            <span className="font-medium text-white truncate max-w-[200px]">
              {homeZone?.address || currentPatient?.city || 'Guwahati, Assam'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">GPS Pin:</span>
            <span className="font-mono text-white/90">
              {currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 'Guwahati, Assam'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2.5">
          {/* Take Me Home Button */}
          <button
            id="modalTakeMeHome"
            onClick={handleTakeMeHome}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 font-extrabold text-gray-900 text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98 cursor-pointer"
          >
            <span>🧭 Take Me Home (Walking Route)</span>
          </button>

          {/* WhatsApp Pin */}
          <a
            id="modalWhatsAppSOS"
            href={getWhatsAppSOSUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-white text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <span>💬 Send Live WhatsApp Pin to {caregiverFirstName}</span>
          </a>

          {/* Call Guardian */}
          <a
            id="modalCallGuardian"
            href={`tel:${primaryContact.phone}`}
            className="block w-full py-3 rounded-xl bg-white font-extrabold text-sm shadow-sm transition-transform active:scale-98"
            style={{ color: '#991B1B' }}
          >
            📞 Call {primaryContact.name} ({primaryContact.phone})
          </a>

          {/* Emergency 108 */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:108"
              className="py-2.5 rounded-xl bg-black/30 hover:bg-black/40 text-white font-bold text-xs border border-white/30 flex items-center justify-center gap-1"
            >
              🚑 108 Ambulance
            </a>
            <a
              href="tel:+919876543211"
              className="py-2.5 rounded-xl bg-black/30 hover:bg-black/40 text-white font-bold text-xs border border-white/30 flex items-center justify-center gap-1"
            >
              🧑‍⚕️ Dr. Sharma
            </a>
          </div>

          {/* Real-time sync beacon status */}
          <div className="py-1.5 px-2.5 rounded-lg bg-black/30 border border-emerald-400/40 flex items-center justify-center gap-1.5 text-[11px] text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>Transmitting live GPS & audio beacon to {caregiverFirstName}'s screen</span>
          </div>

          {/* Dismiss button */}
          <button
            id="sosSafe"
            onClick={clearSOS}
            className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 cursor-pointer"
          >
            ✓ I'm Safe — Clear Alert
          </button>
        </div>
      </div>
    </div>
  );
};
