import { AESEncryptionKey, AESKeySize, aesEncryptAsync } from 'expo-crypto';
import { File } from 'expo-file-system';
import type {
  AppNotification,
  AppSettings,
  DailyTask,
  DiaryEntry,
  GameProgress,
  MemoryCue,
} from '@/context/AppContext';
import type { PatientProfile } from '@/data/testPatientData';

export const CARE_RECORD_ENVELOPE_FORMAT = 'medha-encrypted-care-record';
export const CARE_RECORD_FORMAT = 'medha-care-record';
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_PLAINTEXT_BYTES = 40 * 1024 * 1024;

interface AudioAttachment {
  diaryEntryId: string;
  fileName: string;
  mimeType: 'audio/mp4';
  base64: string;
}

export interface CareRecordPayload {
  format: typeof CARE_RECORD_FORMAT;
  version: 1;
  exportedAt: string;
  isTestData: boolean;
  patient: PatientProfile | null;
  tasks: DailyTask[];
  notifications: AppNotification[];
  diaryEntries: Array<Omit<DiaryEntry, 'audioUri'> & { audioAttachmentName: string | null }>;
  audioFiles: AudioAttachment[];
  gameProgress: GameProgress;
  memoryCues: MemoryCue[];
  settings: AppSettings;
  safety: {
    caregiverContact: {
      name: string;
      relationship: string;
      phone: string;
    } | null;
    homeAddress: string | null;
    liveLocationIncluded: false;
  };
}

export interface EncryptedCareRecordEnvelope {
  format: typeof CARE_RECORD_ENVELOPE_FORMAT;
  version: 1;
  algorithm: 'AES-GCM';
  keyBits: 128;
  ivLength: 12;
  tagLength: 16;
  ciphertext: string;
}

interface RecordExportSource {
  patient: PatientProfile | null;
  tasks: DailyTask[];
  notifications: AppNotification[];
  diaryEntries: DiaryEntry[];
  gameProgress: GameProgress;
  memoryCues: MemoryCue[];
  settings: AppSettings;
  testDataActive: boolean;
  isDemo: boolean;
}

export interface EncryptedRecordExport {
  envelopeJson: string;
  keyCode: string;
  exportedAt: string;
  isTestData: boolean;
  counts: {
    tasks: number;
    notifications: number;
    diaryEntries: number;
    audioFiles: number;
    memoryCues: number;
  };
}

function encodeUtf8(value: string): Uint8Array {
  const encoded = encodeURIComponent(value);
  const bytes = new Uint8Array(encoded.length);
  let offset = 0;

  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] === '%') {
      bytes[offset] = Number.parseInt(encoded.slice(index + 1, index + 3), 16);
      offset += 1;
      index += 2;
    } else {
      bytes[offset] = encoded.charCodeAt(index);
      offset += 1;
    }
  }

  return bytes.slice(0, offset);
}

export async function createEncryptedRecordExport(
  source: RecordExportSource,
): Promise<EncryptedRecordExport> {
  const exportedAt = new Date().toISOString();
  const audioFiles: AudioAttachment[] = [];
  const audioNameByDiaryId = new Map<string, string>();
  let totalAudioBytes = 0;

  for (const entry of source.diaryEntries) {
    if (!entry.audioUri) continue;

    const audioFile = new File(entry.audioUri);
    if (!audioFile.exists) {
      throw new Error(`The local voice recording for “${entry.transcript.slice(0, 48)}” is no longer available.`);
    }

    const audioSize = audioFile.size;
    if (!Number.isFinite(audioSize) || audioSize <= 0) {
      throw new Error('A saved voice recording has no readable file size. No partial export was created.');
    }
    if (totalAudioBytes + audioSize > MAX_AUDIO_BYTES) {
      throw new Error('Voice recordings exceed the 20 MB transfer limit. No partial export was created.');
    }

    totalAudioBytes += audioSize;
    const fileName = `voice-note-${String(audioFiles.length + 1).padStart(2, '0')}.m4a`;
    audioNameByDiaryId.set(entry.id, fileName);
    audioFiles.push({
      diaryEntryId: entry.id,
      fileName,
      mimeType: 'audio/mp4',
      base64: await audioFile.base64(),
    });
  }

  const isTestData = source.isDemo || source.testDataActive;
  const record: CareRecordPayload = {
    format: CARE_RECORD_FORMAT,
    version: 1,
    exportedAt,
    isTestData,
    patient: source.patient,
    tasks: source.tasks,
    notifications: source.notifications,
    diaryEntries: source.diaryEntries.map(({ audioUri: _audioUri, ...entry }) => ({
      ...entry,
      audioAttachmentName: audioNameByDiaryId.get(entry.id) ?? null,
    })),
    audioFiles,
    gameProgress: source.gameProgress,
    memoryCues: source.memoryCues,
    settings: source.settings,
    safety: {
      caregiverContact: source.patient
        ? {
            name: source.patient.caregiverName,
            relationship: source.patient.caregiverRelationship,
            phone: source.patient.caregiverPhone,
          }
        : null,
      homeAddress: source.patient?.homeAddress ?? null,
      liveLocationIncluded: false,
    },
  };

  const plaintext = encodeUtf8(JSON.stringify(record));
  if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) {
    throw new Error('This patient record is too large to export safely. No partial export was created.');
  }

  const key = await AESEncryptionKey.generate(AESKeySize.AES128);
  const sealed = await aesEncryptAsync(plaintext, key);
  const ciphertext = await sealed.combined('base64');
  const keyCode = (await key.encoded('hex')).toUpperCase();

  const envelope: EncryptedCareRecordEnvelope = {
    format: CARE_RECORD_ENVELOPE_FORMAT,
    version: 1,
    algorithm: 'AES-GCM',
    keyBits: 128,
    ivLength: 12,
    tagLength: 16,
    ciphertext,
  };

  return {
    envelopeJson: JSON.stringify(envelope),
    keyCode,
    exportedAt,
    isTestData,
    counts: {
      tasks: record.tasks.length,
      notifications: record.notifications.length,
      diaryEntries: record.diaryEntries.length,
      audioFiles: record.audioFiles.length,
      memoryCues: record.memoryCues.length,
    },
  };
}
