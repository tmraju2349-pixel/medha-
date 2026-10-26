import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Share2, QrCode, ShieldCheck, Users, ExternalLink } from 'lucide-react';
import { PatientProfileRecord } from '../../types/medha';
import { createPatientQRPayload } from '../../services/patientCaregiverService';

interface PatientQRCodeCardProps {
  patient: PatientProfileRecord;
  connectedCaregiverCount?: number;
  onInviteCaregiver?: () => void;
}

export const PatientQRCodeCard: React.FC<PatientQRCodeCardProps> = ({
  patient,
  connectedCaregiverCount = 3,
  onInviteCaregiver,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const payload = createPatientQRPayload(patient);
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1.5,
      color: {
        dark: '#074236',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR:', err));
  }, [patient]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(patient.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/?pair=${patient.code}&patient=${encodeURIComponent(patient.name)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/?pair=${patient.code}&patient=${encodeURIComponent(patient.name)}`;
    const shareText = `Connect as caregiver for ${patient.name} on Medha Care. Pairing Code: ${patient.code}. Link: ${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Caregiver Invite · ${patient.name}`,
          text: shareText,
          url: inviteUrl,
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    // Fallback WhatsApp web
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
      {/* Top Banner */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2 text-left">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base">
            {patient.avatar}
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900 leading-tight">{patient.name}</h4>
            <p className="text-[11px] text-gray-500">Independent Patient Identity</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold">
          <Users className="w-3.5 h-3.5" />
          <span>{connectedCaregiverCount} Caregivers</span>
        </div>
      </div>

      {/* QR Code Canvas */}
      <div className="p-2.5 bg-white border border-gray-200 rounded-2xl shadow-inner mb-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR Code for ${patient.name}`} className="w-40 h-40 object-contain rounded-lg" />
        ) : (
          <div className="w-40 h-40 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
            <QrCode className="w-8 h-8 animate-pulse" />
          </div>
        )}
      </div>

      {/* Pairing Code Big Box */}
      <div className="w-full bg-[#FAF7F0] border border-[#E8E1CF] rounded-xl p-3 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
          Patient Pairing Code
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-2xl font-black text-[#0A5C4C] tracking-widest">
            {patient.code}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-emerald-700 transition cursor-pointer"
            title="Copy pairing code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Share with doctors, nurses, or family members to link devices
        </p>
      </div>

      {/* Actions */}
      <div className="w-full grid grid-cols-2 gap-2">
        <button
          onClick={handleCopyInviteLink}
          className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
        </button>

        <button
          onClick={handleShareInvite}
          className="py-2.5 px-3 bg-[#0E7C66] hover:bg-[#0A5C4C] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share Invite</span>
        </button>
      </div>

      {onInviteCaregiver && (
        <button
          onClick={onInviteCaregiver}
          className="mt-3 text-xs font-bold text-[#0E7C66] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>+ Add caregiver to {patient.name.split(' ')[0]}'s care circle</span>
        </button>
      )}
    </div>
  );
};
