import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { createEncryptedRecordExport, MAX_AUDIO_BYTES } from '@/services/recordExport';

export default function ShareRecordScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    isHydrated,
    patient,
    tasks,
    notifications,
    diaryEntries,
    gameProgress,
    memoryCues,
    settings,
    testDataActive,
  } = useApp();
  const { isDemo } = useAuth();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [webFileContents, setWebFileContents] = useState<string | null>(null);
  const [exportStats, setExportStats] = useState<{
    tasks: number;
    notifications: number;
    diaryEntries: number;
    audioFiles: number;
    memoryCues: number;
    isTestData: boolean;
  } | null>(null);
  const fileUriRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      const uri = fileUriRef.current;
      if (uri && Platform.OS !== 'web') {
        try {
          new File(uri).delete();
        } catch {
          // Cache cleanup is best-effort; the file is encrypted regardless.
        }
      }
    };
  }, []);

  const clearExportFile = () => {
    const uri = fileUriRef.current;
    if (uri && Platform.OS !== 'web') {
      try {
        new File(uri).delete();
      } catch {
        // Cache cleanup is best-effort; the file is encrypted regardless.
      }
    }
    fileUriRef.current = null;
    setFileUri(null);
    setWebFileContents(null);
    setExportCode(null);
    setExportStats(null);
    setStatus(null);
  };

  const createExport = async () => {
    setError(null);
    setStatus(null);
    setBusy(true);
    clearExportFile();

    try {
      if (!isHydrated) {
        throw new Error('Your care record is still loading. Please wait and try again.');
      }

      const result = await createEncryptedRecordExport({
        patient,
        tasks,
        notifications,
        diaryEntries,
        gameProgress,
        memoryCues,
        settings,
        testDataActive,
        isDemo,
      });

      const stamp = result.exportedAt.replace(/[:.]/g, '-');
      if (Platform.OS === 'web') {
        setWebFileContents(result.envelopeJson);
      } else {
        const file = new File(Paths.cache, `medha-care-record-${stamp}.json`);
        file.create({ overwrite: true });
        file.write(result.envelopeJson);
        fileUriRef.current = file.uri;
        setFileUri(file.uri);
      }

      setExportCode(result.keyCode);
      setExportStats({ ...result.counts, isTestData: result.isTestData });
      setStatus('Encrypted export ready. Keep the code separate from the file.');
      setConsent(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The encrypted export could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const confirmAndCreateExport = () => {
    const testWarning = testDataActive || isDemo
      ? '\n\nThis is labeled TEST DATA and must not be treated as a real patient record.'
      : '';

    Alert.alert(
      'Create encrypted patient export?',
      `The export includes the patient profile, care tasks, notifications, diary text and saved voice recordings, memory cues, app preferences, and stored caregiver/home details. Current live location is not stored or included. The file is encrypted and requires a separate one-time code.${testWarning}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create export', onPress: () => void createExport() },
      ],
    );
  };

  const shareExport = async () => {
    setError(null);
    setStatus(null);
    setBusy(true);

    try {
      if (Platform.OS === 'web') {
        if (!webFileContents) throw new Error('Create the encrypted export before downloading it.');
        const url = URL.createObjectURL(new Blob([webFileContents], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'medha-encrypted-care-record.json';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        setStatus('Encrypted file downloaded. Send it using your device’s sharing tools, then import it in the caregiver portal.');
        return;
      }

      if (!fileUri) throw new Error('Create the encrypted export before opening the share menu.');
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('The device share menu is not available on this device.');
      }

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Share encrypted care record',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
      setStatus('Share menu closed. Finish sending the file there, then import it in the caregiver portal.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The device share menu could not be opened.');
    } finally {
      setBusy(false);
    }
  };

  const formattedCode = exportCode?.match(/.{1,4}/g)?.join(' ') ?? '';
  const testData = testDataActive || isDemo;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.backButton}>
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </Pressable>

        <Text style={[styles.eyebrow, { color: colors.primary }]}>PRIVATE CARE RECORD</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Share with caregiver</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Create an encrypted copy for the caregiver portal. The record stays on this phone until you choose a destination in the system share menu.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={20} color={colors.primary} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Encrypted before sharing</Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
              A one-time 128-bit code is shown separately. The caregiver enters it in the portal to decrypt the file locally.
            </Text>
          </View>
        </View>

        <View style={[styles.contentsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Included in this export</Text>
          <Text style={[styles.contentsText, { color: colors.mutedForeground }]}>
            Patient and caregiver details, tasks, reminders, diary transcripts and saved voice recordings, memory cues, game progress, and app preferences.
          </Text>
          <Text style={[styles.locationNote, { color: colors.warning }]}>
            Current live location is not included because it is not saved in the patient record.
          </Text>
          {testData && (
            <View style={[styles.testNotice, { backgroundColor: colors.peach }]}>
              <Feather name="alert-triangle" size={16} color={colors.accentForeground} />
              <Text style={[styles.testNoticeText, { color: colors.accentForeground }]}>
                TEST DATA — DELETE ME. The exported file will be marked as test data.
              </Text>
            </View>
          )}
        </View>

        {!exportCode ? (
          <>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              onPress={() => setConsent((value) => !value)}
              style={styles.consentRow}
              testID="consent-full-record-export"
            >
              <Switch value={consent} onValueChange={setConsent} trackColor={{ false: colors.border, true: colors.safe }} thumbColor={colors.card} />
              <Text style={[styles.consentText, { color: colors.foreground }]}>
                I’m authorized to share this full patient record with the caregiver.
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create encrypted patient record export"
              testID="create-encrypted-record-export"
              disabled={!consent || busy || !isHydrated}
              onPress={confirmAndCreateExport}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: !consent || busy || !isHydrated ? 0.55 : 1 },
              ]}
            >
              {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="shield" size={18} color={colors.primaryForeground} />}
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                {busy ? 'Encrypting…' : 'Create encrypted export'}
              </Text>
            </Pressable>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Saved voice recordings are included. Exports stop instead of silently omitting an unavailable recording or exceeding the 20 MB audio limit.
            </Text>
          </>
        ) : (
          <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.safe }]}>
            <View style={styles.codeHeading}>
              <Feather name="key" size={18} color={colors.safe} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>One-time decryption code</Text>
            </View>
            <Text selectable style={[styles.codeValue, { color: colors.navy }]} testID="text-export-decryption-code">
              {formattedCode}
            </Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
              Read this code to the caregiver separately. Do not send it with the file. It is held only on this screen and is not saved.
            </Text>
            {exportStats && (
              <View style={[styles.summary, { borderTopColor: colors.border }]}>
                <Text style={[styles.summaryText, { color: colors.foreground }]}>
                  {exportStats.tasks} tasks · {exportStats.notifications} notifications · {exportStats.diaryEntries} diary notes · {exportStats.audioFiles} recordings · {exportStats.memoryCues} memory cues
                </Text>
                {exportStats.isTestData && <Text style={[styles.summaryWarning, { color: colors.accentForeground }]}>TEST DATA — DELETE ME</Text>}
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the device share menu"
              testID="share-encrypted-record"
              disabled={busy}
              onPress={() => void shareExport()}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }]}
            >
              {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="share" size={18} color={colors.primaryForeground} />}
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                {busy ? 'Opening share menu…' : Platform.OS === 'web' ? 'Download encrypted file' : 'Open share menu'}
              </Text>
            </Pressable>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              On Android, choose Bluetooth if it appears in the share menu. On iPhone, use AirDrop or another available destination. Then open the file in the caregiver portal.
            </Text>
            <Pressable
              accessibilityRole="button"
              testID="reset-record-export"
              onPress={clearExportFile}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Feather name="rotate-ccw" size={16} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Create a new code</Text>
            </Pressable>
          </View>
        )}

        {error && (
          <View style={[styles.message, { backgroundColor: colors.peach }]} accessibilityRole="alert" testID="status-export-error">
            <Feather name="alert-circle" size={17} color={colors.accentForeground} />
            <Text style={[styles.messageText, { color: colors.accentForeground }]}>{error}</Text>
          </View>
        )}
        {status && (
          <View style={[styles.message, { backgroundColor: colors.secondary }]} accessibilityLiveRegion="polite" testID="status-export-message">
            <Feather name="check-circle" size={17} color={colors.safe} />
            <Text style={[styles.messageText, { color: colors.foreground }]}>{status}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Feather name="shield" size={15} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            The caregiver portal decrypts the file in the browser. It does not upload or save the record.
          </Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 7 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 22 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 20, padding: 15 },
  iconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardBody: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  contentsCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 12 },
  contentsText: { fontSize: 13, lineHeight: 20, marginTop: 7 },
  locationNote: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  testNotice: { flexDirection: 'row', gap: 8, borderRadius: 13, padding: 11, marginTop: 12 },
  testNoticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingVertical: 7 },
  consentText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  primaryButton: { minHeight: 52, borderRadius: 16, paddingHorizontal: 16, marginTop: 15, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 14, fontWeight: '700' },
  helper: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  codeCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 20 },
  codeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeValue: { fontSize: 18, lineHeight: 28, fontWeight: '700', letterSpacing: 1.3, textAlign: 'center', marginVertical: 16 },
  summary: { borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  summaryText: { fontSize: 12, lineHeight: 18 },
  summaryWarning: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  secondaryButton: { minHeight: 44, borderWidth: 1, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryButtonText: { fontSize: 13, fontWeight: '700' },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 14, marginTop: 14 },
  messageText: { flex: 1, fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 24, marginBottom: 10 },
  footerText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
