import React, { useState } from 'react';
import { UserPlus, X, Heart, Shield, Sparkles } from 'lucide-react';
import { PatientProfileRecord } from '../../types/medha';

interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (profile: Omit<PatientProfileRecord, 'id' | 'code' | 'createdAt'>) => void;
}

export const AddPatientModal: React.FC<AddProfileModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [preferredTerm, setPreferredTerm] = useState('Loved One');
  const [age, setAge] = useState('72');
  const [stage, setStage] = useState<'Mild' | 'Moderate' | 'Advanced' | 'Early'>('Mild');
  const [city, setCity] = useState('Guwahati, Assam');
  const [avatar, setAvatar] = useState('👴');
  const [phone, setPhone] = useState('+91');
  const [emergencyPhone, setEmergencyPhone] = useState('+919876543210');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      preferredTerm: preferredTerm.trim() || 'Loved One',
      relationshipToCaregiver: preferredTerm.trim() || 'Family',
      age: parseInt(age) || 70,
      stage,
      city: city.trim() || 'Assam',
      avatar,
      phone: phone.trim(),
      emergencyContact: 'Primary Guardian',
      emergencyPhone: emergencyPhone.trim(),
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#0E7C66] flex items-center justify-center shadow-xs">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 font-serif">
              Add a Profile
            </h3>
            <p className="text-xs text-gray-500">
              Create a dignified care circle profile &amp; pairing QR code.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Avatar & Name */}
          <div className="flex gap-3 items-center">
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Avatar</label>
              <select
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="text-2xl p-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-emerald-600 cursor-pointer"
              >
                <option value="👴">👴 Grandfather / Koka</option>
                <option value="👵">👵 Grandmother / Aita</option>
                <option value="🧓">🧓 Elder / Senior</option>
                <option value="👨‍🦳">👨‍🦳 Senior Male</option>
                <option value="👩‍🦳">👩‍🦳 Senior Female</option>
                <option value="🌸">🌸 Flower</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Chandra Saikia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-white focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Ethical Identity / Term of Reverence */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500" />
                <span>Term of Reverence / Relationship</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">How MEDHA refers to them</span>
            </label>
            <select
              value={preferredTerm}
              onChange={(e) => setPreferredTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-emerald-600 cursor-pointer"
            >
              <option value="Loved One">Loved One (Warm &amp; Relational)</option>
              <option value="Father">Father / Baba / Deuta</option>
              <option value="Mother">Mother / Maa</option>
              <option value="Grandfather">Grandfather / Koka</option>
              <option value="Grandmother">Grandmother / Aita</option>
              <option value="Elder">Elder (Respected Senior / জেষ্ঠজন)</option>
              <option value="Care Partner">Care Partner (Collaborative)</option>
              <option value="Memory Companion">Memory Companion</option>
            </select>
          </div>

          {/* Age & Dementia Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="40"
                max="115"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-white focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">Care &amp; Cognitive Support</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-emerald-600 cursor-pointer"
              >
                <option value="Early">Early Support</option>
                <option value="Mild">Mild Cognitive Support</option>
                <option value="Moderate">Moderate Support</option>
                <option value="Advanced">Comprehensive Care</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">City / Neighborhood</label>
            <input
              type="text"
              placeholder="e.g. Nizarapara, Guwahati"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-white focus:outline-emerald-600"
            />
          </div>

          {/* Emergency Phone */}
          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">Primary Guardian Emergency Contact</label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:bg-white focus:outline-emerald-600"
            />
          </div>

          {/* Daily Care Notes */}
          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">Daily Care &amp; Comfort Notes</label>
            <textarea
              placeholder="e.g. Enjoys old Assamese folk music, evening walk near Dighalipukhuri..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-emerald-600"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full py-3 rounded-xl bg-[#0E7C66] text-white text-sm font-bold hover:bg-[#0B6754] transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Save Profile &amp; Generate QR Code</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export const AddProfileModal = AddPatientModal;
export default AddPatientModal;
