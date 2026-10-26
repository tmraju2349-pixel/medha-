import React, { useState } from 'react';
import {
  Languages,
  Type,
  Volume2,
  Gauge,
  Pill,
  Droplets,
  ShieldCheck,
  Contrast,
  Bell,
  FileText,
  RotateCcw,
  Check,
  Radio,
  QrCode,
  Download,
  Heart,
  Sparkles,
  Bluetooth,
  BellRing,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { t } from '../../services/i18n';
import { DocsModal } from '../modals/DocsModal';
import {
  DBKEY,
  seedDB,
  createBlankDB,
  findRegisteredUser,
  getActiveUserKey,
  saveDB,
  isDemoAccount,
} from '../../services/storage';
import { PatientQRModal } from '../common/PatientQRModal';
import { EthicalTerminology } from '../../types/medha';
import { getPersonLabel, getEthicalTermName } from '../../utils/terminology';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendRealNotification,
  playNotificationChime,
  NotificationPermissionStatus,
} from '../../services/notificationService';
import {
  isBluetoothSupported,
  requestBluetoothDevicePermission,
  getSavedBluetoothDevice,
  clearSavedBluetoothDevice,
  BluetoothDeviceInfo,
} from '../../services/bluetoothService';

export const SettingsView: React.FC = () => {
  const { db, updateSettings, addToast, speakText, currentPatient, updateDb } = useMedha();
  const [docsOpen, setDocsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // Real Web Notification & Bluetooth state
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionStatus>(() => getNotificationPermission());
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDeviceInfo | null>(() => getSavedBluetoothDevice());
  const [isRequestingBluetooth, setIsRequestingBluetooth] = useState(false);
  const [bluetoothError, setBluetoothError] = useState<string>('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const handleLangChange = (newLang: 'en' | 'as' | 'bn' | 'hi') => {
    updateSettings({ lang: newLang });
    addToast('Language updated · ভাষা সলনি হ’ল', '🌐');
  };

  const handleSizeChange = (ts: 'sm' | 'md' | 'lg') => {
    updateSettings({ ts });
    const label = ts === 'sm' ? 'Small (14px)' : ts === 'md' ? 'Medium (16px)' : 'Large (19px)';
    addToast(`Text size changed to ${label}`, '🔤');
  };

  const handleRequestNotifPermission = async () => {
    const status = await requestNotificationPermission();
    setNotifPermission(status);
    if (status === 'granted') {
      addToast('System notifications enabled! Real alerts will now sound and appear.', '✅');
      await sendRealNotification('🔔 MEDHA Notifications Active', {
        body: 'Real-time medicine reminders, safe-zone alerts, and care circle updates will appear here.',
        tag: 'medha-welcome',
      });
    } else if (status === 'denied') {
      addToast('Notification permission was blocked in browser settings.', '⚠️');
    } else if (status === 'unsupported') {
      addToast('Notifications not supported in this browser.', '⚠️');
    }
  };

  const handleTestReminder = async () => {
    setIsSendingNotif(true);
    addToast('Memantine 10mg — time for your tablet!', '💊');
    speakText('Reminder. Time to take Memantine tablet.');
    playNotificationChime();

    // Send real OS/browser notification
    const res = await sendRealNotification('💊 MEDHA Medication Alert', {
      body: 'Time for Memantine 10mg tablet. Take with a glass of warm water.',
      tag: 'medha-medication-reminder',
      playChime: true,
    });

    setNotifPermission(getNotificationPermission());
    if (res.success) {
      addToast('Real system notification sent to your device! 🔔', '✅');
    } else if (res.reason) {
      addToast(`Notification status: ${res.reason}`, 'ℹ️');
    }
    setIsSendingNotif(false);
  };

  const handleRequestBluetoothPermission = async () => {
    setIsRequestingBluetooth(true);
    setBluetoothError('');
    addToast('Opening Bluetooth device permission prompt...', '📡');

    const result = await requestBluetoothDevicePermission();
    setIsRequestingBluetooth(false);

    if (result.success && result.device) {
      setBluetoothDevice(result.device);
      updateSettings({ bluetooth: true });
      addToast(`Bluetooth permission granted! Connected to ${result.device.name}`, '✅');
      sendRealNotification('📡 Bluetooth Device Connected', {
        body: `Paired with ${result.device.name} for offline care sync.`,
        tag: 'medha-bluetooth-sync',
      });
    } else {
      const err = result.error || 'Bluetooth request cancelled.';
      setBluetoothError(err);
      if (result.isIframeBlocked) {
        addToast('Bluetooth permission inside preview iframe requires opening in a new tab.', 'ℹ️');
      } else {
        addToast(err, '⚠️');
      }
    }
  };

  const handleDisconnectBluetooth = () => {
    clearSavedBluetoothDevice();
    setBluetoothDevice(null);
    setBluetoothError('');
    addToast('Bluetooth device disconnected.', 'ℹ️');
  };

  const handleResetData = () => {
    const activeUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : null;
    if (activeUser && !isDemoAccount(activeUser)) {
      if (window.confirm('Reset your registered account to a clean blank slate?')) {
        const targetKey = getActiveUserKey(activeUser);
        localStorage.removeItem(targetKey);
        const reg = findRegisteredUser(activeUser);
        const freshBlank = createBlankDB(
          reg?.username || activeUser,
          reg?.email || `${activeUser}@example.com`,
          reg?.role || 'patient'
        );
        saveDB(freshBlank, activeUser);
        updateDb(() => freshBlank);
        addToast('Your account was reset to a fresh clean state.', 'ℹ️');
      }
    } else {
      if (window.confirm('Reset demo test data to factory defaults?')) {
        localStorage.removeItem(DBKEY);
        updateDb(() => seedDB());
        addToast('Demo test data refreshed with complete sample data.', '✅');
      }
    }
  };

  return (
    <section id="page-settings" className="page active space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold ink">
          {t('settings', db.settings.lang)}
        </h2>
        <p className="text-xs text-muted mt-1">
          Customize display size, language, voice prompts, and safety alerts
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Left Card: Language, Text size, Voice, Speed */}
        <div className="card p-5 space-y-5 border-[#E5DEC9]">
          <div>
            <label htmlFor="setLang" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A5C4C] mb-2">
              <Languages className="w-4 h-4" />
              <span>Language / ভাষা</span>
            </label>
            <select
              id="setLang"
              value={db.settings.lang}
              onChange={(e) => handleLangChange(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl border-2 bg-white font-bold text-sm cursor-pointer shadow-2xs"
              style={{ borderColor: 'var(--line)' }}
            >
              <option value="en">English (India)</option>
              <option value="as">অসমীয়া (Assamese)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Ethical Identity & Dignity Naming */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="setEthicalTerm" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A5C4C]">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Respectful Reference / সম্বোধন</span>
              </label>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Ethical Design
              </span>
            </div>
            <select
              id="setEthicalTerm"
              value={db.settings.ethicalTerm || 'loved_one'}
              onChange={(e) => {
                const newTerm = e.target.value as EthicalTerminology;
                updateSettings({ ethicalTerm: newTerm });
                addToast(`Preferred reference updated to ${getEthicalTermName(newTerm, db.settings.lang)}`, '🤝');
              }}
              className="w-full px-4 py-3 rounded-xl border-2 bg-white font-bold text-sm cursor-pointer shadow-2xs focus:outline-[#0E7C66]"
              style={{ borderColor: 'var(--line)' }}
            >
              <option value="loved_one">Loved One (আপোনজন / परिजन) — Warm &amp; Relational</option>
              <option value="elder">Elder (জেষ্ঠজন / वरिष्ठ जन) — Respectful Senior</option>
              <option value="care_partner">Care Partner (যত্ন সংগী / देखभाल साथी) — Collaborative</option>
              <option value="name_only">First Name Only (কেৱল নাম — e.g. {currentPatient?.name?.split(' ')[0] || 'Biren'})</option>
              <option value="senior">Senior (প্ৰবীণ / बुजुर्ग)</option>
            </select>
            <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
              Replaces clinical terms like "Patient" throughout MEDHA with person-centered, dignity-affirming language.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A5C4C]">
                <Type className="w-4 h-4" />
                <span>Text size</span>
              </span>
              <span className="text-[11px] font-semibold text-muted">
                {db.settings.ts === 'sm' ? '14px' : db.settings.ts === 'md' ? '16px' : '19px (Senior)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2" id="sizeBtns">
              {(
                [
                  { id: 'sm', label: 'Small', px: '14px' },
                  { id: 'md', label: 'Medium', px: '16px' },
                  { id: 'lg', label: 'Large', px: '19px' },
                ] as const
              ).map((item) => {
                const isSelected = db.settings.ts === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSizeChange(item.id)}
                    className={`py-3 px-2 rounded-xl text-sm font-bold transition-all border cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-[#0E7C66] text-white border-[#0E7C66] shadow-sm'
                        : 'bg-white text-[#2B2320] border-[#ECE3D6] hover:bg-[#FAF6EF]'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span className={item.id === 'lg' ? 'text-base' : item.id === 'sm' ? 'text-xs' : 'text-sm'}>
                        {item.label}
                      </span>
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                      {item.px}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Live preview sentence */}
            <div className="mt-2.5 p-3 rounded-xl bg-[#FAF6EF] border border-[#ECE3D6] text-center">
              <p className="font-semibold text-ink leading-snug">
                "Small steps every day keep memories strong."
              </p>
              <p className="text-[11px] text-muted mt-1">Live font scaling active across all pages</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EDF6F2] text-[#0A5C4C] flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm ink">Voice assistance</p>
                <p className="text-xs muted">Reads greetings &amp; instructions aloud</p>
              </div>
            </div>
            <input
              id="setVoice"
              type="checkbox"
              checked={db.settings.voice}
              onChange={(e) => updateSettings({ voice: e.target.checked })}
              className="w-5 h-5 accent-[#0E7C66] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="flex items-center gap-1.5 font-bold text-sm ink">
                <Gauge className="w-4 h-4 text-[#8A7E72]" />
                <span>Speech speed</span>
              </span>
              <span id="rateVal" className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#FAF6EF] text-[#0A5C4C]">
                {db.settings.rate.toFixed(1)}×
              </span>
            </div>
            <input
              id="setRate"
              type="range"
              min="0.6"
              max="1.3"
              step="0.1"
              value={db.settings.rate}
              onChange={(e) => updateSettings({ rate: +e.target.value })}
              className="w-full accent-[#0E7C66] cursor-pointer"
            />
          </div>
        </div>

        {/* Right Card: Nudges, High contrast, Tools */}
        <div className="card p-5 space-y-5 border-[#E5DEC9]">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm ink">Medicine reminders</p>
                <p className="text-xs muted">Bell + voice nudges at scheduled hours</p>
              </div>
            </div>
            <input
              id="setNMed"
              type="checkbox"
              checked={db.settings.nMed}
              onChange={(e) => updateSettings({ nMed: e.target.checked })}
              className="w-5 h-5 accent-[#0E7C66] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm ink">Hydration nudges</p>
                <p className="text-xs muted">Prompts for drinking 8 glasses daily</p>
              </div>
            </div>
            <input
              id="setNHyd"
              type="checkbox"
              checked={db.settings.nHyd}
              onChange={(e) => updateSettings({ nHyd: e.target.checked })}
              className="w-5 h-5 accent-[#0E7C66] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm ink">Geo alerts</p>
                <p className="text-xs muted">Automatic safe-zone alert to caregiver</p>
              </div>
            </div>
            <input
              id="setNGeo"
              type="checkbox"
              checked={db.settings.nGeo}
              onChange={(e) => updateSettings({ nGeo: e.target.checked })}
              className="w-5 h-5 accent-[#0E7C66] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                <Contrast className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm ink">High contrast mode</p>
                <p className="text-xs muted">Deep black &amp; ultra-high contrast for visual clarity</p>
              </div>
            </div>
            <input
              id="setContrast"
              type="checkbox"
              checked={db.settings.contrast}
              onChange={(e) => updateSettings({ contrast: e.target.checked })}
              className="w-5 h-5 accent-[#0E7C66] cursor-pointer"
            />
          </div>

          {/* BLUETOOTH SECTION WITH DEDICATED PERMISSION BUTTON */}
          <div className="p-4 rounded-2xl border border-sky-100 bg-[#F4F9FD]/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${db.settings.bluetooth ? 'bg-[#EFF6FB] text-[#0284C7]' : 'bg-gray-100 text-gray-500'}`}>
                  <Bluetooth className={`w-4 h-4 ${db.settings.bluetooth ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <p className="font-bold text-sm ink flex items-center gap-2">
                    Bluetooth Caregiver Sync
                    {db.settings.bluetooth && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284C7]"></span>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Local sensor &amp; offline caregiver sync via Web Bluetooth</p>
                </div>
              </div>
              <input
                id="setBluetooth"
                type="checkbox"
                checked={!!db.settings.bluetooth}
                onChange={(e) => updateSettings({ bluetooth: e.target.checked })}
                className="w-5 h-5 accent-[#0E7C66] cursor-pointer"
              />
            </div>

            {/* Dedicated Bluetooth Permission Request Button */}
            <div className="pt-2 border-t border-sky-100 flex flex-col gap-2">
              <button
                type="button"
                id="requestBluetoothBtn"
                onClick={handleRequestBluetoothPermission}
                disabled={isRequestingBluetooth}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Bluetooth className={`w-4 h-4 ${isRequestingBluetooth ? 'animate-spin' : ''}`} />
                <span>
                  {isRequestingBluetooth
                    ? 'Requesting Bluetooth Permission...'
                    : bluetoothDevice
                    ? 'Scan / Re-pair Bluetooth Device'
                    : 'Request Bluetooth Permission & Pair'}
                </span>
              </button>

              {bluetoothDevice ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-sky-200 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">{bluetoothDevice.name}</span>
                      <span className="text-[10px] text-emerald-700 block">Bluetooth Linked &amp; Authorized</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectBluetooth}
                    className="text-[11px] font-semibold text-rose-600 hover:underline px-2 py-1"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 px-1">
                  <Radio className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>Click above to trigger the browser's hardware Bluetooth pairing prompt.</span>
                </div>
              )}

              {bluetoothError && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span>{bluetoothError}</span>
                    <span className="block text-[10px] text-amber-600 mt-0.5">
                      Tip: Web Bluetooth requires Chrome/Edge on desktop/Android. If viewed inside an iframe, open in a new tab.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* REAL SYSTEM NOTIFICATIONS SECTION */}
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm ink flex items-center gap-2">
                    Real System Notifications
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      notifPermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : notifPermission === 'denied'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {notifPermission === 'granted' ? 'Active ✅' : notifPermission === 'denied' ? 'Blocked ⚠️' : 'Permission Required 🔔'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">Native browser &amp; OS notifications for medicine and safe zone alerts</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-100/80 flex flex-col sm:flex-row gap-2">
              {notifPermission !== 'granted' && (
                <button
                  type="button"
                  id="enableNotifBtn"
                  onClick={handleRequestNotifPermission}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0E7C66] hover:bg-[#0A5C4C] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Allow Real System Notifications</span>
                </button>
              )}

              <button
                type="button"
                id="testRealNotifBtn"
                onClick={handleTestReminder}
                disabled={isSendingNotif}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-[#0E7C66] font-bold text-xs shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <BellRing className={`w-3.5 h-3.5 ${isSendingNotif ? 'animate-bounce' : ''}`} />
                <span>{isSendingNotif ? 'Sending Real Notification...' : 'Send Real Test Notification'}</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t space-y-2.5" style={{ borderColor: 'var(--line)' }}>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-300 text-sm font-bold text-[#0E7C66] hover:bg-emerald-100/70 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <QrCode className="w-4 h-4 text-[#0E7C66]" />
              <span>Connect Caregiver (Show QR Code)</span>
            </button>
            <button
              id="docsBtn"
              onClick={() => setDocsOpen(true)}
              className="btn-p w-full py-3 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Project README &amp; database docs</span>
            </button>
            <button
              id="resetBtn"
              onClick={handleResetData}
              className="w-full py-3 rounded-xl text-sm font-bold hover:bg-[#FBEAE5] transition flex items-center justify-center gap-2 cursor-pointer"
              style={{ color: 'var(--danger)', border: '1.5px solid var(--danger)' }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset demo data</span>
            </button>
          </div>
        </div>
      </div>

      <DocsModal isOpen={docsOpen} onClose={() => setDocsOpen(false)} />
      {currentPatient && (
        <PatientQRModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          patient={currentPatient}
        />
      )}
    </section>
  );
};
