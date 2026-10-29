import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  ArrowDownToLine,
  Bluetooth,
  Check,
  ClipboardList,
  FileLock2,
  HeartPulse,
  KeyRound,
  MapPin,
  Mic2,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const ENVELOPE_FORMAT = 'medha-encrypted-care-record';
const RECORD_FORMAT = 'medha-care-record';
const MAX_IMPORT_BYTES = 40 * 1024 * 1024;

interface Patient {
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

interface CareTask {
  id: string;
  title: string;
  time: string;
  recurrence?: string | null;
  category: string;
  status: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: string;
  read: boolean;
}

interface DiaryEntry {
  id: string;
  transcript: string;
  createdAt: string;
  audioStatus: string;
  audioAttachmentName: string | null;
  possibleTask?: { title: string; time: string; recurrence: string } | null;
  language?: string | null;
}

interface AudioFile {
  diaryEntryId: string;
  fileName: string;
  mimeType: 'audio/mp4';
  base64: string;
}

interface MemoryCue {
  id: string;
  type: string;
  title: string;
  detail: string;
}

interface CareRecord {
  format: typeof RECORD_FORMAT;
  version: 1;
  exportedAt: string;
  isTestData: boolean;
  patient: Patient | null;
  tasks: CareTask[];
  notifications: Notification[];
  diaryEntries: DiaryEntry[];
  audioFiles: AudioFile[];
  gameProgress: {
    sessions: number;
    bestScore: number;
    lastScore: number | null;
    lastPlayedAt: string | null;
  };
  memoryCues: MemoryCue[];
  settings: Record<string, unknown>;
  safety: {
    caregiverContact: { name: string; relationship: string; phone: string } | null;
    homeAddress: string | null;
    liveLocationIncluded: false;
  };
}

interface Envelope {
  format: typeof ENVELOPE_FORMAT;
  version: 1;
  algorithm: 'AES-GCM';
  keyBits: 128;
  ivLength: 12;
  tagLength: 16;
  ciphertext: string;
}

interface ImportValues {
  code: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function decodeBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('The encrypted file is not in the expected format.');
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeHexKey(value: string): Uint8Array {
  const normalized = value.trim().replace(/[\s-]/g, '');
  if (!/^[a-f0-9]{32}$/i.test(normalized)) {
    throw new Error('Enter the complete 32-character code shown on the patient’s phone.');
  }
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function validateRecord(value: unknown): CareRecord {
  if (!isObject(value) || value.format !== RECORD_FORMAT || value.version !== 1) {
    throw new Error('This file is not a supported Medha care record.');
  }
  if (
    typeof value.exportedAt !== 'string' ||
    typeof value.isTestData !== 'boolean' ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.notifications) ||
    !Array.isArray(value.diaryEntries) ||
    !Array.isArray(value.audioFiles) ||
    !Array.isArray(value.memoryCues) ||
    !isObject(value.gameProgress) ||
    !isObject(value.settings) ||
    !isObject(value.safety)
  ) {
    throw new Error('The decrypted file is incomplete or has an unsupported record structure.');
  }
  if (value.patient !== null && !isObject(value.patient)) {
    throw new Error('The patient profile in this file is invalid.');
  }

  const validTasks = value.tasks.every((item) => isObject(item) && typeof item.title === 'string' && typeof item.time === 'string');
  const validNotifications = value.notifications.every((item) => isObject(item) && typeof item.title === 'string' && typeof item.body === 'string');
  const validDiaries = value.diaryEntries.every((item) => isObject(item) && typeof item.id === 'string' && typeof item.transcript === 'string');
  const validAudio = value.audioFiles.every((item) =>
    isObject(item) &&
    typeof item.diaryEntryId === 'string' &&
    typeof item.fileName === 'string' &&
    item.mimeType === 'audio/mp4' &&
    typeof item.base64 === 'string',
  );
  const validMemory = value.memoryCues.every((item) => isObject(item) && typeof item.title === 'string' && typeof item.detail === 'string');
  if (!validTasks || !validNotifications || !validDiaries || !validAudio || !validMemory) {
    throw new Error('The decrypted file contains invalid record entries.');
  }

  return value as unknown as CareRecord;
}

async function decryptCareRecord(file: File, code: string): Promise<CareRecord> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error('This file is larger than the portal’s 40 MB import limit.');
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot decrypt records securely. Open the portal over HTTPS in a current browser.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (
    !isObject(parsed) ||
    parsed.format !== ENVELOPE_FORMAT ||
    parsed.version !== 1 ||
    parsed.algorithm !== 'AES-GCM' ||
    parsed.keyBits !== 128 ||
    parsed.ivLength !== 12 ||
    parsed.tagLength !== 16 ||
    typeof parsed.ciphertext !== 'string'
  ) {
    throw new Error('This is not a supported encrypted Medha record file.');
  }

