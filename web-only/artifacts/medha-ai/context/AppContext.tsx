import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createTestDiaryEntries,
  createTestGameProgress,
  createTestNotifications,
  createTestTasks,
  TEST_PATIENT,
  type PatientProfile,
} from '@/data/testPatientData';
import { useAuth } from '@/context/AuthContext';
import {
  createRemoteId,
  fetchSnapshot,
  pushSyncOperations,
  updatePatientProfile as updateRemotePatientProfile,
  type SyncOperation,
} from '@/services/backend';

export type MicPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type TaskStatus = 'pending' | 'done' | 'snoozed';
export type TaskCategory = 'medicine' | 'hydration' | 'routine' | 'appointment';

export interface DailyTask {
  id: string;
  title: string;
  time: string;
  recurrence?: string | null;
  dueAt?: string | null;
  category: TaskCategory;
  icon: 'heart' | 'droplet' | 'sun' | 'calendar';
  status: TaskStatus;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: 'important' | 'gentle' | 'safety';
  read: boolean;
}

export interface DiaryEntry {
  id: string;
  transcript: string;
  createdAt: string;
  audioUri: string | null;
  audioStatus: 'saved-locally' | 'transcribing' | 'ready-to-record';
  possibleTask?: {
    title: string;
    time: string;
    recurrence: string;
  } | null;
  language?: string | null;
}

export interface GameProgress {
  sessions: number;
  bestScore: number;
  lastScore: number | null;
  lastPlayedAt: string | null;
}

export interface MemoryCue {
  id: string;
  type: 'person' | 'place' | 'routine';
  title: string;
  detail: string;
  icon: string;
}

export interface AppSettings {
  language: 'English' | 'Assamese' | 'Hindi';
  highContrast: boolean;
  voicePrompts: boolean;
  notificationsEnabled: boolean;
}

interface PersistedState {
  tasks: DailyTask[];
  notifications: AppNotification[];
  diaryEntries: DiaryEntry[];
  micPosition: MicPosition;
  gameProgress: GameProgress;
  settings: AppSettings;
  testDataActive: boolean;
  patient: PatientProfile | null;
  memoryCues: MemoryCue[];
  syncQueue: SyncOperation[];
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  lastSyncedAt: string | null;
  profileSyncPending: boolean;
}

