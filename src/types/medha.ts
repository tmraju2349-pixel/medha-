export interface User {
  username: string;
  email?: string;
  password: string;
  role: 'patient' | 'caregiver';
  name: string;
  age?: number;
  city?: string;
  avatar?: string;
  phone: string;
  relation?: string;
}

export interface Task {
  id: number;
  title: string;
  time: string;
  done: boolean;
  icon: string;
}

export interface Medication {
  id: number;
  name: string;
  time: string;
  taken: boolean;
}

export interface Appointment {
  title: string;
  day: string;
  time: string;
}

export interface DiaryEntry {
  id: number;
  ts: number;
  text: string;
  trans: string;
  lang: string;
  to: string;
  synced: boolean;
  audio: boolean;
  audioDuration?: number;
}

export interface CognitiveDayScore {
  day: string;
  memory: number;
  attention: number;
  speed: number;
}

export interface GameLogItem {
  game: string;
  score: number;
  ts: number;
}

export interface SafeZone {
  id: number;
  name: string;
  x?: number;
  y?: number;
  r: number;
  lat?: number | null;
  lng?: number | null;
  category?: 'home' | 'temple' | 'park' | 'market' | 'other';
  address?: string;
}

export interface AlertItem {
  id: number;
  type: 'sos' | 'good' | 'warn' | 'info';
  msg: string;
  ts: number;
  status: 'new' | 'old';
}

export interface SosAlertDetails {
  patientName: string;
  patientId?: string | number;
  patientAge?: number;
  patientPhone?: string;
  stage?: string;
  bloodGroup?: string;
  notes?: string;
  src: string;
  location: { lat: number; lng: number; address?: string };
  distanceToHome?: number;
  batteryLevel?: number;
  timestamp: number;
  breachZone?: string;
  caregiverPhone?: string;
  caregiverName?: string;
}

export interface HydrationState {
  count: number;
  goal: number;
  date: string;
}

export interface GameLevels {
  match: number;
  seq: number;
  odd: number;
  pairs: number;
  treasure: number;
  talk: number;
  [key: string]: number;
}

export interface FamilyMember {
  n: string;
  r: string;
  p: string;
  e: string;
  photo: string;
  age: string;
  birthday: string;
  memory: string;
}

export interface DailyRoutine {
  t: string;
  a: string;
}

export interface LovedPlace {
  n: string;
  e: string;
  d: string;
}

export interface HelpInfo {
  doc: string;
  docp: string;
  addr: string;
  blood: string;
}

export interface UserProfile {
  name: string;
  age: string;
  born: string;
  home: string;
  job: string;
  food: string;
  song: string;
  language: string;
  [key: string]: string;
}

export interface MemoryBook {
  profile: UserProfile;
  family: FamilyMember[];
  routine: DailyRoutine[];
  places: LovedPlace[];
  help: HelpInfo;
}

export type EthicalTerminology = 'loved_one' | 'elder' | 'name_only' | 'care_partner' | 'senior';

export interface Settings {
  lang: 'en' | 'as' | 'bn' | 'hi';
  ts: 'sm' | 'md' | 'lg';
  voice: boolean;
  rate: number;
  nMed: boolean;
  nHyd: boolean;
  nGeo: boolean;
  contrast: boolean;
  offline: boolean;
  bluetooth?: boolean;
  ethicalTerm?: EthicalTerminology;
}

export interface LocationCoord {
  lat: number;
  lng: number;
  accuracy?: number;
  ts?: number;
  heading?: number | null;
  speed?: number | null;
  batteryLevel?: number; // 0-100%
  batteryCharging?: boolean;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  whatsapp?: string;
  role?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'game_sessions' | 'patients' | 'diary_entries' | 'memory_nodes';
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  retryCount: number;
  lastAttemptAt?: number;
  error?: string;
  createdAt: number;
}

export interface MLInterventionRecord {
  timestamp: number;
  type: 'speed_reduction' | 'target_assist' | 'level_demote' | 'level_promote' | 'contrast_boost';
  reason: string;
  previousLevel: number;
  newLevel: number;
}

