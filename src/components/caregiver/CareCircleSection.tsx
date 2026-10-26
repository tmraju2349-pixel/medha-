import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  ShieldCheck,
  Stethoscope,
  HeartHandshake,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  QrCode,
  X,
  CheckCircle2,
  Clock,
  Trash2,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { PatientQRCodeCard } from '../common/PatientQRCodeCard';

export const CareCircleSection: React.FC = () => {
  const {
    currentPatient,
    connectedCaregivers,
    inviteCaregiverToPatient,
    removeCaregiverLink,
    addCareCircleNote,
    db,
    addToast,
  } = useMedha();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  // Invite Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family Doctor');
  const [role, setRole] = useState<
    'Primary Caregiver' | 'Family Doctor' | 'Secondary Guardian' | 'Nurse' | 'Care Coordinator'
  >('Family Doctor');

  // Care Note Form State
  const [noteMessage, setNoteMessage] = useState('');
  const [noteCategory, setNoteCategory] = useState<'general' | 'medication' | 'incident' | 'doctor'>('general');
  const [authorName, setAuthorName] = useState('Pooja Saikia');

  const patientId = currentPatient?.id || 'PAT-7201-BIREN';
  const patientName = currentPatient?.name || 'Biren Saikia';
  const notes = (db.careCircleNotes || []).filter((n) => n.patientId === patientId);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    inviteCaregiverToPatient(patientId, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '+919876543210',
      relationship: relationship.trim() || role,
      role,
    });

    setName('');
    setEmail('');
    setPhone('');
    setIsInviteOpen(false);
  };

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteMessage.trim()) return;

    addCareCircleNote(patientId, authorName, 'Care Circle Member', noteMessage.trim(), noteCategory);
    setNoteMessage('');
  };

  const getRoleBadge = (cRole: string) => {
    switch (cRole) {
      case 'Family Doctor':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Stethoscope className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'Primary Caregiver':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'Secondary Guardian':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: <HeartHandshake className="w-3.5 h-3.5 text-purple-600" />,
        };
      default:
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Users className="w-3.5 h-3.5 text-amber-600" />,
        };
    }
  };

  return (
    <section className="mt-8 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-xl ink">
              Care Circle & Multi-Caregiver Team
            </h3>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              {connectedCaregivers.length} Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {patientName} is an independent patient connected to verified family caregivers, physicians, and guardians.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentPatient && (
            <button
              onClick={() => setIsQROpen(true)}
              className="py-2 px-3.5 bg-white border border-[#D5CDBC] hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>Pairing Code & QR</span>
            </button>
          )}

          <button
            onClick={() => setIsInviteOpen(true)}
            className="py-2 px-3.5 bg-[#0E7C66] hover:bg-[#0A5C4C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invite Caregiver</span>
          </button>
        </div>
      </div>

      {/* Caregiver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connectedCaregivers.map((cg) => {
          const badge = getRoleBadge(cg.role);
          return (
            <div
              key={cg.linkId}
              className="bg-white rounded-2xl border border-[#E5DEC9] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition relative"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F4EFE6] border border-[#E8E1CF] flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                      {cg.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{cg.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{cg.relationship}</p>
                    </div>
                  </div>

                  {connectedCaregivers.length > 1 && (
                    <button
                      onClick={() => removeCaregiverLink(cg.linkId)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="Revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}
                  >
                    {badge.icon}
                    <span>{cg.role}</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                  {cg.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <a
                        href={`tel:${cg.phone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToast(`Calling ${cg.name}...`, '📞');
                        }}
                        className="font-medium text-emerald-800 hover:underline flex items-center gap-1 font-mono"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{cg.phone}</span>
                      </a>
                    </div>
                  )}
                  {cg.email && (
                    <div className="flex items-center justify-between truncate">
                      <span className="text-gray-400">Email:</span>
                      <span className="font-medium text-gray-700 truncate max-w-[160px]">{cg.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Real Caregiver Linked</span>
                </span>
                <span>Active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Care Circle Notes / Clinical Handoff Feed */}
      <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0E7C66]" />
            <h4 className="font-bold text-gray-900 text-base">
              Care Circle Handoff Log & Collaboration Notes
            </h4>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Shared in real time across all {connectedCaregivers.length} caregivers
          </span>
        </div>

        {/* New Note Form */}
        <form onSubmit={handlePostNote} className="mb-6 p-3.5 bg-[#FAF7F0] rounded-xl border border-[#E8E1CF] space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Post as:</span>
            <select
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-emerald-600"
            >
              {connectedCaregivers.map((c) => (
                <option key={c.linkId} value={c.name}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>

            <span className="text-xs font-bold text-gray-600 ml-2">Category:</span>
            <div className="flex gap-1">
              {(['general', 'medication', 'doctor', 'incident'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNoteCategory(cat)}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition capitalize cursor-pointer ${
                    noteCategory === cat
                      ? 'bg-[#0E7C66] text-white shadow-2xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={noteMessage}
              onChange={(e) => setNoteMessage(e.target.value)}
              placeholder={`Write a care observation, vitals, or clinical note for ${patientName.split(' ')[0]}...`}
              className="flex-1 px-3 py-2 text-xs bg-white rounded-xl border border-gray-300 focus:outline-emerald-600 text-gray-800"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#0E7C66] hover:bg-[#0A5C4C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share Note</span>
            </button>
          </div>
        </form>

        {/* Notes List */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No care notes posted yet.</p>
          ) : (
            notes.map((note) => {
              const dateStr = new Date(note.ts).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              const categoryColors = {
                doctor: 'bg-blue-50 text-blue-800 border-blue-200',
                medication: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                general: 'bg-amber-50 text-amber-800 border-amber-200',
                incident: 'bg-rose-50 text-rose-800 border-rose-200',
              };

              return (
                <div
                  key={note.id}
                  className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{note.authorName}</span>
                      <span className="text-[10px] text-gray-500 font-medium">({note.authorRole})</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                          categoryColors[note.category] || categoryColors.general
                        }`}
                      >
                        {note.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{note.message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <h3 className="font-display font-bold text-lg text-gray-900">
                  Invite Real Caregiver
                </h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Connect a real family member, neurologist, nurse, or guardian to <b>{patientName}</b>'s live monitoring circle.
            </p>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma, Sunita Saikia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Role in Care Team</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-emerald-600 bg-white"
                >
                  <option value="Family Doctor">Family Doctor / Neurologist</option>
                  <option value="Primary Caregiver">Primary Caregiver</option>
                  <option value="Secondary Guardian">Secondary Guardian (Son/Daughter)</option>
                  <option value="Nurse">Assigned Nurse</option>
                  <option value="Care Coordinator">Care Coordinator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Relationship / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Neurologist · GMCH Memory Clinic, Elder Son"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="caregiver@..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0E7C66] hover:bg-[#0A5C4C] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Connect to Circle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQROpen && currentPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl relative">
            <button
              onClick={() => setIsQROpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <PatientQRCodeCard
              patient={currentPatient}
              connectedCaregiverCount={connectedCaregivers.length}
              onInviteCaregiver={() => {
                setIsQROpen(false);
                setIsInviteOpen(true);
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
};