interface AppContextValue extends PersistedState {
  isHydrated: boolean;
  completeTask: (taskId: string) => void;
  snoozeTask: (taskId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  setMicPosition: (position: MicPosition) => void;
  addDiaryEntry: (
    transcript: string,
    audioUri: string | null,
    possibleTask?: DiaryEntry['possibleTask'],
  ) => void;
  addVoiceTask: (title: string, time: string, recurrence: string) => void;
  recordGameSession: (score: number) => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  loadTestPatientData: () => void;
  deleteTestPatientData: () => void;
  updatePatientProfile: (patient: PatientProfile) => void;
  upsertMemoryCue: (cue: MemoryCue) => void;
  syncNow: () => Promise<void>;
}

const LEGACY_STORAGE_KEY = '@medha-ai/app-state';
const DEMO_STORAGE_KEY = '@medha-ai/app-state:demo';
const ACCOUNT_STORAGE_PREFIX = '@medha-ai/app-state:account:';

const createTestMemoryCues = (): MemoryCue[] => [
  { id: 'test-person-ananya', type: 'person', title: 'Ananya Barua', detail: 'Your daughter · Primary caregiver', icon: 'users' },
  { id: 'test-person-doctor', type: 'person', title: 'Family doctor', detail: 'Your care team · Appointment today', icon: 'heart' },
  { id: 'test-place-home', type: 'place', title: 'Home', detail: 'House 14, Zoo Road, Guwahati', icon: 'home' },
  { id: 'test-place-zoo', type: 'place', title: 'State Zoo Gate', detail: 'A familiar landmark nearby', icon: 'map-pin' },
  { id: 'test-routine-medicine', type: 'routine', title: 'Morning medicine', detail: 'Part of your everyday care plan', icon: 'sunrise' },
  { id: 'test-routine-doctor', type: 'routine', title: 'Family doctor appointment', detail: 'Today at 4:30 PM', icon: 'calendar' },
];

const createEmptyState = (): PersistedState => ({
  tasks: [],
  notifications: [],
  diaryEntries: [],
  micPosition: 'bottom-right',
  gameProgress: { sessions: 0, bestScore: 0, lastScore: null, lastPlayedAt: null },
  settings: {
    language: 'English',
    highContrast: false,
    voicePrompts: true,
    notificationsEnabled: true,
  },
  testDataActive: false,
  patient: null,
  memoryCues: [],
  syncQueue: [],
  syncStatus: 'idle',
  lastSyncedAt: null,
  profileSyncPending: false,
});

const createDemoState = (): PersistedState => ({
  ...createEmptyState(),
  tasks: createTestTasks(),
  notifications: createTestNotifications(),
  diaryEntries: createTestDiaryEntries(),
  gameProgress: createTestGameProgress(),
  testDataActive: true,
  patient: TEST_PATIENT,
  memoryCues: createTestMemoryCues(),
});

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session, user, isDemo } = useAuth();
  const storageKey = isDemo
    ? DEMO_STORAGE_KEY
    : session?.accessToken && user?.id
      ? `${ACCOUNT_STORAGE_PREFIX}${user.id}`
      : null;
  const [state, setState] = useState<PersistedState>(createEmptyState);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const isHydrated = storageKey === null || loadedStorageKey === storageKey;

  useEffect(() => {
    let mounted = true;
    const fallbackState = isDemo ? createDemoState() : createEmptyState();
    setLoadedStorageKey(null);
    setState(fallbackState);

    if (!storageKey) return () => { mounted = false; };

    const loadState = async () => {
      let stored = await AsyncStorage.getItem(storageKey);
      let nextState = fallbackState;

      if (!stored && isDemo) {
        const legacyState = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyState) {
          try {
            const parsed = {
              ...createEmptyState(),
              ...JSON.parse(legacyState),
            } as PersistedState;
            if (parsed.testDataActive && parsed.patient?.id === TEST_PATIENT.id) {
              nextState = parsed;
              await AsyncStorage.setItem(storageKey, JSON.stringify(nextState));
              await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
            }
          } catch {
            // The legacy shared state is ignored unless it is a valid demo snapshot.
          }
        }
      }

      if (stored) {
        try {
          nextState = { ...fallbackState, ...JSON.parse(stored) } as PersistedState;
        } catch {
          nextState = fallbackState;
        }
      }

      if (mounted) {
        setState(nextState);
        setLoadedStorageKey(storageKey);
      }
    };

    void loadState().catch(() => {
      if (mounted) {
        setState(fallbackState);
        setLoadedStorageKey(storageKey);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isDemo, storageKey]);

  useEffect(() => {
    if (storageKey && loadedStorageKey === storageKey) {
      AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => undefined);
    }
  }, [loadedStorageKey, state, storageKey]);

  const syncNow = useCallback(async () => {
    if (isDemo || !session?.accessToken || !user?.id || state.testDataActive) return;

    setState((current) => ({ ...current, syncStatus: 'syncing' }));
    const acceptedOperationIds = new Set<string>();

    try {
      if (state.syncQueue.length > 0) {
        const result = await pushSyncOperations(session.accessToken, state.syncQueue);
        result.acceptedOperationIds.forEach((id) => acceptedOperationIds.add(id));
      }

      const profileSnapshot = state.patient
        ? await updateRemotePatientProfile(session.accessToken, state.patient)
        : null;
      const snapshot = profileSnapshot ?? (await fetchSnapshot(session.accessToken));
      setState((current) => ({
        ...current,
        patient: snapshot.patient,
        tasks: snapshot.tasks,
        notifications: snapshot.notifications,
        diaryEntries: snapshot.diaryEntries,
        gameProgress: snapshot.gameProgress,
        memoryCues: snapshot.memoryCues.map((cue) => ({
          ...cue,
          type: cue.type === 'place' || cue.type === 'routine' ? cue.type : 'person',
          icon: cue.icon || 'heart',
        })),
        syncQueue: current.syncQueue.filter((operation) => !acceptedOperationIds.has(operation.id)),
        syncStatus: 'synced',
        lastSyncedAt: snapshot.syncedAt,
        profileSyncPending: false,
      }));
    } catch (caught) {
      setState((current) => ({
        ...current,
        syncStatus:
          caught instanceof Error && 'status' in caught && caught.status === 0
            ? 'offline'
            : 'error',
      }));
    }
  }, [isDemo, session?.accessToken, state.syncQueue, state.testDataActive, user?.id]);

  useEffect(() => {
    if (isHydrated && !isDemo && session?.accessToken && user?.id && !state.testDataActive) {
      void syncNow();
    }
  }, [isDemo, isHydrated, session?.accessToken, state.testDataActive, syncNow, user?.id]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      isHydrated,
      completeTask: (taskId) => {
        setState((current) => {
          const task = current.tasks.find((item) => item.id === taskId);
          return {
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === taskId ? { ...item, status: 'done' } : item,
            ),
            syncQueue:
              !current.testDataActive && task
                ? [
                    ...current.syncQueue,
                    {
                      id: createRemoteId(),
                      entity: 'task',
                      action: 'upsert',
                      payload: { ...task, status: 'done' },
                    },
                  ]
                : current.syncQueue,
          };
        });
      },
      snoozeTask: (taskId) => {
        setState((current) => {
          const task = current.tasks.find((item) => item.id === taskId);
          return {
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === taskId ? { ...item, status: 'snoozed' } : item,
            ),
            syncQueue:
              !current.testDataActive && task
                ? [
                    ...current.syncQueue,
                    {
                      id: createRemoteId(),
                      entity: 'task',
                      action: 'upsert',
                      payload: { ...task, status: 'snoozed' },
                    },
                  ]
                : current.syncQueue,
          };
        });
      },
      markNotificationRead: (notificationId) => {
        setState((current) => {
          const notification = current.notifications.find((item) => item.id === notificationId);
          return {
            ...current,
            notifications: current.notifications.map((item) =>
              item.id === notificationId ? { ...item, read: true } : item,
            ),
            syncQueue:
              !current.testDataActive && notification
                ? [
                    ...current.syncQueue,
                    {
                      id: createRemoteId(),
                      entity: 'notification',
                      action: 'upsert',
                      payload: { ...notification, read: true },
                    },
                  ]
                : current.syncQueue,
          };
        });
      },
      setMicPosition: (micPosition) => setState((current) => ({ ...current, micPosition })),
      addDiaryEntry: (transcript, audioUri, possibleTask) => {
        const entry: DiaryEntry = {
          id: createRemoteId(),
          transcript,
          createdAt: new Date().toISOString(),
          audioUri,
          audioStatus: audioUri ? 'saved-locally' : 'ready-to-record',
          possibleTask,
        };
        setState((current) => ({
          ...current,
          diaryEntries: [entry, ...current.diaryEntries],
          syncQueue:
            !current.testDataActive
              ? [
                  ...current.syncQueue,
                  {
                    id: createRemoteId(),
                    entity: 'diary',
                    action: 'upsert',
                    payload: entry as unknown as Record<string, unknown>,
                  },
                ]
              : current.syncQueue,
        }));
      },
      addVoiceTask: (title, time, recurrence) => {
        const task: DailyTask = {
          id: createRemoteId(),
          title,
          time,
          recurrence,
          category: 'routine',
          icon: 'calendar',
          status: 'pending',
        };
        const notification: AppNotification = {
          id: createRemoteId(),
          title: 'New reminder added',
          body: `${title} · ${time} · ${recurrence}`,
          time: 'Just now',
          kind: 'gentle',
          read: false,
        };
        setState((current) => ({
          ...current,
          tasks: [...current.tasks, task],
          notifications: [notification, ...current.notifications],
          syncQueue:
            !current.testDataActive
              ? [
                  ...current.syncQueue,
                  {
                    id: createRemoteId(),
                    entity: 'task',
                    action: 'upsert',
                    payload: task as unknown as Record<string, unknown>,
                  },
                  {
                    id: createRemoteId(),
                    entity: 'notification',
                    action: 'upsert',
                    payload: notification as unknown as Record<string, unknown>,
                  },
                ]
              : current.syncQueue,
        }));
      },
      recordGameSession: (score) => {
        const playedAt = new Date().toISOString();
        const gameId = createRemoteId();
        setState((current) => ({
          ...current,
          gameProgress: {
            sessions: current.gameProgress.sessions + 1,
            bestScore: Math.max(current.gameProgress.bestScore, score),
            lastScore: score,
            lastPlayedAt: playedAt,
          },
          syncQueue:
            !current.testDataActive
              ? [
                  ...current.syncQueue,
                  {
                    id: createRemoteId(),
                    entity: 'game',
                    action: 'upsert',
                    payload: {
                      id: gameId,
                      gameKey: 'memory-pairs',
                      score,
                      mistakes: 0,
                      playedAt,
                    },
                  },
                ]
              : current.syncQueue,
        }));
      },
      updateSetting: (key, value) => {
        setState((current) => ({
          ...current,
          settings: { ...current.settings, [key]: value },
        }));
      },
      loadTestPatientData: () => {
        if (!isDemo) return;
        setState((current) => ({
          ...current,
          tasks: createTestTasks(),
          notifications: createTestNotifications(),
          diaryEntries: createTestDiaryEntries(),
          gameProgress: createTestGameProgress(),
          testDataActive: true,
          patient: TEST_PATIENT,
          memoryCues: createTestMemoryCues(),
          syncQueue: [],
          syncStatus: 'idle',
          lastSyncedAt: null,
          profileSyncPending: false,
        }));
      },
      deleteTestPatientData: () => {
        if (!isDemo) return;
        setState((current) => ({
          ...current,
          tasks: [],
          notifications: [],
          diaryEntries: [],
          gameProgress: { sessions: 0, bestScore: 0, lastScore: null, lastPlayedAt: null },
          testDataActive: false,
          patient: null,
          memoryCues: [],
          syncQueue: [],
          syncStatus: 'idle',
          lastSyncedAt: null,
          profileSyncPending: false,
        }));
      },
      updatePatientProfile: (patient) => {
        setState((current) => ({
          ...current,
          patient,
          profileSyncPending: !current.testDataActive,
        }));
      },
      upsertMemoryCue: (cue) => {
        setState((current) => ({
          ...current,
          memoryCues: [...current.memoryCues.filter((item) => item.id !== cue.id), cue],
          syncQueue:
            !current.testDataActive
              ? [
                  ...current.syncQueue,
                  {
                    id: createRemoteId(),
                    entity: 'memory',
                    action: 'upsert',
                    payload: cue as unknown as Record<string, unknown>,
                  },
                ]
              : current.syncQueue,
        }));
      },
      syncNow,
    }),
    [isHydrated, state, syncNow],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}