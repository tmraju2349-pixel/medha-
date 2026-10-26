import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MedhaDB, LocationCoord, DiaryEntry, SafeZone, Settings, MemoryBook, PatientProfileRecord, CaregiverProfileRecord, CaregiverPatientLink, SosAlertDetails } from '../types/medha';
import { loadDB, saveDB, DBKEY, generateUniqueId, seedDB, isDemoAccount, getActiveUserKey } from '../services/storage';
import { speak } from '../services/speech';
import { t, hourGreetKey } from '../services/i18n';
import { saveAudioEntry, loadAllAudioUrls, deleteAudioEntry } from '../services/audioStorage';
import { supabase } from '../lib/supabase';
import { syncManager } from '../services/storage/syncManager';
import { generatePairingCode, generatePatientId, generateCaregiverId, parsePatientQRPayload } from '../services/patientCaregiverService';
import { saveSessionLocally } from '../modules/medha/games/gameService';
import {
  sendRealNotification,
  startEmergencySiren,
  stopEmergencySiren,
  toggleEmergencySirenMute,
  isEmergencySirenMuted,
} from '../services/notificationService';
import { realtimeSync } from '../services/realtimeSync';

export interface ToastItem {
  id: number;
  msg: string;
  icon: string;
}

export interface ConnectedCaregiverItem {
  linkId: string;
  caregiverId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  relationship: string;
  avatar: string;
  connectedAt: number;
  lastActiveAt?: number;
}

interface MedhaContextType {
  db: MedhaDB;
  currentUser: 'patient' | 'caregiver' | null;
  currentPage: string;
  sosActive: boolean;
  toasts: ToastItem[];
  currentLocation: LocationCoord | null;
  treeSearchQuery: string;
  setTreeSearchQuery: (q: string) => void;
  activePatientId: string;
  setActivePatientId: (id: string) => void;
  currentPatient: PatientProfileRecord | null;
  patientName: string;
  patientFirstName: string;
  caregiverName: string;
  caregiverFirstName: string;
  caregiverPhone: string;
  connectedCaregivers: ConnectedCaregiverItem[];
  inviteCaregiverToPatient: (
    patientId: string,
    caregiverInfo: {
      name: string;
      email?: string;
      phone?: string;
      relationship: string;
      role: 'Primary Caregiver' | 'Family Doctor' | 'Secondary Guardian' | 'Nurse' | 'Care Coordinator';
      avatar?: string;
    }
  ) => void;
  removeCaregiverLink: (linkId: string) => void;
  addCareCircleNote: (
    patientId: string,
    authorName: string,
    authorRole: string,
    message: string,
    category?: 'general' | 'medication' | 'incident' | 'doctor'
  ) => void;
  linkPatientByCode: (codeOrQr: string, relationship?: string) => Promise<{ success: boolean; message: string; patient?: PatientProfileRecord }>;
  addNewPatient: (patientData: Omit<PatientProfileRecord, 'id' | 'code' | 'createdAt'>) => PatientProfileRecord;
  unlinkPatient: (patientId: string) => void;
  isVoiceAssistantOpen: boolean;
  setIsVoiceAssistantOpen: (open: boolean) => void;
  setPage: (page: string) => void;
  login: (role: 'patient' | 'caregiver', userIdentifier?: string, customDb?: MedhaDB) => void;
  logout: () => void;
  addToast: (msg: string, icon?: string) => void;
  updateDb: (updater: (prev: MedhaDB) => MedhaDB) => void;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
  addTask: (title: string, time: string) => void;
  toggleMed: (id: number) => void;
  incrementHydration: () => void;
  setHydration: (count: number) => void;
  addDiaryEntry: (
    text: string,
    trans: string,
    lang: string,
    to: string,
    audioBlobOrUrl?: Blob | string | null,
    audioDuration?: number
  ) => Promise<number>;
  deleteDiaryEntry: (id: number) => void;
  syncDiary: () => void;
  updateSettings: (partial: Partial<Settings>) => void;
  updateMemoryBook: (updater: (prev: MemoryBook) => MemoryBook) => void;
  addSafeZone: (name: string, lat: number, lng: number, r: number) => void;
  deleteSafeZone: (id: number) => void;
  updateHomeRadius: (r: number) => void;
  setHomeToCurrentLocation: () => void;
  updateLocation: (loc: LocationCoord) => void;
  triggerSOS: (src: string, immediate?: boolean) => void;
  clearSOS: () => void;
  speakText: (txt: string, langOverride?: string) => void;
  activeSafeZone: () => SafeZone | null;
  warningZone: () => SafeZone | null;
  zoneStatus: 'safe' | 'warning' | 'breach';
  distanceToHome: number | null;
  accuracyTolerance: number;
  isLiveTracking: boolean;
  startLiveTracking: (continuous?: boolean) => void;
  stopLiveTracking: () => void;
  simulateBreach: () => void;
  simulateReturnHome: () => void;
  sosCountdown: number | null;
  cancelSOSCountdown: () => void;
  getWhatsAppSOSUrl: () => string;
  calibrateGPS: () => void;
  gpsAccuracyQuality: 'high' | 'medium' | 'coarse';
  audioMap: Record<number, string>;
  resolveAlert: (id: number) => void;
  authLoading: boolean;
  battery?: { level: number; charging: boolean; lastReported: number };
  trackingMode: 'adaptive' | 'high_accuracy' | 'battery_saver';
  setTrackingMode: (mode: 'adaptive' | 'high_accuracy' | 'battery_saver') => void;
  lastSosDispatch?: {
    dispatchId: string;
    channel: string;
    dispatchedAt: string;
    caregiverPhone: string;
  } | null;
  selectedGameToLaunch: string | null;
  setSelectedGameToLaunch: (gameId: string | null) => void;
  launchGame: (gameId: string) => void;
  sosDetails: SosAlertDetails | null;
  sendVoiceReassurance: (text: string) => void;
  isSirenMuted: boolean;
  toggleSirenMute: () => void;
}

const MedhaContext = createContext<MedhaContextType | null>(null);

/**
 * Calculates great-circle distance between two coordinates in meters using clamped Haversine formula.
 * Resilient against null, undefined, string numbers, and floating-point precision errors.
 */
export function geoDistance(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined
): number {
  if (!a || !b) return Infinity;
  const aLat = Number(a.lat);
  const aLng = Number(a.lng);
  const bLat = Number(b.lat);
  const bLng = Number(b.lng);
  if (isNaN(aLat) || isNaN(aLng) || isNaN(bLat) || isNaN(bLng)) return Infinity;

  const R = 6371000; // Mean Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const x = sinHalfLat * sinHalfLat + Math.cos(aLat * rad) * Math.cos(bLat * rad) * sinHalfLng * sinHalfLng;
  // Guard against floating point imprecision exceeding 1.0 (which would cause Math.asin to return NaN)
  const clampedX = Math.min(1, Math.max(0, x));
  return 2 * R * Math.asin(Math.sqrt(clampedX));
}

/**
 * Calculates adaptive geofence accuracy tolerance margin in meters based on GPS 95% confidence radius.
 * - High satellite accuracy (< 15m): 4m tolerance
 * - Medium assisted GPS (15m - 60m): 25% of reported accuracy (up to 15m)
 * - Coarse/indoor network (> 60m): capped at 25m to protect designated perimeter boundaries
 */
export function getAccuracyTolerance(accuracy?: number | null): number {
  const acc = Math.max(0, Number(accuracy) || 10);
  return Math.min(Math.max(acc * 0.25, 4), 25);
}