export interface CognitiveTelemetryTrial {
  trialIndex: number;
  reactionTimeMs: number;
  hesitationMs: number;
  isCorrect: boolean;
  targetId: string;
  difficultyLevel: number;
}

export interface GameSession {
  sessionId: string;
  patientId: string;
  gameId: string;
  cognitiveDomains: string[];
  difficulty: number;
  score: number;
  accuracy: number;
  correctAnswers: number;
  incorrectAnswers: number;
  attempts: number;
  hintsUsed: number;
  averageReactionTime: number; // in seconds or ms
  peakReactionTimeMs?: number;
  reactionTimesMs?: number[];
  hesitationMs?: number;
  fatigueIndex?: number;
  mlInterventions?: MLInterventionRecord[];
  motorStabilityScore?: number; // 0-100
  completionTime: number;
  completed: boolean;
  startedAt: number;
  completedAt: number;
  syncedAt?: number;
}

export interface PatientProfileRecord {
  id: string; // Unique patient UUID e.g. PAT-9284-8211 or standard UUID
  code: string; // 6-digit easy pairing code e.g. "MED-782"
  name: string;
  age: number;
  gender?: string;
  bloodGroup?: string;
  stage: 'Mild' | 'Moderate' | 'Advanced' | 'Early';
  city: string;
  avatar: string;
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  preferredTerm?: string; // e.g. "Loved One", "Father", "Mother", "Grandfather", "Elder"
  relationshipToCaregiver?: string;
  primaryCaregiverId?: string;
  linkedCaregiverIds?: string[];
  notes?: string;
  createdAt: number;
}

export interface CaregiverProfileRecord {
  id: string; // Unique caregiver UUID e.g. CRG-4401-1928
  name: string;
  email: string;
  phone: string;
  relationship: string;
  role?: 'Primary Caregiver' | 'Family Doctor' | 'Secondary Guardian' | 'Nurse' | 'Care Coordinator';
  avatar?: string;
  patientIds: string[]; // Linked patient UUIDs
}

export interface CaregiverPatientLink {
  id: string;
  caregiverId: string;
  patientId: string;
  pairingCode: string;
  status: 'active' | 'pending' | 'revoked';
  relationship: string;
  role?: 'Primary Caregiver' | 'Family Doctor' | 'Secondary Guardian' | 'Nurse' | 'Care Coordinator';
  connectedAt: number;
  lastActiveAt?: number;
}

export interface CareCircleNote {
  id: string;
  patientId: string;
  authorName: string;
  authorRole: string;
  message: string;
  ts: number;
  category: 'general' | 'medication' | 'incident' | 'doctor';
}

export interface MedhaDB {
  users: User[];
  patients?: PatientProfileRecord[];
  activePatientId?: string;
  caregivers?: CaregiverProfileRecord[];
  caregiverPatientLinks?: CaregiverPatientLink[];
  careCircleNotes?: CareCircleNote[];
  tasks: Task[];
  meds: Medication[];
  appointment: Appointment;
  diary: DiaryEntry[];
  scores: CognitiveDayScore[];
  gameLog: GameLogItem[];
  gameSessions?: GameSession[];
  syncQueue?: SyncQueueItem[];
  zones: SafeZone[];
  alerts: AlertItem[];
  hydration: HydrationState;
  levels: GameLevels;
  book: MemoryBook;
  settings: Settings;
  lastActive: number;
  location: LocationCoord | null;
  caregiverLocation?: LocationCoord | null;
  breadcrumbs?: LocationCoord[];
  emergencyContacts?: EmergencyContact[];
  battery?: {
    level: number;
    charging: boolean;
    lastReported: number;
  };
  trackingMode?: 'adaptive' | 'high_accuracy' | 'battery_saver';
  isCleanSlate?: boolean;
}

export interface GameItem {
  id: 'talk' | 'treasure' | 'match' | 'seq' | 'odd' | 'pairs';
  name: string;
  emoji: string;
  desc: string;
  domain: 'memory' | 'attention' | 'speed';
  how: string;
}
