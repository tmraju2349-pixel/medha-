import React, { useState, useEffect } from 'react';
import {
  Brain,
  Volume2,
  Bell,
  Wifi,
  WifiOff,
  Pill,
  Droplets,
  CheckCircle2,
  X,
  QrCode,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { t, hourGreetKey } from '../../services/i18n';
import { PatientQRModal } from '../common/PatientQRModal';
import { sendRealNotification } from '../../services/notificationService';

export const PatientHeader: React.FC = () => {
  const { db, updateSettings, speakText, addToast, currentPage, currentPatient } = useMedha();
  const [notifOpen, setNotifOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString(db.settings.lang === 'en' ? 'en-IN' : db.settings.lang, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, [db.settings.lang]);

  const patientFirstName = currentPatient?.name?.split(' ')[0] || db.book.profile.name?.split(' ')[0] || 'Friend';
  const greeting = `${t(hourGreetKey(), db.settings.lang)}, ${patientFirstName}`;

  const toggleOffline = () => {
    const nextOffline = !db.settings.offline;
    updateSettings({ offline: nextOffline });
    addToast(
      nextOffline ? 'Offline mode enabled — entries will queue' : 'Back online — ready to sync',
      nextOffline ? '📶' : '🟢'
    );
  };

  const handleReadPage = () => {
    const uncompletedTasks = db.tasks.filter((t) => !t.done).length;
    const waterLeft = Math.max(0, 8 - db.hydration.count);
    const summary = `${greeting}. Today you have ${uncompletedTasks} tasks remaining and ${waterLeft} glasses of water to drink.`;
    speakText(summary);
  };

  // Reminders list for the bell popup
  const pendingTasks = db.tasks.filter((t) => !t.done);
  const pendingMeds = db.meds.filter((m) => !m.taken);
  const notifCount = pendingTasks.length + pendingMeds.length + (db.hydration.count < 8 ? 1 : 0);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b" style={{ borderColor: 'var(--line)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <div
          className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg,#0E7C66,#0A5C4C)' }}
        >
          <Brain className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p id="hdrGreeting" className="font-display font-bold text-lg ink truncate leading-tight">
            {greeting}
          </p>
          <p id="hdrDate" className="text-xs muted truncate">
            {dateStr}
          </p>
        </div>

        {/* Offline / Online pill */}
        <button
          id="netPill"
          onClick={toggleOffline}
          className={`chip px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer select-none flex items-center gap-1.5 ${
            db.settings.offline
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
          }`}
          title="Toggle offline mode"
        >
          {db.settings.offline ? (
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span id="netLabel">{db.settings.offline ? 'Offline' : 'Online'}</span>
        </button>

        {/* Read page aloud button */}
        <button
          id="voiceHdrBtn"
          onClick={handleReadPage}
          className="w-10 h-10 rounded-xl bg-white border border-[#E5DEC9] flex items-center justify-center text-[#0A5C4C] hover:bg-[#FAF6EF] transition shadow-2xs cursor-pointer"
          aria-label="Read page aloud"
          title="Read aloud"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifBtn"
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5DEC9] flex items-center justify-center text-[#0A5C4C] hover:bg-[#FAF6EF] transition shadow-2xs cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          {notifCount > 0 && (
            <span
              id="notifBadge"
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center pointer-events-none shadow-xs"
              style={{ background: 'var(--danger)' }}
            >
              {notifCount}
            </span>
          )}

          {notifOpen && (
            <div
              id="notifPanel"
              className="absolute right-0 mt-2 w-80 card p-4 z-50 pop shadow-xl bg-white border-[#E5DEC9]"
            >
              <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: 'var(--line)' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Today's reminders</p>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div id="notifList" className="space-y-2 mt-2.5 max-h-72 overflow-auto">
                {pendingMeds.map((m, idx) => (
                  <div key={`med-${m.id}-${idx}`} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#FBEAE5] border border-rose-100">
                    <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <Pill className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold ink truncate">{m.name}</p>
                      <p className="text-[10px] muted">{m.time}</p>
                    </div>
                  </div>
                ))}
                {pendingTasks.map((t, idx) => (
                  <div key={`task-${t.id}-${idx}`} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#FFF6E4] border border-amber-100">
                    <span className="text-base">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold ink truncate">{t.title}</p>
                      <p className="text-[10px] muted">{t.time}</p>
                    </div>
                  </div>
                ))}
                {db.hydration.count < 8 && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#EDF6F2] border border-emerald-100">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Droplets className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-xs font-bold ink">
                      {8 - db.hydration.count} glasses of water remaining today
                    </p>
                  </div>
                )}
                {notifCount === 0 && (
                  <div className="text-center py-5 flex flex-col items-center gap-1.5 text-gray-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <p className="text-xs font-medium">All caught up for today! Keep smiling</p>
                  </div>
                )}
              </div>

              {/* Real-time OS Notification Trigger */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Real-Time OS Alerts
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await sendRealNotification('🔔 MEDHA System Notification', {
                      body: 'Real-time alert active: medication, safety fences, and circle updates will sound and notify your OS screen.',
                      chimeType: 'alert',
                      vibrate: true,
                    });
                    if (res.success) {
                      addToast('Real system notification dispatched to your device! 🔔', '✅');
                    } else {
                      addToast(res.reason || 'Check notification permissions in your browser.', 'ℹ️');
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0E7C66] hover:bg-[#0A5C4C] text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Bell className="w-3 h-3" />
                  <span>Test Alert</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Connect Caregiver QR Button */}
        <button
          onClick={() => setIsQRModalOpen(true)}
          className="h-10 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-[#0E7C66] flex items-center gap-1.5 font-bold text-xs transition shadow-2xs cursor-pointer"
          title="Show Pairing QR Code to Caregiver"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Connect Caregiver</span>
        </button>
      </div>

      {/* Patient Pairing QR Code Modal */}
      {currentPatient && (
        <PatientQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          patient={currentPatient}
        />
      )}
    </header>
  );
};