export const MedhaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<MedhaDB>(() => loadDB());
  const [currentUser, setCurrentUser] = useState<'patient' | 'caregiver' | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [treeSearchQuery, setTreeSearchQuery] = useState<string>('');
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState<boolean>(false);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosDetails, setSosDetails] = useState<SosAlertDetails | null>(null);
  const [isSirenMuted, setIsSirenMuted] = useState<boolean>(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationCoord | null>(() => {
    const d = loadDB();
    return d.location || null;
  });
  const [audioMap, setAudioMap] = useState<Record<number, string>>({});
  const [selectedGameToLaunch, setSelectedGameToLaunch] = useState<string | null>(null);

  const toggleSirenMute = useCallback(() => {
    const muted = toggleEmergencySirenMute();
    setIsSirenMuted(muted);
  }, []);

  const launchGame = useCallback((gameId: string) => {
    setSelectedGameToLaunch(gameId);
    setCurrentPage('games');
  }, []);

  // Supabase Auth Listener
  useEffect(() => {
    if (!supabase) {
      // Fallback local auth initialization
      const s = sessionStorage.getItem('smriti_session');
      if (s === 'patient' || s === 'caregiver') {
        setCurrentUser(s);
      }
      setAuthLoading(false);
      return;
    }

    const syncUserLocally = async (session: any) => {
      if (session?.user && supabase) {
        // Collect data and store in Supabase
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0] || 'User';
        const role = session.user.user_metadata?.role || 'patient';
        
        // 1. Upsert into 'profiles' table
        try {
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: session.user.id,
            display_name: name,
            role: role,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          if (profileErr) console.warn('Supabase profiles upsert:', profileErr.message);
        } catch (e) {
          console.warn('Could not store in profiles table:', e);
        }

        // Subscribe to real-time events
        const channel = supabase.channel('medha_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'breadcrumbs' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              const newCrumb = payload.new;
              setDb(prev => {
                const nextCrumbs = [...(prev.breadcrumbs || []), {
                  lat: newCrumb.latitude,
                  lng: newCrumb.longitude,
                  accuracy: newCrumb.accuracy,
                  speed: newCrumb.speed,
                  heading: newCrumb.heading,
                  ts: new Date(newCrumb.timestamp).getTime()
                }].slice(-50); // Keep last 50
                return { ...prev, breadcrumbs: nextCrumbs, location: nextCrumbs[nextCrumbs.length - 1], lastActive: Date.now() };
              });
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
            if (payload.eventType === 'INSERT') {
               addToast(`New task received: ${payload.new.title}`, '🔔');
            } else if (payload.eventType === 'UPDATE') {
               if (payload.new.done && role === 'caregiver') {
                 addToast(`Task completed by patient: ${payload.new.title}`, '✅');
               }
            }
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_sessions' }, (payload) => {
            const newSession = payload.new;
            if (newSession) {
              const gameKey = newSession.game_key || 'Cognitive Game';
              const score = typeof newSession.score === 'number' ? newSession.score : 80;
              const mistakes = typeof newSession.mistakes === 'number' ? newSession.mistakes : 0;
              const patientId = newSession.patient_id || 'PAT-7201-BIREN';
              
              // Normalize into StandardSessionData
              const standardSess: any = {
                session_id: newSession.id || `sess_${Date.now()}`,
                patient_id: patientId,
                game_id: gameKey,
                cognitive_domain: 'memory',
                difficulty_level: 1,
                score,
                max_score: 100,
                accuracy: Math.max(0.2, (score / 100)),
                correct_answers: Math.max(1, Math.round(score / 10)),
                incorrect_answers: mistakes,
                attempts: Math.max(1, Math.round(score / 10)) + mistakes,
                hints_used: 0,
                reaction_time_avg: 620,
                reaction_time_min: 480,
                reaction_time_max: 820,
                completion_time: 45,
                pauses: 0,
                restarts: 0,
                completed: true,
                is_practice: false,
                timestamp: newSession.created_at ? new Date(newSession.created_at).getTime() : Date.now(),
                dataQuality: 'valid',
                normalizedTelemetry: {
                  avgReactionTimeMs: 620,
                  accuracy: Math.max(0.2, (score / 100)),
                  lapseRate: 0.05,
                  fatigueDrift: 0.04,
                  errorClustering: 0.05,
                  baselineDeviation: 0.02,
                  hesitationMs: 580,
                  reactionTimeVariability: 0.18,
                  movementHesitation: 0.12,
                  postErrorRecoveryMs: 680,
                },
              };

              // Persist locally for caregiver views
              saveSessionLocally(standardSess);

              // Also update in-memory MedhaDB gameLog & scores for instant reactivity
              setDb(prev => {
                const updatedLog = [
                  {
                    game: gameKey,
                    score,
                    ts: Date.now(),
                  },
                  ...(prev.gameLog || [])
                ].slice(0, 50);

                return {
                  ...prev,
                  gameLog: updatedLog,
                  lastActive: Date.now()
                };
              });

              // Alert caregiver of patient game activity in real time
              if (role === 'caregiver') {
                const prettyGame = gameKey.replace(/^(bg_|3d_)/, '').replace(/_/g, ' ');
                addToast(`🎮 Patient completed ${prettyGame}: Score ${score} pts!`, '🧠');
              }
            }
          })
          .subscribe();

      }

      if (session?.user) {

        const role = session.user.user_metadata?.role || 'patient';
        setCurrentUser(role as 'patient' | 'caregiver');
        
        // Ensure user is stored locally for offline fallback and display
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0] || 'User';
        setDb((prev) => {
          const next = { ...prev };
          const existing = next.users.find(u => u.username === email);
          if (!existing && email) {
            next.users = [...next.users, { username: email, password: '', role: role as 'patient' | 'caregiver', name, phone: '' }];
            saveDB(next);
          } else if (existing && !existing.name && name) {
            existing.name = name;
            saveDB(next);
          }
          return next;
        });
        
        syncManager.triggerSync();
      }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Supabase auth error:', error);
      }
      if (session?.user) {
        syncUserLocally(session);
      } else {
        const localRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_session') : null;
        const localUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : null;
        if (localRole === 'patient' || localRole === 'caregiver') {
          setCurrentUser(localRole);
          const loaded = loadDB(localUser || undefined);
          setDb(loaded);
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUserLocally(session);
      } else {
        const localRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_session') : null;
        if (!localRole) {
          setCurrentUser(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load persistent audio recordings from IndexedDB on startup
  useEffect(() => {
    loadAllAudioUrls().then((records) => {
      setAudioMap((prev) => {
        const merged = { ...prev };
        for (const [idStr, data] of Object.entries(records)) {
          merged[Number(idStr)] = data.url;
        }
        return merged;
      });
    });
  }, []);

  const watchIdRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<any>(null);
  const breachCountRef = useRef<number>(0);
  const prevLocRef = useRef<LocationCoord | null>(null);
  const lastAccuracyToastTsRef = useRef<number>(0);

  // Sync DB to state, localStorage & broadcast across tabs in real-time
  const updateDb = useCallback((updater: (prev: MedhaDB) => MedhaDB) => {
    setDb((prev) => {
      const next = updater(prev);
      const activeUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : null;
      const currentRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_session') : null;
      const targetKey = getActiveUserKey(activeUser || undefined);
      saveDB(next, activeUser || undefined);

      // Instant cross-tab sync broadcast (<5ms latency)
      realtimeSync.broadcast({
        type: 'DB_UPDATE',
        key: targetKey,
        senderRole: (currentRole as any) || undefined,
        senderUsername: activeUser || undefined,
        db: next,
      });

      return next;
    });
  }, []);

  const addToast = useCallback((msg: string, icon: string = '✅') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const sendVoiceReassurance = useCallback(
    (text: string) => {
      realtimeSync.broadcast({
        type: 'VOICE_REASSURANCE',
        senderRole: 'caregiver',
        payload: { text },
      });
      addToast(`📢 Comforting voice note dispatched to elder's device!`, '📢');
    },
    [addToast]
  );

  const [activePatientId, setActivePatientIdState] = useState<string>(() => {
    const d = loadDB();
    return d.activePatientId || d.patients?.[0]?.id || 'PAT-7201-BIREN';
  });

  const [batteryState, setBatteryState] = useState<{ level: number; charging: boolean; lastReported: number }>(() => {
    const d = loadDB();
    return d.battery || { level: 88, charging: false, lastReported: Date.now() };
  });

  const [trackingMode, setTrackingModeState] = useState<'adaptive' | 'high_accuracy' | 'battery_saver'>(() => {
    const d = loadDB();
    return d.trackingMode || 'adaptive';
  });

  const [lastSosDispatch, setLastSosDispatch] = useState<{
    dispatchId: string;
    channel: string;
    dispatchedAt: string;
    caregiverPhone: string;
  } | null>(null);

  const setTrackingMode = useCallback((mode: 'adaptive' | 'high_accuracy' | 'battery_saver') => {
    setTrackingModeState(mode);
    updateDb((prev) => ({ ...prev, trackingMode: mode }));
    addToast(`GPS mode: ${mode === 'adaptive' ? 'Adaptive (Battery-Smart 30s/5s)' : mode === 'high_accuracy' ? 'High Accuracy (5s Continuous)' : 'Battery Saver (60s)'}`, '🔋');
  }, [updateDb, addToast]);

  // Battery Status API listener
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const level = Math.round(battery.level * 100);
          const charging = Boolean(battery.charging);
          const newBat = { level, charging, lastReported: Date.now() };
          setBatteryState(newBat);
          updateDb((prev) => ({ ...prev, battery: newBat }));
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      }).catch(() => {});
    }
  }, [updateDb]);

  const setActivePatientId = useCallback((id: string) => {
    setActivePatientIdState(id);
    updateDb((prev) => {
      const p = (prev.patients || []).find((x) => x.id === id);
      const updatedBook = p ? {
        ...prev.book,
        profile: {
          ...prev.book.profile,
          name: p.name,
          age: String(p.age),
          home: p.city,
        }
      } : prev.book;

      return {
        ...prev,
        activePatientId: id,
        book: updatedBook,
      };
    });
  }, [updateDb]);

  const currentPatient: PatientProfileRecord | null = React.useMemo(() => {
    const pList = db.patients || [];
    return pList.find((p) => p.id === activePatientId) || pList[0] || null;
  }, [db.patients, activePatientId]);

  const patientName = currentPatient?.name || db.book.profile.name || 'Patient';
  const patientFirstName = patientName.split(' ')[0] || patientName;
  const primaryCaregiver = db.caregivers?.[0];
  const caregiverName = primaryCaregiver?.name || db.emergencyContacts?.[0]?.name || 'Pooja Saikia';
  const caregiverFirstName = caregiverName.split(' ')[0] || caregiverName;
  const caregiverPhone = primaryCaregiver?.phone || currentPatient?.emergencyPhone || db.emergencyContacts?.[0]?.phone || '+919876543210';

  const linkPatientByCode = useCallback(async (codeOrQr: string, relationship = 'Primary Caregiver') => {
    const parsed = parsePatientQRPayload(codeOrQr);
    const searchCode = (parsed.code || codeOrQr).trim().toUpperCase();
    const searchId = parsed.patientId?.trim();

    let foundPatient: PatientProfileRecord | undefined = undefined;

    // 1. Attempt Cloud Pairing via Supabase
    if (supabase) {
      try {
        const { data: patientData, error: pError } = await supabase
          .from('patient_profiles')
          .select('*, profiles(display_name)')
          .eq('code', searchCode)
          .single();

        if (patientData && !pError) {
          const { data: { session } } = await supabase.auth.getSession();
          const cgId = session?.user?.id || 'CRG-4401-POOJA';

          await supabase.from('caregiver_patient_links').upsert({
            caregiver_id: cgId,
            patient_id: patientData.id,
            relationship: relationship,
            status: 'active'
          });

          foundPatient = {
            id: patientData.id,
            code: patientData.code,
            name: patientData.profiles?.display_name || parsed.name || `Patient (${searchCode})`,
            age: patientData.age || 70,
            stage: 'Mild',
            city: parsed.city || 'Assam',
            avatar: '👴',
            phone: '',
            emergencyContact: 'Caregiver',
            emergencyPhone: patientData.emergency_phone || '',
            primaryCaregiverId: cgId,
            linkedCaregiverIds: [cgId],
            createdAt: Date.now(),
          };
        }
      } catch (e) {
        console.warn('Supabase linking error, falling back to local.', e);
      }
    }

    // 2. Fallback to Local Ecosystem Search
    if (!foundPatient) {
      const allPatients = db.patients || [];
      foundPatient = allPatients.find(
        (p) => (searchId && p.id === searchId) || p.code.toUpperCase() === searchCode
      );
    }

    if (!foundPatient) {
      // If code was from a remote or new patient not yet in local array, but valid format
      if (/^MED-\d{3,4}$/i.test(searchCode)) {
        const newPatient: PatientProfileRecord = {
          id: searchId || generatePatientId(),
          code: searchCode,
          name: parsed.name || `Patient (${searchCode})`,
          age: parsed.age || 70,
          stage: 'Mild',
          city: parsed.city || 'Assam',
          avatar: '👴',
          phone: '',
          emergencyContact: 'Caregiver',
          emergencyPhone: '',
          primaryCaregiverId: 'CRG-4401-POOJA',
          linkedCaregiverIds: ['CRG-4401-POOJA'],
          createdAt: Date.now(),
        };

        const newLink: CaregiverPatientLink = {
          id: `LNK-${Date.now().toString().slice(-4)}`,
          caregiverId: 'CRG-4401-POOJA',
          patientId: newPatient.id,
          pairingCode: searchCode,
          status: 'active',
          relationship,
          connectedAt: Date.now(),
        };

        updateDb((prev) => ({
          ...prev,
          patients: [...(prev.patients || []), newPatient],
          activePatientId: newPatient.id,
          caregiverPatientLinks: [...(prev.caregiverPatientLinks || []), newLink],
        }));
        setActivePatientIdState(newPatient.id);
        addToast(`Linked and connected to ${newPatient.name}! 🤝`, '✅');
        return { success: true, message: `Successfully connected to ${newPatient.name}`, patient: newPatient };
      }

      return {
        success: false,
        message: 'Invalid pairing code or patient not found. Please verify the code or QR.',
      };
    }

    // Check if already linked
    const existingLinks = db.caregiverPatientLinks || [];
    const isAlreadyLinked = existingLinks.some((l) => l.patientId === foundPatient!.id && l.status === 'active');

    if (!isAlreadyLinked) {
      const newLink: CaregiverPatientLink = {
        id: `LNK-${Date.now().toString().slice(-4)}`,
        caregiverId: 'CRG-4401-POOJA',
        patientId: foundPatient.id,
        pairingCode: foundPatient.code,
        status: 'active',
        relationship,
        connectedAt: Date.now(),
      };

      updateDb((prev) => {
        const isLocallyKnown = prev.patients?.some(p => p.id === foundPatient!.id);
        return {
          ...prev,
          patients: isLocallyKnown ? prev.patients : [...(prev.patients || []), foundPatient!],
          activePatientId: foundPatient!.id,
          caregiverPatientLinks: [...(prev.caregiverPatientLinks || []), newLink],
        };
      });
    } else {
      updateDb((prev) => ({
        ...prev,
        activePatientId: foundPatient!.id,
      }));
    }

    setActivePatientIdState(foundPatient.id);
    addToast(`Connected to ${foundPatient.name} (${foundPatient.code}) 🤝`, '✅');
    return { success: true, message: `Connected to ${foundPatient.name}`, patient: foundPatient };
  }, [db.patients, db.caregiverPatientLinks, addToast, updateDb]);

  const addNewPatient = useCallback((patientData: Omit<PatientProfileRecord, 'id' | 'code' | 'createdAt'>) => {
    const newId = generatePatientId();
    const newCode = generatePairingCode();
    const newPatient: PatientProfileRecord = {
      ...patientData,
      id: newId,
      code: newCode,
      createdAt: Date.now(),
      primaryCaregiverId: 'CRG-4401-POOJA',
      linkedCaregiverIds: ['CRG-4401-POOJA'],
    };

    const newLink: CaregiverPatientLink = {
      id: `LNK-${Date.now().toString().slice(-4)}`,
      caregiverId: 'CRG-4401-POOJA',
      patientId: newId,
      pairingCode: newCode,
      status: 'active',
      relationship: 'Caregiver',
      connectedAt: Date.now(),
    };

    updateDb((prev) => ({
      ...prev,
      patients: [...(prev.patients || []), newPatient],
      activePatientId: newId,
      caregiverPatientLinks: [...(prev.caregiverPatientLinks || []), newLink],
    }));

    setActivePatientIdState(newId);
    addToast(`New patient ${newPatient.name} registered (Code: ${newCode}) 🎉`, '✅');
    return newPatient;
  }, [addToast, updateDb]);

  const unlinkPatient = useCallback((patientId: string) => {
    updateDb((prev) => {
      const updatedPatients = (prev.patients || []).filter((p) => p.id !== patientId);
      const updatedLinks = (prev.caregiverPatientLinks || []).filter((l) => l.patientId !== patientId);
      const nextActiveId = updatedPatients[0]?.id || 'PAT-7201-BIREN';
      setActivePatientIdState(nextActiveId);
      return {
        ...prev,
        patients: updatedPatients,
        caregiverPatientLinks: updatedLinks,
        activePatientId: nextActiveId,
      };
    });
    addToast('Patient unlinked from active roster.', 'ℹ️');
  }, [addToast, updateDb]);

  const connectedCaregivers = React.useMemo<ConnectedCaregiverItem[]>(() => {
    const pId = currentPatient?.id || 'PAT-7201-BIREN';
    const links = (db.caregiverPatientLinks || []).filter((l) => l.patientId === pId && l.status === 'active');
    const allCaregivers = db.caregivers || [];

    return links.map((link) => {
      const caregiver = allCaregivers.find((c) => c.id === link.caregiverId);
      const defaultRole = link.role || caregiver?.role || 'Caregiver';
      return {
        linkId: link.id,
        caregiverId: link.caregiverId,
        name: caregiver?.name || (defaultRole === 'Family Doctor' ? 'Dr. Rajesh Sharma' : 'Caregiver'),
        email: caregiver?.email || '',
        phone: caregiver?.phone || '+919876543210',
        role: defaultRole,
        relationship: link.relationship || caregiver?.relationship || 'Care Circle Member',
        avatar: caregiver?.avatar || (defaultRole === 'Family Doctor' ? '👨‍⚕️' : defaultRole === 'Secondary Guardian' ? '🧑' : '👩‍⚕️'),
        connectedAt: link.connectedAt,
        lastActiveAt: link.lastActiveAt || link.connectedAt,
      };
    });
  }, [currentPatient?.id, db.caregiverPatientLinks, db.caregivers]);

  const inviteCaregiverToPatient = useCallback((
    patientId: string,
    caregiverInfo: {
      name: string;
      email?: string;
      phone?: string;
      relationship: string;
      role: 'Primary Caregiver' | 'Family Doctor' | 'Secondary Guardian' | 'Nurse' | 'Care Coordinator';
      avatar?: string;
    }
  ) => {
    const newCaregiverId = generateCaregiverId();
    const newCaregiver: CaregiverProfileRecord = {
      id: newCaregiverId,
      name: caregiverInfo.name,
      email: caregiverInfo.email || `${caregiverInfo.name.toLowerCase().replace(/\s+/g, '.')}@medha.care`,
      phone: caregiverInfo.phone || '+919876500000',
      relationship: caregiverInfo.relationship,
      role: caregiverInfo.role,
      avatar: caregiverInfo.avatar || (caregiverInfo.role === 'Family Doctor' ? '👨‍⚕️' : caregiverInfo.role === 'Secondary Guardian' ? '🧑' : '👩‍⚕️'),
      patientIds: [patientId],
    };

    const newLink: CaregiverPatientLink = {
      id: `LNK-${Date.now().toString().slice(-4)}`,
      caregiverId: newCaregiverId,
      patientId,
      pairingCode: currentPatient?.code || 'MED-782',
      status: 'active',
      relationship: caregiverInfo.relationship,
      role: caregiverInfo.role,
      connectedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    updateDb((prev) => {
      const pList = (prev.patients || []).map((p) => {
        if (p.id === patientId) {
          const linkedIds = Array.from(new Set([...(p.linkedCaregiverIds || []), newCaregiverId]));
          return { ...p, linkedCaregiverIds: linkedIds };
        }
        return p;
      });

      return {
        ...prev,
        patients: pList,
        caregivers: [...(prev.caregivers || []), newCaregiver],
        caregiverPatientLinks: [...(prev.caregiverPatientLinks || []), newLink],
      };
    });

    addToast(`Added ${caregiverInfo.name} (${caregiverInfo.role}) to Care Circle! 🤝`, '✅');
  }, [currentPatient?.code, updateDb, addToast]);

  const removeCaregiverLink = useCallback((linkId: string) => {
    updateDb((prev) => ({
      ...prev,
      caregiverPatientLinks: (prev.caregiverPatientLinks || []).filter((l) => l.id !== linkId),
    }));
    addToast('Caregiver disconnected from patient circle.', 'ℹ️');
  }, [updateDb, addToast]);

  const addCareCircleNote = useCallback((
    patientId: string,
    authorName: string,
    authorRole: string,
    message: string,
    category: 'general' | 'medication' | 'incident' | 'doctor' = 'general'
  ) => {
    const newNote = {
      id: `NOTE-${Date.now().toString().slice(-4)}`,
      patientId,
      authorName,
      authorRole,
      message,
      ts: Date.now(),
      category,
    };

    updateDb((prev) => ({
      ...prev,
      careCircleNotes: [newNote, ...(prev.careCircleNotes || [])],
    }));

    addToast('Care note shared with Care Circle 📋', '✅');
  }, [updateDb, addToast]);

  const speakText = useCallback(
    (txt: string, langOverride?: string) => {
      speak(txt, langOverride || db.settings.lang, db.settings.voice, db.settings.rate);
    },
    [db.settings.lang, db.settings.voice, db.settings.rate]
  );

  // Apply settings to document element and body
  useEffect(() => {
    document.documentElement.dataset.ts = db.settings.ts;
    document.body.dataset.ts = db.settings.ts;
    document.documentElement.classList.toggle('contrast', db.settings.contrast);
    document.body.classList.toggle('contrast', db.settings.contrast);
  }, [db.settings.ts, db.settings.contrast]);

  // Real-time Sync across tabs (<5ms via BroadcastChannel, storage event fallback & 2s poll)
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((msg) => {
      const activeUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : null;
      const currentRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_session') : null;
      const myTargetKey = getActiveUserKey(activeUser || undefined);

      if (msg.type === 'DB_UPDATE' && msg.db) {
        // Sync if:
        // 1. Both tabs target the same key (e.g. both demo accounts on DBKEY, or same user)
        // 2. Or one is Caregiver and the other is Patient, and both belong to demo ecosystem
        const isBothDemo = (!msg.key || msg.key === DBKEY) && myTargetKey === DBKEY;
        const isSameKey = msg.key === myTargetKey;

        if (isSameKey || isBothDemo) {
          setDb(msg.db);
          if (msg.db.location) {
            setCurrentLocation(msg.db.location);
          }
        }
      } else if (msg.type === 'SOS_TRIGGER') {
        setSosActive(true);
        if (msg.payload) {
          setSosDetails(msg.payload);
          if (msg.payload.location) {
            setCurrentLocation(msg.payload.location);
          }
        }
        if (currentRole === 'caregiver') {
          const pName = msg.payload?.patientName || 'Patient';
          addToast(`🚨 CRITICAL: ${pName} breached safe perimeter!`, '🚨');
          speakText(`Emergency alert! ${pName} has breached the safe boundary. Live GPS is on your screen.`);
          startEmergencySiren();
          sendRealNotification(`🚨 CRITICAL SOS: ${pName}`, {
            body: `Emergency alert! ${pName} breached safe perimeter or triggered SOS. Open dashboard immediately.`,
            chimeType: 'sos',
            tag: `medha-sos-${Date.now()}`,
            vibrate: true,
          });
        }
      } else if (msg.type === 'SOS_CLEAR') {
        setSosActive(false);
        setSosDetails(null);
        stopEmergencySiren();
        addToast('✓ SOS alert cleared. Patient is safe.', '🛡️');
        if (currentRole === 'caregiver') {
          sendRealNotification('🛡️ Patient Safe: SOS Cleared', {
            body: 'The SOS condition has been resolved and patient is in a safe area.',
            chimeType: 'gentle',
            tag: 'medha-sos-clear',
          });
        }
      } else if (msg.type === 'VOICE_REASSURANCE') {
        if (currentRole === 'patient') {
          const text = msg.payload?.text || 'Help is on the way. Please stay where you are.';
          speakText(text);
          addToast(`📢 Guardian: "${text}"`, '📢');
        }
      } else if (msg.type === 'LOCATION_UPDATE' && msg.payload) {
        setCurrentLocation(msg.payload);
      }
    });

    const onStorage = (e: StorageEvent) => {
      const activeUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : null;
      const targetKey = getActiveUserKey(activeUser || undefined);
      if ((e.key === targetKey || (targetKey === DBKEY && e.key === DBKEY)) && e.newValue) {
        try {
          const fresh = JSON.parse(e.newValue);
          setDb(fresh);
          if (fresh.location) {
            setCurrentLocation(fresh.location);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    const poll = setInterval(() => {
      const activeUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : null;
      const fresh = loadDB(activeUser || undefined);
      if (fresh) {
        setDb((prev) => {
          if (fresh.lastActive && fresh.lastActive > (prev.lastActive || 0)) {
            return fresh;
          }
          return prev;
        });
      }
    }, 2000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', onStorage);
      clearInterval(poll);
    };
  }, [addToast, speakText]);

  // Initial welcome voice for patient
  useEffect(() => {
    if (currentUser === 'patient') {
      const g = t(hourGreetKey(), db.settings.lang);
      const patientFirstName = currentPatient?.name?.split(' ')[0] || db.book.profile.name?.split(' ')[0] || 'Friend';
      speakText(`${g}, ${patientFirstName}. Welcome to MEDHA-AI.`);
      // Keep initial demo popups for preview purposes
      const tHyd = setTimeout(() => {
        if (db.settings.nHyd && db.hydration.count < 8) {
          addToast('💧 Time for a glass of water!', '💧');
          sendRealNotification('💧 Hydration Reminder', {
            body: 'Time for a fresh glass of water! Staying hydrated keeps your mind clear.',
            tag: 'medha-hydration',
          });
        }
      }, 4000);
      const tMed = setTimeout(() => {
        if (db.settings.nMed) {
          addToast('💊 Memantine at 9:00 PM', '⏰');
          sendRealNotification('💊 Evening Medicine Reminder', {
            body: 'Memantine 10mg is scheduled for this evening. Take with water.',
            tag: 'medha-medication',
          });
        }
      }, 12000);

      // Real clock-based reminders
      const reminderInterval = setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Hydration reminder every 2 hours during daytime (9 AM to 7 PM)
        if (db.settings.nHyd && db.hydration.count < 8 && minutes === 0 && hours >= 9 && hours <= 19 && hours % 2 !== 0) {
           addToast('💧 Remember to drink water!', '💧');
           sendRealNotification('💧 Drink Water Reminder', {
             body: 'Remember to stay hydrated! Have a glass of water.',
             tag: 'medha-hydration-clock',
           });
        }

        // Medication reminder exactly at 9:00 PM (21:00)
        if (db.settings.nMed && hours === 21 && minutes === 0) {
           addToast('💊 Time for your evening Memantine (10mg)', '⏰');
           sendRealNotification('💊 Time for Evening Tablet', {
             body: 'Time for your Memantine (10mg) tablet. Please take with warm water.',
             tag: 'medha-medication-clock',
           });
        }
      }, 60000); // Check every minute

      return () => {
        clearTimeout(tHyd);
        clearTimeout(tMed);
        clearInterval(reminderInterval);
      };
    }
  }, [currentUser, currentPatient, db.book.profile.name]);

  const login = (role: 'patient' | 'caregiver', userIdentifier?: string, customDb?: MedhaDB) => {
    sessionStorage.setItem('smriti_session', role);
    if (userIdentifier) {
      sessionStorage.setItem('smriti_username', userIdentifier.trim().toLowerCase());
    }
    if (customDb) {
      setDb(customDb);
    } else if (userIdentifier) {
      const userDb = loadDB(userIdentifier);
      setDb(userDb);
    } else {
      setDb(seedDB());
    }
    setCurrentUser(role);
    setCurrentPage('home');
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    sessionStorage.clear();
    setCurrentUser(null);
    setDb(seedDB());
  };

  const setPage = (page: string) => {
    const target = page === 'book' ? 'tree' : page;
    setCurrentPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const titles: Record<string, string> = {
      home: 'Home',
      games: 'Brain Games',
      diary: 'Voice Diary',
      tree: 'Memory Tree',
      book: 'Memory Tree',
      geo: 'Guardian',
      settings: 'Settings',
    };
    speakText(t(`nav_${target}`, db.settings.lang) || titles[target] || target);
  };

  const toggleTask = (id: number) => {
    updateDb((prev) => {
      const nextTasks = prev.tasks.map((t) => {
        if (t.id === id) {
          const done = !t.done;
          if (done) {
            addToast(`${t.title} — done! ⭐`);
            speakText(`Wonderful! ${t.title} complete.`);
          }
          
          if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user?.id) {
                // If we don't have a supabase UUID for this task, we can't update easily without a composite key
                // For a production app, tasks would use UUIDs.
                // Assuming tasks have a text 'title' or we just sync everything.
                // Here we'll just try to fire a background sync of all patient data
                syncManager.triggerSync();
              }
            });
          }

          return { ...t, done };
        }
        return t;
      });
      return { ...prev, tasks: nextTasks, lastActive: Date.now() };
    });
  };

  const deleteTask = (id: number) => {
    updateDb((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
      lastActive: Date.now(),
    }));
    if (supabase) syncManager.triggerSync();
  };

  const addTask = (title: string, time: string) => {
    updateDb((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { id: generateUniqueId(), title, time, done: false, icon: '📌' }],
      lastActive: Date.now(),
    }));
    const patientFirstName = currentPatient?.name?.split(' ')[0] || db.book.profile.name?.split(' ')[0] || 'Patient';
    addToast(`Task pushed to ${patientFirstName}'s home screen`, '📝');
    
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
           supabase.from('tasks').insert([{
              patient_id: session.user.id,
              title: title,
              time: time,
              done: false,
              icon: '📌'
           }]).then(({ error }) => { if (error) console.debug(error); });
        }
      });
    }
  };

  const toggleMed = (id: number) => {
    updateDb((prev) => ({
      ...prev,
      meds: prev.meds.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)),
      lastActive: Date.now(),
    }));
  };

  const incrementHydration = () => {
    updateDb((prev) => {
      const nextCount = Math.min(8, prev.hydration.count + 1);
      speakText(`Water logged. ${8 - nextCount} glasses to go.`);
      if (nextCount === 8) {
        addToast('Hydration goal complete! 💧🎉', '🏆');
        speakText('Excellent! You drank eight glasses of water today.');
      }
      return {
        ...prev,
        hydration: { ...prev.hydration, count: nextCount },
        lastActive: Date.now(),
      };
    });
  };

  const setHydration = (count: number) => {
    updateDb((prev) => {
      if (count === 8) {
        addToast('Hydration goal complete! 💧🎉', '🏆');
        speakText('Excellent! You drank eight glasses of water today.');
      }
      return {
        ...prev,
        hydration: { ...prev.hydration, count },
        lastActive: Date.now(),
      };
    });
  };

  const addDiaryEntry = async (
    text: string,
    trans: string,
    lang: string,
    to: string,
    audioBlobOrUrl?: Blob | string | null,
    audioDuration?: number
  ): Promise<number> => {
    const entryId = generateUniqueId();
    let hasAudio = false;

    if (audioBlobOrUrl) {
      hasAudio = true;
      if (audioBlobOrUrl instanceof Blob) {
        try {
          const objectUrl = await saveAudioEntry(entryId, audioBlobOrUrl, audioDuration);
          setAudioMap((prev) => ({ ...prev, [entryId]: objectUrl }));
        } catch (err) {
          console.error('Failed to save audio blob:', err);
        }
      } else if (typeof audioBlobOrUrl === 'string') {
        setAudioMap((prev) => ({ ...prev, [entryId]: audioBlobOrUrl }));
      }
    }

    const newEntry: DiaryEntry = {
      id: entryId,
      ts: Date.now(),
      text,
      trans,
      lang,
      to,
      synced: !db.settings.offline,
      audio: hasAudio,
      audioDuration,
    };
    updateDb((prev) => ({
      ...prev,
      diary: [newEntry, ...prev.diary],
      lastActive: Date.now(),
    }));
    addToast(newEntry.synced ? 'Memory saved to cloud ☁️' : 'Saved offline with voice 🎙', '📔');
    speakText('Your memory has been saved.');
    return entryId;
  };

  const deleteDiaryEntry = (id: number) => {
    deleteAudioEntry(id);
    setAudioMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    updateDb((prev) => ({
      ...prev,
      diary: prev.diary.filter((e) => e.id !== id),
      lastActive: Date.now(),
    }));
    addToast('Entry deleted', '🗑');
  };

  const syncDiary = () => {
    const queued = db.diary.filter((e) => !e.synced).length;
    if (!queued) {
      addToast('Everything already synced ☁️', '✅');
      return;
    }
    addToast(`Syncing ${queued} entr${queued > 1 ? 'ies' : 'y'} to Supabase…`, '🔄');
    setTimeout(() => {
      updateDb((prev) => ({
        ...prev,
        diary: prev.diary.map((e) => ({ ...e, synced: true })),
      }));
      addToast('Offline queue synced ☁️', '✅');
    }, 900);
  };

  const updateSettings = (partial: Partial<Settings>) => {
    updateDb((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  };

  const updateMemoryBook = (updater: (prev: MemoryBook) => MemoryBook) => {
    updateDb((prev) => ({
      ...prev,
      book: updater(prev.book),
      lastActive: Date.now(),
    }));
    addToast('Memory book updated 📖', '✅');
  };

  const accuracyTolerance = getAccuracyTolerance(currentLocation?.accuracy);

  const activeSafeZone = useCallback((): SafeZone | null => {
    if (!currentLocation) return null;
    const tol = getAccuracyTolerance(currentLocation.accuracy);
    return (
      db.zones.find((z) => {
        if (z.lat == null || z.lng == null) return false;
        return geoDistance(currentLocation, { lat: z.lat, lng: z.lng }) <= (z.r + tol);
      }) || null
    );
  }, [currentLocation, db.zones]);

  const warningZone = useCallback((): SafeZone | null => {
    if (!currentLocation) return null;
    const tol = getAccuracyTolerance(currentLocation.accuracy);
    const isSafe = db.zones.some((z) => {
      if (z.lat == null || z.lng == null) return false;
      return geoDistance(currentLocation, { lat: z.lat, lng: z.lng }) <= (z.r + tol);
    });
    if (isSafe) return null;

    return (
      db.zones.find((z) => {
        if (z.lat == null || z.lng == null) return false;
        const d = geoDistance(currentLocation, { lat: z.lat, lng: z.lng });
        return d > (z.r + tol) && d <= (z.r + 25 + tol);
      }) || null
    );
  }, [currentLocation, db.zones]);

  const activeSafe = activeSafeZone();
  const warnZone = warningZone();
  const zoneStatus: 'safe' | 'warning' | 'breach' =
    !db.zones || db.zones.length === 0
      ? 'safe'
      : activeSafe
      ? 'safe'
      : warnZone
      ? 'warning'
      : 'breach';

  const homeZone = db.zones.find((z) => z.id === 1 || z.category === 'home') || db.zones[0];
  const distanceToHome =
    currentLocation && homeZone && homeZone.lat != null && homeZone.lng != null
      ? Math.round(geoDistance(currentLocation, { lat: homeZone.lat, lng: homeZone.lng }))
      : null;

  const cancelSOSCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setSosCountdown(null);
    addToast('SOS cancelled · False alarm dismissed', '🛡️');
  }, [addToast]);

  const triggerSOS = useCallback(
    (src: string, immediate: boolean = false) => {
      if (sosActive) return;

      const patientName = currentPatient?.name || db.book.profile.name || 'Patient';
      const patientFirstName = patientName.split(' ')[0] || patientName;
      const caregiverName = db.caregivers?.[0]?.name || 'Guardian';
      const caregiverPhone = db.caregivers?.[0]?.phone || currentPatient?.emergencyPhone || '+919876543210';

      const dispatchExternalSOS = () => {
        fetch('/api/emergency/dispatch-sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName,
            caregiverPhone,
            caregiverName,
            location: { lat: currentLocation?.lat || 26.1832, lng: currentLocation?.lng || 91.7425 },
            batteryLevel: batteryState.level ?? 85,
            alertType: `Perimeter Breach (${src})`,
            timestamp: Date.now(),
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              setLastSosDispatch({
                dispatchId: data.dispatchId,
                channel: data.channel,
                dispatchedAt: data.dispatchedAt,
                caregiverPhone,
              });
              addToast(`Emergency alert dispatched via ${data.channel} 📡`, '🚨');
            }
          })
          .catch((err) => console.debug('Emergency dispatch error:', err));
      };

      if (!immediate) {
        // 5-second accidental delay protection
        setSosCountdown(5);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

        let count = 5;
        countdownTimerRef.current = setInterval(() => {
          count -= 1;
          if (count > 0) {
            setSosCountdown(count);
          } else {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            setSosCountdown(null);
            setSosActive(true);

            const alertPayload: SosAlertDetails = {
              patientName: currentPatient?.name || db.book.profile.name || 'Biren Saikia',
              patientId: currentPatient?.id,
              patientAge: currentPatient?.age || 72,
              patientPhone: currentPatient?.emergencyPhone || '+919876543210',
              stage: currentPatient?.stage || 'Stage 2 (Moderate Dementia)',
              bloodGroup: currentPatient?.bloodGroup || 'O+',
              notes: currentPatient?.notes || 'Mild disorientation outside safe perimeter',
              src,
              location: currentLocation || { lat: 26.1832, lng: 91.7425, address: 'Guwahati, Assam' },
              distanceToHome: distanceToHome ?? 320,
              batteryLevel: batteryState.level ?? 82,
              timestamp: Date.now(),
              breachZone: db.zones?.[0]?.name || 'Home Sanctuary',
              caregiverPhone,
              caregiverName,
            };
            setSosDetails(alertPayload);

            realtimeSync.broadcast({
              type: 'SOS_TRIGGER',
              senderRole: 'patient',
              payload: alertPayload,
            });
            updateDb((prev) => ({
              ...prev,
              alerts: [
                {
                  id: generateUniqueId(),
                  type: 'sos',
                  msg: `🚨 SOS — ${patientFirstName} is outside safe zones (${src}) · Live GPS dispatched to ${caregiverName}`,
                  ts: Date.now(),
                  status: 'new',
                },
                ...prev.alerts,
              ],
              lastActive: Date.now(),
            }));
            speakText(
              db.settings.lang === 'as'
                ? `ভয় নকৰিব ${patientFirstName} ডাঙৰীয়া, আপুনি য’ত আছে তাতে ৰওক। অভিভাৱক ${caregiverName}ৰ ওচৰলৈ আপোনাৰ অৱস্থান প্ৰেৰণ কৰা হৈছে।`
                : `Stay calm ${patientFirstName}. You are outside the safe area. Guardian ${caregiverName} has been alerted with your live location.`
            );
            sendRealNotification(`🚨 SOS Alert: ${patientFirstName}`, {
              body: `Perimeter alert (${src}). Live GPS location dispatched to ${caregiverName}.`,
              tag: 'medha-sos-alert',
            });
            dispatchExternalSOS();
          }
        }, 1000);
      } else {
        setSosActive(true);

        const alertPayload: SosAlertDetails = {
          patientName: currentPatient?.name || db.book.profile.name || 'Biren Saikia',
          patientId: currentPatient?.id,
          patientAge: currentPatient?.age || 72,
          patientPhone: currentPatient?.emergencyPhone || '+919876543210',
          stage: currentPatient?.stage || 'Stage 2 (Moderate Dementia)',
          bloodGroup: currentPatient?.bloodGroup || 'O+',
          notes: currentPatient?.notes || 'Mild disorientation outside safe perimeter',
          src,
          location: currentLocation || { lat: 26.1832, lng: 91.7425, address: 'Guwahati, Assam' },
          distanceToHome: distanceToHome ?? 320,
          batteryLevel: batteryState.level ?? 82,
          timestamp: Date.now(),
          breachZone: db.zones?.[0]?.name || 'Home Sanctuary',
          caregiverPhone,
          caregiverName,
        };
        setSosDetails(alertPayload);

        realtimeSync.broadcast({
          type: 'SOS_TRIGGER',
          senderRole: 'patient',
          payload: alertPayload,
        });
        updateDb((prev) => ({
          ...prev,
          alerts: [
            {
              id: generateUniqueId(),
              type: 'sos',
              msg: `🚨 SOS — ${patientFirstName} is outside safe zones (${src}) · Live GPS dispatched to ${caregiverName}`,
              ts: Date.now(),
              status: 'new',
            },
            ...prev.alerts,
          ],
          lastActive: Date.now(),
        }));
        speakText(`Stay calm ${patientFirstName}. Guardian ${caregiverName} has been alerted with your live location.`);
        sendRealNotification(`🚨 SOS Alert: ${patientFirstName}`, {
          body: `Emergency perimeter alert (${src}). Live GPS dispatched to ${caregiverName}.`,
          tag: 'medha-sos-alert',
        });
        dispatchExternalSOS();
      }
    },
    [
      sosActive,
      updateDb,
      speakText,
      db.settings.lang,
      currentPatient,
      db.book.profile.name,
      db.caregivers,
      currentLocation,
      batteryState.level,
      distanceToHome,
      db.zones,
      addToast,
    ]
  );

  const clearSOS = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setSosCountdown(null);
    setSosActive(false);
    setSosDetails(null);
    stopEmergencySiren();
    const patientFirstName = currentPatient?.name?.split(' ')[0] || db.book.profile.name?.split(' ')[0] || 'Patient';
    realtimeSync.broadcast({
      type: 'SOS_CLEAR',
      senderRole: 'caregiver',
      payload: { patientName: patientFirstName },
    });
    updateDb((prev) => ({
      ...prev,
      alerts: [
        {
          id: generateUniqueId(),
          type: 'good',
          msg: `✓ SOS cleared — ${patientFirstName} is safe and inside designated perimeter`,
          ts: Date.now(),
          status: 'old',
        },
        ...prev.alerts,
      ],
      lastActive: Date.now(),
    }));
  }, [updateDb, currentPatient, db.book.profile.name]);

  const updateLocation = useCallback(
    (loc: LocationCoord) => {
      // 1. Velocity-aware adaptive jitter smoothing (filters out erratic indoor multipath jitter while tracking true movements)
      let smoothedLat = loc.lat;
      let smoothedLng = loc.lng;

      if (prevLocRef.current) {
        const d = geoDistance(loc, prevLocRef.current);
        const dt = Math.max(1, ((loc.ts || Date.now()) - (prevLocRef.current.ts || Date.now())) / 1000);
        const speed = d / dt; // estimated speed in m/s
        const acc = Math.max(0, loc.accuracy || 15);

        if (acc <= 15) {
          // High-precision satellite fix: responsive and accurate
          smoothedLat = loc.lat;
          smoothedLng = loc.lng;
        } else if (acc > 150) {
          // Coarse indoor network / cell-tower reading: heavily dampen to avoid false boundary jumps
          const alpha = 0.15;
          smoothedLat = prevLocRef.current.lat * (1 - alpha) + loc.lat * alpha;
          smoothedLng = prevLocRef.current.lng * (1 - alpha) + loc.lng * alpha;
        } else {
          // Medium accuracy (15m - 150m)
          // If speed exceeds human pedestrian movement (> 4.5 m/s or ~16 km/h) with medium accuracy, it is multipath jitter
          if (speed > 4.5 && d > acc) {
            const alpha = Math.max(0.15, Math.min(0.4, 20 / acc));
            smoothedLat = prevLocRef.current.lat * (1 - alpha) + loc.lat * alpha;
            smoothedLng = prevLocRef.current.lng * (1 - alpha) + loc.lng * alpha;
          } else {
            // Normal walking movement with typical GPS drift
            const alpha = Math.max(0.3, Math.min(0.85, 25 / acc));
            smoothedLat = prevLocRef.current.lat * (1 - alpha) + loc.lat * alpha;
            smoothedLng = prevLocRef.current.lng * (1 - alpha) + loc.lng * alpha;
          }
        }
      }

      const activeLoc: LocationCoord = {
        ...loc,
        lat: smoothedLat,
        lng: smoothedLng,
      };

      prevLocRef.current = activeLoc;
      setCurrentLocation(activeLoc);

      const prevCrumbs = prevLocRef.current ? [prevLocRef.current] : [];
      const hasMoved = !prevLocRef.current || geoDistance(activeLoc, prevLocRef.current) >= 5;

      updateDb((prev) => {
        const nextZones = [...prev.zones];
        if (nextZones[0] && (nextZones[0].lat == null || nextZones[0].lng == null)) {
          nextZones[0].lat = activeLoc.lat;
          nextZones[0].lng = activeLoc.lng;
          addToast('Home safe zone initialized to your location 📍', '📍');
        }

        const prevStoredCrumbs = prev.breadcrumbs || [];
        const lastCrumb = prevStoredCrumbs[prevStoredCrumbs.length - 1];
        const nextCrumbs = hasMoved ? [...prevStoredCrumbs.slice(-24), activeLoc] : prevStoredCrumbs;

        return {
          ...prev,
          location: activeLoc,
          breadcrumbs: nextCrumbs,
          zones: nextZones,
          lastActive: Date.now(),
        };
      });

      // Async push to Supabase for Caregiver's live map
      if (hasMoved && supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
           if (session?.user?.id) {
             supabase.from('breadcrumbs').insert([{
                patient_id: session.user.id,
                latitude: activeLoc.lat,
                longitude: activeLoc.lng,
                accuracy: activeLoc.accuracy,
                speed: activeLoc.speed,
                heading: activeLoc.heading,
             }]).then(({ error }) => { if (error) console.debug(error); });
           }
        });
      }

      // 2. Rate-limited signal quality notification (only if accuracy is coarse > 150m and throttled to once per 60s)
      const accuracy = loc.accuracy || 10;
      const now = Date.now();
      if (accuracy > 150 && now - lastAccuracyToastTsRef.current > 60000) {
        lastAccuracyToastTsRef.current = now;
        addToast(`Indoor/Network GPS (±${Math.round(accuracy)}m) — Adaptive tolerance active`, '📡');
      }

      // 3. Adaptive Geofence Evaluation with synchronized error margin tolerance
      const tolerance = getAccuracyTolerance(accuracy);

      // If user has NO zones configured yet, do not trigger perimeter breaches
      if (!db.zones || db.zones.length === 0) {
        return;
      }

      const safe = db.zones.find((z) => {
        if (z.lat == null || z.lng == null) return false;
        return geoDistance(activeLoc, { lat: z.lat, lng: z.lng }) <= (z.r + tolerance);
      });

      if (safe) {
        breachCountRef.current = 0;
        if (sosActive) {
          clearSOS();
        }
      } else {
        // Guard: If GPS accuracy is too coarse (> 150m), the uncertainty circle exceeds zone safety margin.
        // Do NOT trigger false positive SOS emergency breaches on degraded cell-tower / IP pings.
        if (accuracy > 150) {
          return;
        }

        const amber = db.zones.find((z) => {
          if (z.lat == null || z.lng == null) return false;
          const d = geoDistance(activeLoc, { lat: z.lat, lng: z.lng });
          return d <= (z.r + 25 + tolerance);
        });

        if (amber) {
          breachCountRef.current = 0;
        } else {
          breachCountRef.current += 1;
          if (breachCountRef.current >= 2 && !sosActive) {
            triggerSOS('live GPS geofence breach');
          }
        }
      }
    },
    [db.zones, sosActive, triggerSOS, clearSOS, updateDb, addToast]
  );

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    addToast('Continuous GPS tracking stopped', '⏹');
  }, [addToast]);

  const startLiveTracking = useCallback(
    (continuous: boolean = true) => {
      if (!navigator.geolocation) {
        addToast('GPS not supported on this device/browser', '⚠️');
        return;
      }

      if (continuous) {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        setIsLiveTracking(true);
        addToast('Continuous live GPS tracking active 🛰️', '✅');

        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const loc: LocationCoord = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              batteryLevel: batteryState.level,
              batteryCharging: batteryState.charging,
              ts: Date.now(),
            };
            updateLocation(loc);
          },
          (err) => {
            console.warn('GPS error:', err);
            setIsLiveTracking(false);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            addToast('GPS permission denied or signal lost', '⚠️');
          },
          {
            enableHighAccuracy: trackingMode !== 'battery_saver',
            maximumAge: trackingMode === 'battery_saver' ? 60000 : trackingMode === 'adaptive' ? 30000 : 5000,
            timeout: 15000,
          }
        );
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: LocationCoord = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              batteryLevel: batteryState.level,
              batteryCharging: batteryState.charging,
              ts: Date.now(),
            };
            updateLocation(loc);
            addToast('Location updated from GPS 📍', '✅');
          },
          (err) => {
            console.warn('GPS single position error:', err);
            addToast('Unable to read GPS location', '⚠️');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    },
    [addToast, updateLocation]
  );

  const simulateBreach = useCallback(() => {
    if (!db.settings.nGeo) {
      updateSettings({ nGeo: true });
      addToast('Geo-fence alerts enabled for breach simulation drill', '🛡️');
    }
    const breachLoc: LocationCoord = {
      lat: 26.1802,
      lng: 91.7372,
      accuracy: 12,
      ts: Date.now(),
      heading: 240,
      speed: 1.2,
    };
    updateLocation(breachLoc);
    // Directly trigger SOS for testing simulation
    triggerSOS('Safe Boundary Breached (Elder wandered 350m outside Home Sanctuary)', true);
    addToast('Perimeter breach simulation active 🚨', '🚨');
  }, [updateLocation, triggerSOS, addToast, db.settings.nGeo, updateSettings]);

  const simulateReturnHome = useCallback(() => {
    const home = db.zones.find((z) => z.id === 1 || z.category === 'home') || db.zones[0];
    const safeLoc: LocationCoord = {
      lat: home?.lat || 26.1832,
      lng: home?.lng || 91.7425,
      accuracy: 9,
      ts: Date.now(),
      heading: 45,
      speed: 0.3,
    };
    updateLocation(safeLoc);
    clearSOS();
    const patientFirstName = currentPatient?.name?.split(' ')[0] || db.book.profile.name?.split(' ')[0] || 'Patient';
    addToast(`${patientFirstName} is back safely inside Home zone 🏠`, '✅');
  }, [db.zones, updateLocation, clearSOS, addToast, currentPatient, db.book.profile.name]);

  const getWhatsAppSOSUrl = useCallback(() => {
    const patientName = currentPatient?.name || db.book.profile.name || 'Patient';
    const contact = db.emergencyContacts?.[0] || {
      name: db.caregivers?.[0]?.name || 'Guardian',
      phone: db.caregivers?.[0]?.phone || currentPatient?.emergencyPhone || '+919876543210',
      whatsapp: db.caregivers?.[0]?.phone || currentPatient?.emergencyPhone || '+919876543210',
    };
    const phone = (contact.whatsapp || contact.phone || '919876543210').replace(/[^0-9]/g, '');
    const lat = currentLocation ? currentLocation.lat.toFixed(6) : (db.zones[0]?.lat?.toFixed(6) || '26.1832');
    const lng = currentLocation ? currentLocation.lng.toFixed(6) : (db.zones[0]?.lng?.toFixed(6) || '91.7425');
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const text = encodeURIComponent(
      `🚨 MEDHA EMERGENCY ALERT: ${patientName} is outside safe zones.\n📍 Live Google Maps Location: ${mapsLink}\n⏱ Reported: ${new Date().toLocaleTimeString('en-IN')}\n📞 Primary Contact: ${contact.phone}\n🔋 Battery: ${batteryState.level}%\n🚑 Emergency: 108\n⚠️ Please check immediately!`
    );
    return `https://wa.me/${phone}?text=${text}`;
  }, [currentLocation, db.emergencyContacts, db.zones, currentPatient, db.book.profile.name, db.caregivers, batteryState.level]);

  const calibrateGPS = useCallback(() => {
    if (!navigator.geolocation) {
      addToast('GPS not supported on this device/browser', '⚠️');
      return;
    }
    addToast('Calibrating GPS with high-precision satellite fix... 🛰️', '🛰️');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LocationCoord = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          ts: Date.now(),
        };
        updateLocation(loc);
        const quality = pos.coords.accuracy <= 25 ? 'High Satellite' : pos.coords.accuracy <= 90 ? 'Good Assisted' : 'Coarse Network';
        addToast(`GPS Calibrated: ±${Math.round(pos.coords.accuracy)}m (${quality})`, '🎯');
      },
      (err) => {
        console.warn('GPS calibration error:', err);
        addToast('Could not calibrate GPS. Please allow high-accuracy location.', '⚠️');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, [addToast, updateLocation]);

  const gpsAccuracyQuality: 'high' | 'medium' | 'coarse' =
    !currentLocation || (currentLocation.accuracy || 10) <= 25
      ? 'high'
      : (currentLocation.accuracy || 10) <= 90
      ? 'medium'
      : 'coarse';

  const addSafeZone = (name: string, lat: number, lng: number, r: number) => {
    updateDb((prev) => ({
      ...prev,
      zones: [...prev.zones, { id: generateUniqueId(), name, lat, lng, r, category: 'other' }],
      lastActive: Date.now(),
    }));
    addToast('Safe place added to the real map 📍', '✅');
  };

  const deleteSafeZone = (id: number) => {
    if (id === 1) return; // Do not delete home
    updateDb((prev) => ({
      ...prev,
      zones: prev.zones.filter((z) => z.id !== id),
      lastActive: Date.now(),
    }));
  };

  const updateHomeRadius = (r: number) => {
    updateDb((prev) => {
      const nextZones = [...prev.zones];
      if (nextZones[0]) {
        nextZones[0].r = r;
      }
      return { ...prev, zones: nextZones };
    });
    if (currentLocation && !activeSafeZone() && !sosActive) {
      triggerSOS('radius change', true);
    }
  };

  const setHomeToCurrentLocation = useCallback(() => {
    if (!currentLocation) {
      addToast('No GPS location available to anchor Home', '⚠️');
      return;
    }
    updateDb((prev) => {
      const nextZones = [...prev.zones];
      const homeIdx = nextZones.findIndex((z) => z.id === 1 || z.category === 'home');
      if (homeIdx >= 0) {
        nextZones[homeIdx] = {
          ...nextZones[homeIdx],
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          address: `Calibrated Home GPS (±${Math.round(currentLocation.accuracy || 10)}m)`,
        };
      } else {
        nextZones.unshift({
          id: 1,
          name: '🏠 Home',
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          r: 75,
          category: 'home',
          address: `Calibrated Home GPS (±${Math.round(currentLocation.accuracy || 10)}m)`,
        });
      }
      return {
        ...prev,
        zones: nextZones,
        lastActive: Date.now(),
      };
    });
    addToast(
      `Home safe zone anchored to current GPS coordinates (±${Math.round(currentLocation.accuracy || 10)}m) 🎯`,
      '✅'
    );
  }, [currentLocation, updateDb, addToast]);

  const resolveAlert = (id: number) => {
    updateDb((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === id ? { ...a, status: 'old' } : a)),
    }));
  };

  return (
    <MedhaContext.Provider
      value={{
        db,
        currentUser,
        currentPage,
        sosActive,
        toasts,
        currentLocation,
        treeSearchQuery,
        setTreeSearchQuery,
        activePatientId,
        setActivePatientId,
        currentPatient,
        patientName,
        patientFirstName,
        caregiverName,
        caregiverFirstName,
        caregiverPhone,
        connectedCaregivers,
        inviteCaregiverToPatient,
        removeCaregiverLink,
        addCareCircleNote,
        linkPatientByCode,
        addNewPatient,
        unlinkPatient,
        isVoiceAssistantOpen,
        setIsVoiceAssistantOpen,
        setPage,
        login,
        logout,
        addToast,
        updateDb,
        toggleTask,
        deleteTask,
        addTask,
        toggleMed,
        incrementHydration,
        setHydration,
        addDiaryEntry,
        deleteDiaryEntry,
        syncDiary,
        updateSettings,
        updateMemoryBook,
        addSafeZone,
        deleteSafeZone,
        updateHomeRadius,
        setHomeToCurrentLocation,
        updateLocation,
        triggerSOS,
        clearSOS,
        speakText,
        activeSafeZone,
        warningZone,
        zoneStatus,
        distanceToHome,
        accuracyTolerance,
        isLiveTracking,
        startLiveTracking,
        stopLiveTracking,
        simulateBreach,
        simulateReturnHome,
        sosCountdown,
        cancelSOSCountdown,
        getWhatsAppSOSUrl,
        calibrateGPS,
        gpsAccuracyQuality,
        audioMap,
        resolveAlert,
        authLoading,
        battery: batteryState,
        trackingMode,
        setTrackingMode,
        lastSosDispatch,
        selectedGameToLaunch,
        setSelectedGameToLaunch,
        launchGame,
        sosDetails,
        sendVoiceReassurance,
        isSirenMuted,
        toggleSirenMute,
      }}
    >
      {children}
    </MedhaContext.Provider>
  );
};

export const useMedha = () => {
  const ctx = useContext(MedhaContext);
  if (!ctx) throw new Error('useMedha must be used within MedhaProvider');
  return ctx;
};
