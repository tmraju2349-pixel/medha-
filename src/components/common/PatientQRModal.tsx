import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';
import { PatientProfileRecord } from '../../types/medha';
import { createPatientQRPayload } from '../../services/patientCaregiverService';

interface PatientQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientProfileRecord;
}

export const PatientQRModal: React.FC<PatientQRModalProps> = ({
  isOpen,
  onClose,
  patient,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const payload = createPatientQRPayload(patient);
      const url = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0E7C66',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && patient) {
      generateCode();
    }
  }, [isOpen, patient]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(patient.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-emerald-100 flex flex-col items-center text-center">
        {/* Header */}
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0E7C66] flex items-center justify-center mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 font-serif">
          Connect to Caregiver
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-[260px]">
          Show this QR code to your caregiver or daughter to link this device.
        </p>

        {/* Patient Badge */}
        <div className="mt-4 py-1.5 px-3 bg-gray-50 rounded-full border border-gray-200 inline-flex items-center gap-2">
          <span className="text-base">{patient.avatar || '👴'}</span>
          <span className="text-xs font-bold text-gray-800">{patient.name}</span>
          <span className="text-[10px] text-emerald-700 bg-emerald-100/60 font-semibold px-2 py-0.5 rounded-full">
            {patient.city}
          </span>
        </div>

        {/* QR Display */}
        <div className="mt-5 p-3 bg-white rounded-2xl border-2 border-dashed border-emerald-200 shadow-inner flex items-center justify-center min-h-[220px] w-full max-w-[240px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Generating secure pass...</span>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${patient.name}`}
              className="w-full h-auto rounded-xl"
            />
          ) : (
            <span className="text-xs text-red-500">QR Generation Error</span>
          )}
        </div>

        {/* 6-Digit Code Fallback */}
        <div className="mt-4 w-full bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Pairing Passcode
            </span>
            <span className="font-mono text-xl font-black text-[#0E7C66] tracking-wider">
              {patient.code}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-2 bg-white rounded-xl border border-emerald-300 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/50 flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-3 text-[11px] text-gray-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted patient ID: {patient.id}</span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};