  const envelope = parsed as unknown as Envelope;
  const keyBytes = decodeHexKey(code);
  const combined = decodeBase64(envelope.ciphertext);
  if (combined.byteLength <= envelope.ivLength + envelope.tagLength) {
    throw new Error('The encrypted file is incomplete.');
  }

  const iv = combined.slice(0, envelope.ivLength);
  const cipherTextAndTag = combined.slice(envelope.ivLength);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  let decrypted: ArrayBuffer;
  try {
    decrypted = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
        tagLength: envelope.tagLength * 8,
      },
      cryptoKey,
      cipherTextAndTag.buffer as ArrayBuffer,
    );
  } catch {
    throw new Error('The code did not unlock this file. Check that the code and file came from the same export.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decrypted)) as unknown;
  } catch {
    throw new Error('The file could not be read after decryption.');
  }
  return validateRecord(payload);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function downloadAudio(audio: AudioFile) {
  const bytes = decodeBase64(audio.base64);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: audio.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = audio.fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function SectionTitle({ icon: Icon, title, count }: { icon: typeof ClipboardList; title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {count !== undefined && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{count}</span>}
      </div>
    </div>
  );
}

export default function RecordImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [record, setRecord] = useState<CareRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<ImportValues>({ defaultValues: { code: '' } });

  const clearImport = () => {
    setRecord(null);
    setSelectedFile(null);
    setError(null);
    form.reset({ code: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitImport = form.handleSubmit(async ({ code }) => {
    setError(null);
    if (!selectedFile) {
      setError('Choose the encrypted Medha record file first.');
      return;
    }

    setBusy(true);
    try {
      const unlockedRecord = await decryptCareRecord(selectedFile, code);
      setRecord(unlockedRecord);
      setSelectedFile(null);
      form.reset({ code: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The record could not be opened.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">Medha</p>
              <p className="text-xs text-muted-foreground">Caregiver portal</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Private, local import
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.82fr)] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary">
              <Bluetooth className="h-4 w-4" aria-hidden="true" />
              Encrypted device transfer
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Care information, shared with care.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Receive the encrypted file from the patient’s phone, then enter the separate one-time code. The record decrypts in this browser and is never uploaded to a server.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileLock2, title: 'Encrypted file', copy: 'AES-GCM protection' },
                { icon: KeyRound, title: 'Separate code', copy: 'Shared out of band' },
                { icon: ShieldCheck, title: 'Local only', copy: 'No portal upload' },
              ].map(({ icon: Icon, title, copy }) => (
                <div key={title} className="rounded-2xl border border-border bg-card p-4">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          {!record ? (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="import-title">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <FileLock2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="import-title" className="text-lg font-semibold">Open a care record</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Select the file received over Bluetooth, AirDrop, or another device-sharing option.</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".json,.medha,application/json"
                aria-label="Choose encrypted Medha record file"
                data-testid="input-record-file"
                onChange={(event) => {
                  setError(null);
                  setSelectedFile(event.target.files?.[0] ?? null);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-dashed border-input bg-background p-4 text-left transition hover:border-primary hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="button-choose-record-file"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <ArrowDownToLine className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{selectedFile?.name ?? 'Choose encrypted record'}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'JSON file · up to 40 MB'}
                  </span>
                </span>
                {selectedFile && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
              </button>

              <Form {...form}>
                <form onSubmit={submitImport} className="mt-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    rules={{
                      validate: (value) => {
                        const normalized = value.trim().replace(/[\s-]/g, '');
                        return /^[a-f0-9]{32}$/i.test(normalized) || 'Enter the complete 32-character code.';
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>One-time decryption code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete="off"
                            spellCheck={false}
                            maxLength={40}
                            placeholder="Enter the code from the patient’s phone"
                            data-testid="input-decryption-code"
                          />
                        </FormControl>
                        <p className="text-xs leading-5 text-muted-foreground">The code is used only in this tab and is cleared after decryption.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive" role="alert" data-testid="status-import-error">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={busy || !selectedFile}
                    className="h-12 w-full rounded-xl text-sm font-semibold"
                    data-testid="button-decrypt-record"
                  >
                    {busy ? 'Decrypting in this browser…' : 'Decrypt and view record'}
                  </Button>
                </form>
              </Form>

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-secondary/70 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs leading-5 text-muted-foreground">
                  The file and code must come from the same export. Nothing is sent to Medha, saved in this portal, or added to browser storage.
                </p>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="record-ready-title" data-testid="status-record-decrypted">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="record-ready-title" className="text-lg font-semibold">Record opened locally</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">The decryption code has been cleared. This record exists only in this browser tab.</p>
                </div>
              </div>
              {record.isTestData && (
                <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900" data-testid="status-test-record">
                  TEST DATA — DELETE ME. Do not treat this as a real patient record.
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">Care plan tasks</p>
                  <p className="mt-2 text-2xl font-semibold">{record.tasks.length}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">Diary notes</p>
                  <p className="mt-2 text-2xl font-semibold">{record.diaryEntries.length}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={clearImport}
                className="mt-5 w-full rounded-xl"
                data-testid="button-clear-imported-record"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Clear record from this tab
              </Button>
            </section>
          )}
        </section>

        {record && (
          <section className="mt-10 space-y-5" aria-label="Imported patient record">
            <div className="flex flex-col gap-3 rounded-3xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">Patient record</p>
                <h2 className="mt-2 text-2xl font-semibold">{record.patient?.name || 'Patient profile not set'}</h2>
                <p className="mt-1 text-sm opacity-80">
                  {record.patient
                    ? `${record.patient.age} years · ${record.patient.region || 'Location not recorded'}`
                    : 'This export has no patient profile.'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
                <p className="font-semibold">Exported</p>
                <p className="mt-1 text-xs opacity-80">{formatDate(record.exportedAt)}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-border bg-card p-5 sm:p-6" data-testid="card-patient-profile">
                <SectionTitle icon={UserRound} title="Profile & safety" />
                {record.patient ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Languages</p>
                      <p className="mt-1 text-sm">{record.patient.languages?.join(' · ') || 'Not recorded'}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Caregiver</p>
                        <p className="mt-1 text-sm font-medium">{record.safety.caregiverContact?.name || record.patient.caregiverName || 'Not recorded'}</p>
                        <p className="text-xs text-muted-foreground">{record.safety.caregiverContact?.relationship || record.patient.caregiverRelationship || ''}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Caregiver phone</p>
                        <p className="mt-1 break-all text-sm">{record.safety.caregiverContact?.phone || record.patient.caregiverPhone || 'Not recorded'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-background p-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Home address</p>
                          <p className="mt-1 text-sm leading-6">{record.safety.homeAddress || record.patient.homeAddress || 'Not recorded'}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">Current live location is not saved in the exported record.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No patient profile was saved in this export.</p>
                )}
              </section>

              <section className="rounded-3xl border border-border bg-card p-5 sm:p-6" data-testid="card-care-plan">
                <SectionTitle icon={ClipboardList} title="Care plan" count={record.tasks.length} />
                {record.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No care tasks in this record.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {record.tasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" data-testid={`row-care-task-${task.id}`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{task.category} · {task.time}{task.recurrence ? ` · ${task.recurrence}` : ''}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold capitalize text-primary">{task.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-border bg-card p-5 sm:p-6" data-testid="card-diary">
                <SectionTitle icon={Mic2} title="Voice diary" count={record.diaryEntries.length} />
                {record.diaryEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diary entries in this record.</p>
                ) : (
                  <div className="space-y-3">
                    {record.diaryEntries.map((entry) => {
                      const audio = record.audioFiles.find((item) => item.diaryEntryId === entry.id);
                      return (
                        <article key={entry.id} className="rounded-2xl bg-background p-4" data-testid={`card-diary-entry-${entry.id}`}>
                          <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{entry.transcript}</p>
                          {entry.possibleTask && (
                            <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-primary">
                              Suggested reminder: {entry.possibleTask.title} · {entry.possibleTask.time}
                            </p>
                          )}
                          {audio && (
                            <button
                              type="button"
                              onClick={() => downloadAudio(audio)}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-primary transition hover:bg-secondary"
                              data-testid={`button-download-audio-${entry.id}`}
                            >
                              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                              Download voice note
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-border bg-card p-5 sm:p-6" data-testid="card-notifications">
                <SectionTitle icon={HeartPulse} title="Notifications" count={record.notifications.length} />
                {record.notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications in this record.</p>
                ) : (
                  <ul className="space-y-3">
                    {record.notifications.map((notification) => (
                      <li key={notification.id} className="rounded-2xl bg-background p-4" data-testid={`row-notification-${notification.id}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold">{notification.title}</p>
                          <span className="text-xs text-muted-foreground">{notification.time}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 lg:col-span-2" data-testid="card-memory-cues">
                <SectionTitle icon={MapPin} title="Memory cues" count={record.memoryCues.length} />
                {record.memoryCues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No memory cues in this record.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {record.memoryCues.map((cue) => (
                      <article key={cue.id} className="rounded-2xl bg-background p-4" data-testid={`card-memory-cue-${cue.id}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{cue.type}</p>
                        <h3 className="mt-2 text-sm font-semibold">{cue.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{cue.detail}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              This decrypted record is held only in this tab. Clear it before leaving a shared computer. The encrypted source file remains in the computer’s download location until you delete it.
            </div>
          </section>
        )}

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>Medha · Caregiver portal</p>
          <p>Local decryption · no server upload · clear the tab when finished</p>
        </footer>
      </main>
    </div>
  );
}
