import type { AppNotification, DiaryEntry, DailyTask, GameProgress } from '@/context/AppContext';

export const TEST_DATA_LABEL = 'TEST DATA — DELETE ME';
export const TEST_PATIENT_ID = 'TEST-PATIENT-001';

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  region: string;
  languages: string[];
  caregiverName: string;
  caregiverRelationship: string;
  caregiverPhone: string;
  homeAddress: string;
}

export const TEST_PATIENT: PatientProfile = {
  id: TEST_PATIENT_ID,
  name: 'Ramesh Barua',
  age: 72,
  region: 'Guwahati, Assam',
  languages: ['Assamese', 'Hindi', 'English'],
  caregiverName: 'Ananya Barua',
  caregiverRelationship: 'Daughter',
  caregiverPhone: '+919876543210',
  homeAddress: 'House 14, Zoo Road, opposite State Zoo Gate, Guwahati',
};

export const createTestTasks = (): DailyTask[] => [
  { id: `${TEST_PATIENT_ID}-task-medicine`, title: 'Morning medicine', time: '8:00 AM', category: 'medicine', icon: 'heart', status: 'pending' },
  { id: `${TEST_PATIENT_ID}-task-water`, title: 'Drink a glass of water', time: '10:00 AM', category: 'hydration', icon: 'droplet', status: 'pending' },
  { id: `${TEST_PATIENT_ID}-task-walk`, title: 'Morning walk', time: '11:30 AM', category: 'routine', icon: 'sun', status: 'pending' },
  { id: `${TEST_PATIENT_ID}-task-doctor`, title: 'Family doctor appointment', time: '4:30 PM', category: 'appointment', icon: 'calendar', status: 'pending' },
];

export const createTestNotifications = (): AppNotification[] => [
  { id: `${TEST_PATIENT_ID}-notification-medicine`, title: 'Medicine reminder', body: 'Your morning medicine is waiting.', time: 'Now', kind: 'important', read: false },
  { id: `${TEST_PATIENT_ID}-notification-caregiver`, title: 'A message from Ananya', body: '“Have a peaceful morning, Baba. I will call after lunch.”', time: 'Yesterday', kind: 'gentle', read: false },
];

export const createTestDiaryEntries = (): DiaryEntry[] => [
  {
    id: `${TEST_PATIENT_ID}-diary-welcome`,
    transcript: 'This is a test voice diary note. It is safe to delete.',
    createdAt: '2026-09-03T08:15:00.000Z',
    audioUri: null,
    audioStatus: 'ready-to-record',
    possibleTask: null,
  },
];

export const createTestGameProgress = (): GameProgress => ({
  sessions: 2,
  bestScore: 80,
  lastScore: 80,
  lastPlayedAt: '2026-09-02T11:30:00.000Z',
});