import { PatientProfileRecord, CaregiverProfileRecord, CaregiverPatientLink, CareCircleNote } from '../types/medha';
import { supabase } from '../lib/supabase';

// Standard Seed Patients - Biren Saikia is the primary independent patient
export const INITIAL_PATIENTS: PatientProfileRecord[] = [
  {
    id: 'PAT-7201-BIREN',
    code: 'MED-782',
    name: 'Biren Saikia',
    age: 72,
    gender: 'Male',
    stage: 'Mild',
    city: 'Guwahati, Assam',
    avatar: '👴',
    phone: '+919876501111',
    emergencyContact: 'Pooja Saikia (Daughter)',
    emergencyPhone: '+919876543210',
    primaryCaregiverId: 'CRG-4401-POOJA',
    linkedCaregiverIds: ['CRG-4401-POOJA', 'CRG-3092-DR_SHARMA', 'CRG-5510-ROHAN'],
    notes: 'Independent patient with mild cognitive impairment. Enjoys morning walks to Nabagraha temple and tea at garden crossing.',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'PAT-6802-MEENA',
    code: 'MED-419',
    name: 'Meena Barua',
    age: 68,
    gender: 'Female',
    stage: 'Early',
    city: 'Dispur, Guwahati',
    avatar: '👵',
    phone: '+919876502222',
    emergencyContact: 'Pooja Saikia (Care Coordinator)',
    emergencyPhone: '+919876543210',
    primaryCaregiverId: 'CRG-4401-POOJA',
    linkedCaregiverIds: ['CRG-4401-POOJA'],
    notes: 'Early stage memory tracking. Remembers songs and classical music. Needs hydration reminders.',
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'PAT-8103-KAMAL',
    code: 'MED-605',
    name: 'Kamal Das',
    age: 81,
    gender: 'Male',
    stage: 'Moderate',
    city: 'Ulubari, Guwahati',
    avatar: '🧓',
    phone: '+919876503333',
    emergencyContact: 'Pooja Saikia (Assigned Nurse)',
    emergencyPhone: '+919876543210',
    primaryCaregiverId: 'CRG-4401-POOJA',
    linkedCaregiverIds: ['CRG-4401-POOJA'],
    notes: 'Moderate assistance required for daily medication. Strict geofence perimeter around residence.',
    createdAt: Date.now() - 86400000 * 7,
  },
];

export const INITIAL_CAREGIVERS: CaregiverProfileRecord[] = [
  {
    id: 'CRG-4401-POOJA',
    name: 'Pooja Saikia',
    email: 'pooja.saikia@medha.care',
    phone: '+919876543210',
    relationship: 'Daughter',
    role: 'Primary Caregiver',
    avatar: '👩‍⚕️',
    patientIds: ['PAT-7201-BIREN', 'PAT-6802-MEENA', 'PAT-8103-KAMAL'],
  },
  {
    id: 'CRG-3092-DR_SHARMA',
    name: 'Dr. Rajesh Sharma',
    email: 'dr.sharma.gmch@medha.care',
    phone: '0361-2345678',
    relationship: 'Neurologist · GMCH Memory Clinic',
    role: 'Family Doctor',
    avatar: '👨‍⚕️',
    patientIds: ['PAT-7201-BIREN'],
  },
  {
    id: 'CRG-5510-ROHAN',
    name: 'Rohan Saikia',
    email: 'rohan.saikia@medha.care',
    phone: '+919876509999',
    relationship: 'Son (Shillong)',
    role: 'Secondary Guardian',
    avatar: '🧑',
    patientIds: ['PAT-7201-BIREN'],
  },
];

export const INITIAL_CAREGIVER: CaregiverProfileRecord = INITIAL_CAREGIVERS[0];

