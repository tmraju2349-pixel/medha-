import { supabase } from '../../lib/supabase';
import { MedhaDB } from '../../types/medha';
import { loadDB } from '../storage';

export interface SyncReport {
  patientProfile: boolean;
  caregiverProfile: boolean;
  safeZonesCount: number;
  gameSessionsCount: number;
  notificationsCount: number;
  errors: string[];
}

export const BIREN_PATIENT_UUID = 'b17e1000-7200-4000-8000-000000000001';
export const POOJA_CAREGIVER_UUID = 'c01e1000-7200-4000-8000-000000000002';

/**
 * Synchronizes Biren Saikia's full patient profile, safe zones, game sessions, and notifications to Supabase.
 */
export async function syncAllPatientDataToSupabase(dbOverride?: MedhaDB): Promise<SyncReport> {
  const db = dbOverride || loadDB();
  const report: SyncReport = {
    patientProfile: false,
    caregiverProfile: false,
    safeZonesCount: 0,
    gameSessionsCount: 0,
    notificationsCount: 0,
    errors: [],
  };

  if (!supabase) {
    report.errors.push('Supabase client is not configured');
    return report;
  }

  // 1. Sync Patient Profile (Biren Saikia)
  try {
    const { error: patErr } = await supabase.from('profiles').upsert({
      id: BIREN_PATIENT_UUID,
      display_name: db.book?.profile?.name || 'Biren Saikia',
      role: 'patient',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (patErr) {
      report.errors.push(`Profile (Patient): ${patErr.message}`);
    } else {
      report.patientProfile = true;
    }
  } catch (err: any) {
    report.errors.push(`Profile (Patient): ${err.message}`);
  }

  // 1b. Sync into patient_profiles (required by foreign key on safe_zones/game_sessions)
  try {
    await supabase.from('patient_profiles').upsert({
      id: BIREN_PATIENT_UUID,
      age: 72,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err: any) {
    console.debug('patient_profiles upsert note:', err.message);
  }

  // 2. Sync Caregiver Profile (Pooja Saikia)
  try {
    const { error: careErr } = await supabase.from('profiles').upsert({
      id: POOJA_CAREGIVER_UUID,
      display_name: 'Pooja Saikia',
      role: 'caregiver',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (careErr) {
      report.errors.push(`Profile (Caregiver): ${careErr.message}`);
    } else {
      report.caregiverProfile = true;
    }
  } catch (err: any) {
    report.errors.push(`Profile (Caregiver): ${err.message}`);
  }

  // 3. Sync Safe Zones for Biren Saikia
  const safeZones = db.zones || [
    { id: 1, name: '🏠 Home', lat: 26.1832, lng: 91.7425, r: 75 },
    { id: 2, name: '🛕 Nabagraha Temple', lat: 26.1874, lng: 91.7450, r: 65 },
    { id: 3, name: '🌳 Dighalipukhuri Lake Park', lat: 26.1885, lng: 91.7492, r: 85 },
    { id: 4, name: '🍵 Morning Tea Corner', lat: 26.1818, lng: 91.7408, r: 50 },
  ];

  for (const [idx, z] of safeZones.entries()) {
    try {
      const zoneUUID = `b17e1000-7200-4000-8000-00000000001${idx + 1}`;
      const { error: zoneErr } = await supabase.from('safe_zones').upsert({
        id: zoneUUID,
        patient_id: BIREN_PATIENT_UUID,
        label: z.name || 'Safe Zone',
        latitude: z.lat,
        longitude: z.lng,
        radius_meters: z.r,
      }, { onConflict: 'id' });

      if (zoneErr) {
        report.errors.push(`Safe Zone ${z.name}: ${zoneErr.message}`);
      } else {
        report.safeZonesCount++;
      }
    } catch (err: any) {
      report.errors.push(`Safe Zone error: ${err.message}`);
    }
  }

  // 4. Sync Game Sessions / Cognitive Scores
  const scores = db.gameLog || [
    { game: 'match', score: 82 },
    { game: 'odd', score: 74 },
    { game: 'seq', score: 68 },
  ];

  for (const [idx, s] of scores.entries()) {
    try {
      const sessionUUID = `b17e1000-7200-4000-8000-00000000003${idx + 1}`;
      const { error: scoreErr } = await supabase.from('game_sessions').upsert({
        id: sessionUUID,
        patient_id: BIREN_PATIENT_UUID,
        game_key: s.game || 'memory_match',
        score: s.score,
        mistakes: 0,
      }, { onConflict: 'id' });

      if (scoreErr) {
        report.errors.push(`Game Session (${s.game || idx}): ${scoreErr.message}`);
      } else {
        report.gameSessionsCount++;
      }
    } catch (err: any) {
      report.errors.push(`Game Session error: ${err.message}`);
    }
  }

  // 5. Sync Alerts & Notifications
  const alerts = db.alerts || [
    { id: 1, type: 'info', msg: 'Hydration goal missed by 3 glasses yesterday' },
    { id: 2, type: 'good', msg: 'Completed Memory Match Lv 3 — 82 pts 🎉' },
  ];

  for (const [idx, a] of alerts.entries()) {
    try {
      const notifUUID = `b17e1000-7200-4000-8000-00000000002${idx + 1}`;
      const { error: notifErr } = await supabase.from('notifications').upsert({
        id: notifUUID,
        patient_id: BIREN_PATIENT_UUID,
        title: a.type === 'good' ? 'Cognitive Milestone' : 'Health Reminder',
        body: a.msg,
      }, { onConflict: 'id' });

      if (notifErr) {
        report.errors.push(`Notification (${a.id}): ${notifErr.message}`);
      } else {
        report.notificationsCount++;
      }
    } catch (err: any) {
      report.errors.push(`Notification error: ${err.message}`);
    }
  }

  return report;
}
