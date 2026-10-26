import React, { useState } from 'react';
import {
  Users,
  Phone,
  QrCode,
  X,
  Stethoscope,
  ShieldCheck,
  HeartHandshake,
  MessageSquare,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { PatientQRCodeCard } from '../common/PatientQRCodeCard';

interface PatientCareCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PatientCareCircleModal: React.FC<PatientCareCircleModalProps> = ({ isOpen, onClose }) => {
  const { currentPatient, connectedCaregivers, db, addToast } = useMedha();
  const [activeTab, setActiveTab] = useState<'roster' | 'qr' | 'notes'>('roster');

  if (!isOpen || !currentPatient) return null;

  const notes = (db.careCircleNotes || []).filter((n) => n.patientId === currentPatient.id);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Family Doctor':
        return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case 'Primary Caregiver':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'Secondary Guardian':
        return <HeartHandshake className="w-4 h-4 text-purple-600" />;
      default:
        return <Users className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E5DEC9] max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EDF6F2] flex items-center justify-center text-2xl shadow-2xs">
              {currentPatient.avatar}
            </div>
            <div>
              <h3 className="font-display font-bold text-xl ink">{currentPatient.name}'s Care Circle</h3>
              <p className="text-xs text-gray-500">
                Independent Patient · Pairing Code: <b className="font-mono text-emerald-800">{currentPatient.code}</b>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-4 p-1 bg-[#FAF7F0] rounded-2xl border border-[#ECE5D8]">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'roster' ? 'bg-[#0E7C66] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Caregivers ({connectedCaregivers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qr' ? 'bg-[#0E7C66] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Connect QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'notes' ? 'bg-[#0E7C66] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Care Notes ({notes.length})</span>
          </button>
        </div>

        {/* Tab 1: Roster */}
        {activeTab === 'roster' && (
          <div className="mt-5 space-y-3">
            <p className="text-xs text-gray-500">
              The following people are connected to your device and can check your safety, medication, and game scores:
            </p>

            <div className="space-y-2.5">
              {connectedCaregivers.map((cg) => (
                <div
                  key={cg.linkId}
                  className="p-3.5 rounded-2xl border border-[#E5DEC9] bg-[#FAF8F5] flex items-center justify-between gap-3 hover:bg-white transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white border border-[#E8E1CF] flex items-center justify-center text-xl shadow-2xs">
                      {cg.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-gray-900">{cg.name}</h4>
                        {getRoleIcon(cg.role)}
                      </div>
                      <p className="text-xs text-gray-500">{cg.relationship}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`sms:${cg.phone}`}
                      onClick={(e) => {
                        addToast(`Opening SMS for ${cg.name}...`, '💬');
                        window.open(`sms:${cg.phone}`, '_top');
                      }}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl flex items-center justify-center transition cursor-pointer shadow-2xs"
                      title="Send SMS message"
                    >
                      <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </a>
                    <a
                      href={`tel:${cg.phone}`}
                      onClick={(e) => {
                        addToast(`Opening dialer for ${cg.name}...`, '📞');
                        window.open(`tel:${cg.phone}`, '_top');
                      }}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Call</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 mt-4 text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base">💡</span>
              <div>
                <b>Want to add another doctor or child?</b>
                <p className="mt-0.5 text-amber-800">
                  Switch to the "Connect QR Code" tab and let them scan your code or enter <b>{currentPatient.code}</b> on their phone.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: QR & Invite */}
        {activeTab === 'qr' && (
          <div className="mt-5 flex flex-col items-center">
            <PatientQRCodeCard patient={currentPatient} connectedCaregiverCount={connectedCaregivers.length} />
          </div>
        )}

        {/* Tab 3: Notes */}
        {activeTab === 'notes' && (
          <div className="mt-5 space-y-3">
            <p className="text-xs text-gray-500">
              Messages and observations left by your care circle:
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No care notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-gray-900">{note.authorName}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(note.ts).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{note.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
