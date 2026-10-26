import {
  MedhaDB,
  MemoryBook,
  User,
  PatientProfileRecord,
  CaregiverProfileRecord,
} from '../types/medha';
import { INITIAL_PATIENTS, INITIAL_CAREGIVERS, INITIAL_LINKS, INITIAL_CARE_NOTES } from './patientCaregiverService';

export const DBKEY = 'smriti_v1';
export const USER_REGISTRY_KEY = 'smriti_registered_users';

export const DEMO_USERNAMES = [
  'patient',
  'caregiver',
  'demo_patient',
  'demo_caregiver',
  'biren',
  'pooja',
  'demo',
  'patient@medha.demo',
  'caregiver@medha.demo',
  'biren@medha.demo',
  'pooja@medha.demo',
  'demo.patient@medha.care',
  'demo.caregiver@medha.care',
];

export function isDemoAccount(identifier?: string | null): boolean {
  if (!identifier) return true;
  const clean = identifier.trim().toLowerCase();
  // If registered in the user registry, it is a registered account, not a demo account
  const registered = getAllRegisteredUsers();
  if (registered.some((u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean)) {
    return false;
  }
  if (clean.endsWith('@medha.demo') || clean.endsWith('@medha.care')) {
    return true;
  }
  const usernamePart = clean.split('@')[0];
  return DEMO_USERNAMES.includes(clean) || DEMO_USERNAMES.includes(usernamePart) || clean === 'demo';
}

export function isRegisteredUser(identifier?: string | null): boolean {
  if (!identifier) return false;
  const clean = identifier.trim().toLowerCase();
  const all = getAllRegisteredUsers();
  return all.some((u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean);
}

export interface RegisteredUserRecord {
  username: string;
  email: string;
  password: string;
  role: 'patient' | 'caregiver';
  name: string;
  registeredAt: number;
}

let lastUniqueId = Date.now();
export function generateUniqueId(): number {
  const now = Date.now();
  lastUniqueId = now > lastUniqueId ? now : lastUniqueId + 1;
  return lastUniqueId;
}

export function getAllRegisteredUsers(): RegisteredUserRecord[] {
  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function findRegisteredUser(identifier: string): RegisteredUserRecord | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const all = getAllRegisteredUsers();
  return all.find((u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean) || null;
}

export function registerNewUser(
  username: string,
  email: string,
  password: string,
  role: 'patient' | 'caregiver'
): RegisteredUserRecord {
  const cleanUser = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const all = getAllRegisteredUsers();
  const existingIdx = all.findIndex((u) => u.username.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanEmail);

  const record: RegisteredUserRecord = {
    username: cleanUser,
    email: cleanEmail,
    password: password.trim(),
    role,
    name: username.trim(),
    registeredAt: Date.now(),
  };

  if (existingIdx >= 0) {
    all[existingIdx] = record;
  } else {
    all.push(record);
  }

  try {
    localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Could not save to user registry:', err);
  }

  return record;
}

export function getActiveUserKey(userOrEmail?: string): string {
  const identifier =
    userOrEmail || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : null);
  if (!identifier || isDemoAccount(identifier)) return DBKEY;
  const clean = identifier.trim().toLowerCase();
  return `smriti_user_${clean}`;
}

export function createBlankDB(
  username: string,
  email: string,
  role: 'patient' | 'caregiver',
  password: string = '123456'
): MedhaDB {
  const cleanName = username.trim();
  const patientId = `PAT-${Math.floor(1000 + Math.random() * 9000)}-${cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'USER'}`;
  const pairingCode = `MED-${Math.floor(100 + Math.random() * 900)}`;

  const cleanUser: User = {
    username: cleanName.toLowerCase(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    role,
    name: cleanName,
    phone: '',
    avatar: role === 'patient' ? '👤' : '👩‍⚕️',
  };

  // If patient: fresh patient record ready with their unique pairing code for independent multi-caregiver pairing
  const patientRecord: PatientProfileRecord | null =
    role === 'patient'
      ? {
          id: patientId,
          code: pairingCode,
          name: cleanName,
          age: 70,
          stage: 'Mild',
          city: '',
          avatar: '👤',
          phone: '',
          emergencyContact: '',
          emergencyPhone: '',
          primaryCaregiverId: '',
          linkedCaregiverIds: [],
          createdAt: Date.now(),
        }
      : null;

  // If caregiver: caregiver record with 0 patients connected yet
  const caregiverRecord: CaregiverProfileRecord | null =
    role === 'caregiver'
      ? {
          id: `CRG-${Date.now().toString().slice(-4)}`,
          name: cleanName,
          email: email.trim().toLowerCase(),
          phone: '',
          role: 'Primary Caregiver',
          relationship: 'Caregiver',
          avatar: '👩‍⚕️',
          patientIds: [],
        }
      : null;

  return {
    users: [cleanUser],
    patients: patientRecord ? [patientRecord] : [],
    activePatientId: patientRecord ? patientRecord.id : '',
    caregivers: caregiverRecord ? [caregiverRecord] : [],
    caregiverPatientLinks: [], // NO caregiver links until connected
    careCircleNotes: [], // NO clinical notes
    tasks: [], // NO schedules
    meds: [], // NO medications
    appointment: { title: '', day: '', time: '' }, // NO appointment
    diary: [], // NO memories
    scores: [], // NO game scores
    gameLog: [], // NO game logs
    zones: [], // NO home, NO safe zones until user or caregiver creates them
    alerts: [], // NO alerts
    hydration: { count: 0, goal: 8, date: new Date().toDateString() },
    levels: { match: 1, seq: 1, odd: 1, pairs: 1, treasure: 1, talk: 1 },
    book: {
      profile: {
        name: cleanName,
        age: '',
        born: '',
        home: '',
        job: '',
        food: '',
        song: '',
        language: 'English',
      },
      family: [], // NO family members
      routine: [], // NO routines
      places: [], // NO places
      help: {
        doc: '',
        docp: '',
        addr: '',
        blood: '',
      },
    },
    settings: {
      lang: 'en',
      ts: 'md',
      voice: true,
      rate: 0.9,
      nMed: true,
      nHyd: true,
      nGeo: true,
      contrast: false,
      offline: false,
      bluetooth: true,
    },
    lastActive: Date.now(),
    location: null,
    caregiverLocation: null,
    breadcrumbs: [],
    emergencyContacts: [], // NO emergency contacts until added
    isCleanSlate: true, // Flag ensuring no demo data is auto-injected
  };
}

function sanitizeListWithUniqueIds<T extends { id: number }>(list: T[]): { sanitized: T[]; hasDuplicates: boolean } {
  if (!Array.isArray(list)) return { sanitized: [], hasDuplicates: false };
  const seen = new Set<number>();
  let hasDuplicates = false;
  const sanitized = list.map((item) => {
    if (!item || typeof item !== 'object') return item;
    if (seen.has(item.id)) {
      hasDuplicates = true;
      return { ...item, id: generateUniqueId() };
    }
    seen.add(item.id);
    return item;
  });
  return { sanitized, hasDuplicates };
}

export function seedDB(): MedhaDB {
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5);
    const t = i * 0.9 + Math.sin(i / 2) * 4;
    return {
      day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      memory: Math.round(58 + t + Math.random() * 8),
      attention: Math.round(62 + t + Math.random() * 8),
      speed: Math.round(54 + t + Math.random() * 9),
    };
  });

  return {
    users: [
      { username: 'patient', email: 'demo.patient@medha.care', password: '123456', role: 'patient', name: 'Biren Saikia', age: 72, city: 'Guwahati, Assam', avatar: '👴', phone: '+919876501111' },
      { username: 'caregiver', email: 'demo.caregiver@medha.care', password: '123456', role: 'caregiver', name: 'Pooja Saikia', relation: 'Daughter', phone: '+919876543210' },
      { username: 'biren', email: 'biren.saikia@medha.care', password: '123456', role: 'patient', name: 'Biren Saikia', age: 72, city: 'Guwahati, Assam', avatar: '👴', phone: '+919876501111' },
      { username: 'pooja', email: 'pooja.saikia@medha.care', password: '123456', role: 'caregiver', name: 'Pooja Saikia', relation: 'Daughter', phone: '+919876543210' },
    ],
    patients: INITIAL_PATIENTS,
    activePatientId: 'PAT-7201-BIREN',
    caregivers: INITIAL_CAREGIVERS,
    caregiverPatientLinks: INITIAL_LINKS,
    careCircleNotes: INITIAL_CARE_NOTES,
    tasks: [
      { id: 1, title: 'Morning walk in the park', time: '07:00', done: true, icon: '🚶' },
      { id: 2, title: 'Take blood-pressure tablet', time: '09:00', done: true, icon: '💊' },
      { id: 3, title: 'Water the tulsi plants', time: '17:00', done: false, icon: '🌱' },
      { id: 4, title: 'Call Pooja (daughter)', time: '18:30', done: false, icon: '📞' },
    ],
    meds: [
      { id: 1, name: 'Donepezil 5mg', time: '09:00 AM', taken: true },
      { id: 2, name: 'Vitamin D', time: '01:00 PM', taken: false },
      { id: 3, name: 'Memantine 10mg', time: '09:00 PM', taken: false },
    ],
    appointment: { title: 'Dr. Sharma — Memory Clinic, GMCH', day: 'Friday', time: '11:00 AM' },
    diary: [
      {
        id: 1,
        ts: Date.now() - 864e5 * 2,
        text: 'I had tea with Moloi in the garden this morning. The kahwa was strong.',
        trans: 'আজি ৰাতিপুৱা মলয়ৰ সৈতে বাৰীত চাহ খাইছিলোঁ।',
        lang: 'en-IN',
        to: 'as',
        synced: true,
        audio: true,
      },
      {
        id: 2,
        ts: Date.now() - 864e5,
        text: 'Remembered our Bihu dance from 1998. Bihu danced with dhol. Felt happy.',
        trans: 'मुझे 1998 का बिहू नृत्य याद आया। ढोल के साथ बिहू नाचा। अच्छा लगा।',
        lang: 'en-IN',
        to: 'hi',
        synced: true,
        audio: true,
      },
    ],
    scores: days,
    gameLog: [
      { game: 'match', score: 82, ts: Date.now() - 36e5 * 5 },
      { game: 'odd', score: 74, ts: Date.now() - 36e5 * 20 },
      { game: 'seq', score: 68, ts: Date.now() - 864e5 * 30 },
    ],
    zones: [
      { id: 1, name: '🏠 Home', lat: 26.1832, lng: 91.7425, r: 75, category: 'home', address: 'House 14, Nizarapara, Guwahati' },
      { id: 2, name: '🛕 Nabagraha Temple', lat: 26.1874, lng: 91.7450, r: 65, category: 'temple', address: 'Chitrachal Hill Temple Sanctuary' },
      { id: 3, name: '🌳 Dighalipukhuri Lake Park', lat: 26.1885, lng: 91.7492, r: 85, category: 'park', address: 'Dighalipukhuri Lakeside Walkway' },
      { id: 4, name: '🍵 Morning Tea Corner', lat: 26.1818, lng: 91.7408, r: 50, category: 'market', address: 'Old Tea Garden Road Crossing' },
    ],
    alerts: [
      { id: 1, type: 'info', msg: 'Hydration goal missed by 3 glasses yesterday', ts: Date.now() - 864e5, status: 'new' },
      { id: 2, type: 'good', msg: 'Completed Memory Match Lv 3 — 82 pts 🎉', ts: Date.now() - 36e5 * 5, status: 'new' },
      { id: 3, type: 'warn', msg: 'Evening walk skipped on Tuesday', ts: Date.now() - 864e5 * 2, status: 'old' },
      { id: 4, type: 'sos', msg: '🚨 Test SOS drill resolved — Location verified at Home zone', ts: Date.now() - 864e5 * 4, status: 'old' },
    ],
    hydration: { count: 2, goal: 8, date: new Date().toDateString() },
    levels: { match: 2, seq: 2, odd: 2, pairs: 1, treasure: 1, talk: 1 },
    book: {
      profile: {
        name: 'Biren Saikia',
        age: '72',
        born: '14 March 1954',
        home: 'Nizarapara, Guwahati, Assam',
        job: 'Retired Tea Estate Manager',
        food: 'Masor tenga & komal Saul',
        song: 'Bihu Husori',
        language: 'Assamese · English',
      },
      family: [
        {
          n: 'Moloi Saikia',
          r: 'Wife · childhood sweetheart',
          p: '98765 02222',
          e: '👵',
          photo: 'family-moloi.png',
          age: '68',
          birthday: '2 November',
          memory: 'Tea together at sunrise',
        },
        {
          n: 'Pooja Saikia',
          r: 'Daughter · Guardian',
          p: '98765 43210',
          e: '👩',
          photo: 'family-pooja.png',
          age: '38',
          birthday: '18 July',
          memory: 'Kaziranga trip · 2019',
        },
        {
          n: 'Rohan Saikia',
          r: 'Son · in Shillong',
          p: '98765 09999',
          e: '🧑',
          photo: 'family-rohan.png',
          age: '34',
          birthday: '9 January',
          memory: 'Sunday guitar evenings',
        },
      ],
      routine: [
        { t: '6:30 AM', a: 'Wake up, drink warm water' },
        { t: '7:00 AM', a: 'Walk in the park' },
        { t: '9:00 AM', a: 'Breakfast + tablets' },
        { t: '4:30 PM', a: 'Tea & story time' },
        { t: '9:00 PM', a: 'Night medicine & sleep' },
      ],
      places: [
        { n: 'Home', e: '🏡', d: 'Nizarapara, near temple' },
        { n: 'Kaziranga', e: '🦏', d: 'Saw rhino with Pooja, 2019' },
        { n: 'Tea Garden', e: '🍃', d: 'Where I worked 30 years' },
      ],
      help: {
        doc: 'Dr. R. Sharma · GMCH Memory Clinic',
        docp: '0361-2345678',
        addr: 'Nizarapara, Guwahati-781001',
        blood: 'B+',
      },
    },
    settings: {
      lang: 'en',
      ts: 'md',
      voice: true,
      rate: 0.9,
      nMed: true,
      nHyd: true,
      nGeo: true,
      contrast: false,
      offline: false,
      bluetooth: true,
    },
    lastActive: Date.now(),
    location: {
      lat: 26.1834,
      lng: 91.7428,
      accuracy: 12,
      ts: Date.now() - 45000,
      heading: 45,
      speed: 0.8,
    },
    caregiverLocation: {
      lat: 26.1800,
      lng: 91.7480,
      accuracy: 5,
      ts: Date.now(),
    },
    breadcrumbs: [
      { lat: 26.1831, lng: 91.7423, accuracy: 10, ts: Date.now() - 3600000, speed: 0.0, heading: 0 },
      { lat: 26.1833, lng: 91.7426, accuracy: 10, ts: Date.now() - 2700000, speed: 0.9, heading: 30 },
      { lat: 26.1836, lng: 91.7429, accuracy: 11, ts: Date.now() - 1800000, speed: 1.1, heading: 50 },
      { lat: 26.1838, lng: 91.7431, accuracy: 12, ts: Date.now() - 1200000, speed: 1.0, heading: 45 },
      { lat: 26.1836, lng: 91.7430, accuracy: 12, ts: Date.now() - 600000, speed: 0.9, heading: 220 },
      { lat: 26.1834, lng: 91.7428, accuracy: 12, ts: Date.now() - 45000, speed: 0.4, heading: 210 },
    ],
    emergencyContacts: [
      {
        name: 'Pooja Saikia',
        relation: 'Daughter & Primary Guardian',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        role: 'Primary Caregiver',
      },
      {
        name: 'Dr. R. Sharma',
        relation: 'Memory Specialist · GMCH',
        phone: '0361-2345678',
        role: 'Physician',
      },
      {
        name: 'GMCH Emergency & Ambulance',
        relation: 'Medical Helpline',
        phone: '108',
        role: 'Emergency Services',
      },
      {
        name: 'Rohan Saikia',
        relation: 'Son · Shillong',
        phone: '+919876509999',
        whatsapp: '+919876509999',
        role: 'Secondary Guardian',
      },
    ],
  };
}

