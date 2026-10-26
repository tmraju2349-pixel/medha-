import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendRealNotification,
  NotificationPermissionStatus,
} from '../../services/notificationService';
import { useMedha } from '../../context/MedhaContext';

export const RealNotificationManager: React.FC = () => {
  const { addToast } = useMedha();
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
  const [isIframe, setIsIframe] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkStatus = useCallback(() => {
    if (!isNotificationSupported()) {
      setPermission('unsupported');
      return;
    }
    const current = getNotificationPermission();
    setPermission(current);

    const isInFrame = typeof window !== 'undefined' && window.self !== window.top;
    setIsIframe(isInFrame);

    // If permission is default and not previously dismissed in session, show the prompt
    if (current === 'default' && !sessionStorage.getItem('medha_notif_banner_dismissed')) {
      setShowPromptBanner(true);
    } else {
      setShowPromptBanner(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Re-check on window focus in case permissions were altered in browser settings
    window.addEventListener('focus', checkStatus);
    return () => window.removeEventListener('focus', checkStatus);
  }, [checkStatus]);

  const handleEnableNotifications = async () => {
    if (!isNotificationSupported()) {
      addToast('Notifications are not supported in this browser version.', '⚠️');
      return;
    }

    try {
      const res = await requestNotificationPermission();
      setPermission(res);

      if (res === 'granted') {
        setShowPromptBanner(false);
        addToast('Real-time notifications enabled on your system! 🔔', '✅');
        await sendRealNotification('🔔 Real-Time Notifications Active', {
          body: 'MEDHA will now alert your desktop/mobile for timely medication, safety boundaries, and emergency SOS.',
          chimeType: 'alert',
          tag: 'medha-system-active',
        });
      } else if (res === 'denied') {
        addToast('Notifications were blocked. Please click the padlock 🔒 in your browser URL bar to allow.', '⚠️');
      }
    } catch (err: any) {
      console.error('Notification permission error:', err);
      addToast('Could not request notification permission.', '⚠️');
    }
  };

  const handleSendTestNotification = async () => {
    setIsTesting(true);
    try {
      const res = await sendRealNotification('💊 MEDHA Live Medication Alert', {
        body: 'Time for Donepezil 5mg tablet. Take with warm water. (System notification verified)',
        chimeType: 'alert',
        tag: 'medha-test-alert',
        vibrate: true,
      });

      if (res.success) {
        addToast('Real-time OS notification delivered to your screen! 🔔', '✅');
      } else {
        addToast(`Notification note: ${res.reason || 'Check permissions'}`, 'ℹ️');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPromptBanner(false);
    setDismissed(true);
    sessionStorage.setItem('medha_notif_banner_dismissed', '1');
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  // If dismissed or unsupported or already granted, don't show the setup banner
  if (!showPromptBanner || dismissed || permission === 'unsupported') {
    return null;
  }

  return (
    <div
      id="realNotificationBanner"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[80] max-w-md w-[calc(100%-2rem)] animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-emerald-500/30 text-gray-800 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-gray-900">Enable Real System Notifications</h4>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Live OS
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Receive genuine desktop & mobile alerts with auditory chimes for medication times, perimeter safety breaches, and emergency SOS even if this tab is minimized.
            </p>

            {isIframe && (
              <div className="mt-2.5 p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between gap-2">
                <span>In embedded preview, browser security may restrict popups.</span>
                <button
                  onClick={openInNewTab}
                  className="font-bold underline text-amber-900 shrink-0 inline-flex items-center gap-1"
                >
                  <span>Open Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Allow Real Notifications</span>
              </button>

              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isTesting}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition border border-gray-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-3.5 h-3.5 text-gray-500" />
                <span>{isTesting ? 'Sending...' : 'Test Alert Chime'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