export const INITIAL_LINKS: CaregiverPatientLink[] = [
  {
    id: 'LNK-101',
    caregiverId: 'CRG-4401-POOJA',
    patientId: 'PAT-7201-BIREN',
    pairingCode: 'MED-782',
    status: 'active',
    relationship: 'Daughter',
    role: 'Primary Caregiver',
    connectedAt: Date.now() - 86400000 * 30,
    lastActiveAt: Date.now() - 1000 * 60 * 15,
  },
  {
    id: 'LNK-104',
    caregiverId: 'CRG-3092-DR_SHARMA',
    patientId: 'PAT-7201-BIREN',
    pairingCode: 'MED-782',
    status: 'active',
    relationship: 'Neurologist · GMCH Memory Clinic',
    role: 'Family Doctor',
    connectedAt: Date.now() - 86400000 * 20,
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 4,
  },
  {
    id: 'LNK-105',
    caregiverId: 'CRG-5510-ROHAN',
    patientId: 'PAT-7201-BIREN',
    pairingCode: 'MED-782',
    status: 'active',
    relationship: 'Son (Shillong)',
    role: 'Secondary Guardian',
    connectedAt: Date.now() - 86400000 * 14,
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'LNK-102',
    caregiverId: 'CRG-4401-POOJA',
    patientId: 'PAT-6802-MEENA',
    pairingCode: 'MED-419',
    status: 'active',
    relationship: 'Care Coordinator',
    role: 'Care Coordinator',
    connectedAt: Date.now() - 86400000 * 15,
    lastActiveAt: Date.now() - 1000 * 60 * 120,
  },
  {
    id: 'LNK-103',
    caregiverId: 'CRG-4401-POOJA',
    patientId: 'PAT-8103-KAMAL',
    pairingCode: 'MED-605',
    status: 'active',
    relationship: 'Assigned Nurse',
    role: 'Nurse',
    connectedAt: Date.now() - 86400000 * 7,
    lastActiveAt: Date.now() - 1000 * 60 * 180,
  },
];

export const INITIAL_CARE_NOTES: CareCircleNote[] = [
  {
    id: 'NOTE-001',
    patientId: 'PAT-7201-BIREN',
    authorName: 'Dr. Rajesh Sharma',
    authorRole: 'Family Doctor',
    message: 'Clinical assessment: Cognitive baseline steady at 76%. Continue with Donepezil 5mg, evening memory games, and daily walks.',
    ts: Date.now() - 86400000,
    category: 'doctor',
  },
  {
    id: 'NOTE-002',
    patientId: 'PAT-7201-BIREN',
    authorName: 'Pooja Saikia',
    authorRole: 'Primary Caregiver',
    message: 'Baba completed his morning walk to Nabagraha temple. Drank 4 glasses of water so far. Blood pressure 128/82.',
    ts: Date.now() - 3600000 * 3,
    category: 'medication',
  },
  {
    id: 'NOTE-003',
    patientId: 'PAT-7201-BIREN',
    authorName: 'Rohan Saikia',
    authorRole: 'Secondary Guardian',
    message: 'Checked in on weekend video call. Spirits are very high! He talked enthusiastically about Kaziranga photographs.',
    ts: Date.now() - 86400000 * 2,
    category: 'general',
  },
];

export function generatePairingCode(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `MED-${num}`;
}

export function generatePatientId(): string {
  const r = Math.floor(1000 + Math.random() * 9000);
  return `PAT-${r}-${Date.now().toString().slice(-4)}`;
}

export function generateCaregiverId(): string {
  const r = Math.floor(1000 + Math.random() * 9000);
  return `CRG-${r}-${Date.now().toString().slice(-4)}`;
}

/**
 * Creates QR Code payload string for a patient
 */
export function createPatientQRPayload(patient: PatientProfileRecord): string {
  return JSON.stringify({
    app: 'MEDHA_CARE',
    v: 1,
    type: 'patient_invite',
    patientId: patient.id,
    code: patient.code,
    name: patient.name,
    age: patient.age,
    city: patient.city,
    emergencyPhone: patient.emergencyPhone,
    ts: Date.now(),
  });
}

/**
 * Parses QR payload scanned by Caregiver Camera
 */
export function parsePatientQRPayload(rawText: string): {
  isValid: boolean;
  patientId?: string;
  code?: string;
  name?: string;
  age?: number;
  city?: string;
  error?: string;
} {
  try {
    const data = JSON.parse(rawText.trim());
    if (data.app === 'MEDHA_CARE' && data.type === 'patient_invite' && data.code) {
      return {
        isValid: true,
        patientId: data.patientId,
        code: data.code,
        name: data.name,
        age: data.age,
        city: data.city,
      };
    }
    // Fallback: If someone scans just the 6-digit text code MED-XXX
    if (/^MED-\d{3,4}$/i.test(rawText.trim())) {
      return {
        isValid: true,
        code: rawText.trim().toUpperCase(),
      };
    }
    return {
      isValid: false,
      error: 'Unrecognized QR code format. Please scan a MEDHA Patient pairing QR code.',
    };
  } catch {
    // If text starts with MED-
    if (/^MED-\d{3,4}$/i.test(rawText.trim())) {
      return {
        isValid: true,
        code: rawText.trim().toUpperCase(),
      };
    }
    return {
      isValid: false,
      error: 'Invalid QR code. Could not parse patient data.',
    };
  }
}