export function loadDB(userOrEmail?: string): MedhaDB {
  const activeIdentifier =
    userOrEmail || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : '') || '';
  const isDemo = isDemoAccount(activeIdentifier);
  const targetKey = getActiveUserKey(activeIdentifier);

  try {
    const raw = localStorage.getItem(targetKey);
    if (!raw) {
      if (isDemo) {
        const seeded = seedDB();
        saveDB(seeded, activeIdentifier);
        return seeded;
      } else {
        const reg = findRegisteredUser(activeIdentifier);
        const clean = createBlankDB(
          reg?.username || activeIdentifier || 'User',
          reg?.email || (activeIdentifier.includes('@') ? activeIdentifier : `${activeIdentifier || 'user'}@example.com`),
          reg?.role || 'patient',
          reg?.password || '123456'
        );
        saveDB(clean, activeIdentifier);
        return clean;
      }
    }
    const parsed = JSON.parse(raw);

    // If this is an explicitly registered user account (NOT demo), guarantee a clean state
    if (!isDemo) {
      parsed.isCleanSlate = true;
      parsed.users = parsed.users || [];
      parsed.patients = parsed.patients || [];
      parsed.activePatientId = parsed.activePatientId || (parsed.patients?.[0]?.id || '');
      parsed.caregivers = parsed.caregivers || [];
      parsed.caregiverPatientLinks = parsed.caregiverPatientLinks || [];
      parsed.careCircleNotes = parsed.careCircleNotes || [];
      parsed.tasks = parsed.tasks || [];
      parsed.meds = parsed.meds || [];
      parsed.appointment = parsed.appointment || { title: '', day: '', time: '' };
      parsed.diary = parsed.diary || [];
      parsed.scores = parsed.scores || [];
      parsed.gameLog = parsed.gameLog || [];
      parsed.zones = parsed.zones || [];
      parsed.alerts = parsed.alerts || [];
      parsed.breadcrumbs = parsed.breadcrumbs || [];
      parsed.emergencyContacts = parsed.emergencyContacts || [];
      parsed.hydration = parsed.hydration || { count: 0, goal: 8, date: new Date().toDateString() };
      parsed.levels = parsed.levels || { match: 1, seq: 1, odd: 1, pairs: 1, treasure: 1, talk: 1 };
      parsed.settings = parsed.settings || {
        lang: 'en',
        ts: 'md',
        voice: true,
        rate: 0.9,
        nMed: true,
        nHyd: true,
        nGeo: true,
        contrast: false,
        offline: false,
        bluetooth: true,
      };
      parsed.book = parsed.book || {
        profile: { name: parsed.users?.[0]?.name || activeIdentifier, age: '', born: '', home: '', job: '', food: '', song: '', language: 'English' },
        family: [],
        routine: [],
        places: [],
        help: { doc: '', docp: '', addr: '', blood: '' },
      };
      return parsed as MedhaDB;
    }

    // For demo accounts: ALWAYS merge with seedDB defaults so test structures are completely populated
    const defaults = seedDB();
    parsed.isCleanSlate = false;
    parsed.users = parsed.users && parsed.users.length > 0 ? parsed.users : defaults.users;
    parsed.patients = parsed.patients && parsed.patients.length > 0 ? parsed.patients : defaults.patients;
    parsed.activePatientId = parsed.activePatientId || defaults.activePatientId;
    parsed.caregivers = parsed.caregivers && parsed.caregivers.length > 0 ? parsed.caregivers : defaults.caregivers;
    parsed.caregiverPatientLinks = parsed.caregiverPatientLinks && parsed.caregiverPatientLinks.length > 0 ? parsed.caregiverPatientLinks : defaults.caregiverPatientLinks;
    parsed.careCircleNotes = parsed.careCircleNotes && parsed.careCircleNotes.length > 0 ? parsed.careCircleNotes : defaults.careCircleNotes;
    parsed.tasks = parsed.tasks && parsed.tasks.length > 0 ? parsed.tasks : defaults.tasks;
    parsed.meds = parsed.meds && parsed.meds.length > 0 ? parsed.meds : defaults.meds;
    parsed.appointment = parsed.appointment && parsed.appointment.title ? parsed.appointment : defaults.appointment;
    parsed.diary = parsed.diary && parsed.diary.length > 0 ? parsed.diary : defaults.diary;
    parsed.scores = parsed.scores && parsed.scores.length > 0 ? parsed.scores : defaults.scores;
    parsed.gameLog = parsed.gameLog && parsed.gameLog.length > 0 ? parsed.gameLog : defaults.gameLog;
    parsed.zones = parsed.zones && parsed.zones.length > 0 ? parsed.zones : defaults.zones;
    parsed.alerts = parsed.alerts && parsed.alerts.length > 0 ? parsed.alerts : defaults.alerts;
    parsed.book = parsed.book && parsed.book.profile && parsed.book.profile.name ? parsed.book : defaults.book;
    parsed.emergencyContacts = parsed.emergencyContacts && parsed.emergencyContacts.length > 0 ? parsed.emergencyContacts : defaults.emergencyContacts;
    parsed.breadcrumbs = parsed.breadcrumbs && parsed.breadcrumbs.length > 0 ? parsed.breadcrumbs : defaults.breadcrumbs;
    parsed.location = parsed.location || defaults.location;
    parsed.caregiverLocation = parsed.caregiverLocation || defaults.caregiverLocation;
    parsed.settings = { ...defaults.settings, ...(parsed.settings || {}) };
    parsed.hydration = parsed.hydration || defaults.hydration;
    parsed.levels = parsed.levels || defaults.levels;
    return parsed as MedhaDB;
  } catch (err) {
    console.error('Error loading DB:', err);
    return isDemo ? seedDB() : createBlankDB(activeIdentifier, `${activeIdentifier}@example.com`, 'patient');
  }
}

export function saveDB(data: MedhaDB, userOrEmail?: string): void {
  const activeIdentifier =
    userOrEmail || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('smriti_username') : '') || '';
  const targetKey = getActiveUserKey(activeIdentifier);

  try {
    localStorage.setItem(targetKey, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

const FAMILY_PHOTOS: Record<string, string> = {
  'family-moloi.png': '/family-moloi.svg',
  'family-pooja.png': '/family-pooja.svg',
  'family-rohan.png': '/family-rohan.svg',
};

export function familyPhoto(name: string): string {
  return FAMILY_PHOTOS[name] || name;
}
