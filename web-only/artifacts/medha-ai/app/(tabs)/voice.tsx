import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { MicButton } from '@/components/MicButton';
import { TestDataBanner } from '@/components/TestDataBanner';
import { useApp } from '@/context/AppContext';
import { useTranscribeVoiceDiary } from '@workspace/api-client-react';

export default function VoiceDiaryScreen() {
  const colors = useColors();
  const { diaryEntries, addDiaryEntry, addVoiceTask } = useApp();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const transcription = useTranscribeVoiceDiary();
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<{ title: string; time: string; recurrence: string } | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }).catch(() => undefined);
  }, []);

  const toggleRecording = async () => {
    setPermissionMessage(null);
    if (recorderState.isRecording) {
      await recorder.stop();
      const uri = recorder.uri ?? recorderState.url;
      if (!uri) {
        setPermissionMessage('The recording could not be saved. Please try again.');
        return;
      }
      try {
        const audioBase64 = await new File(uri).base64();
        const result = await transcription.mutateAsync({
          data: {
            audioBase64,
            mimeType: 'audio/m4a',
            languageHint: 'Assamese, Hindi, or English',
          },
        });
        addDiaryEntry(result.transcript, uri, result.possibleTask);
        setPendingTask(result.possibleTask);
      } catch {
        addDiaryEntry('Audio saved locally. Transcription will be available when the phone is online.', uri);
        setPermissionMessage('Audio is safe on this phone. Gemini transcription will retry when connected.');
      }
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setPermissionMessage('Microphone access is needed for a voice diary note.');
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const acceptTask = () => {
    if (!pendingTask) return;
    addVoiceTask(pendingTask.title, pendingTask.time, pendingTask.recurrence);
    setPendingTask(null);
    Alert.alert('Reminder added', 'The new reminder is now part of today’s care plan.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR DAILY VOICE</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Voice Diary</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Speak naturally. Your thoughts will be kept as audio and text.</Text>
        <TestDataBanner compact />

        <View style={[styles.hero, { backgroundColor: colors.navy }]}>
          <View style={[styles.wave, { backgroundColor: colors.primary }]}><Feather name="mic" size={28} color={colors.card} /></View>
          <Text style={[styles.heroTitle, { color: colors.card }]}>A safe place to remember</Text>
          <Text style={[styles.heroBody, { color: colors.sage }]}>Speak in Assamese, Hindi, or English. Your audio stays on this phone while Gemini prepares the text.</Text>
          <Pressable
            testID="voice-diary-record"
            accessibilityLabel={recorderState.isRecording ? 'Stop voice diary recording' : 'Start voice diary recording'}
            onPress={toggleRecording}
            style={({ pressed }) => [styles.recordButton, { backgroundColor: colors.sun }, pressed && styles.pressed]}
          >
            <Feather name={recorderState.isRecording ? 'square' : 'mic'} size={18} color={colors.navy} />
            <Text style={[styles.recordLabel, { color: colors.navy }]}>
              {recorderState.isRecording ? `Stop · ${Math.round(recorderState.durationMillis / 1000)}s` : transcription.isPending ? 'Transcribing…' : 'Start a voice note'}
            </Text>
          </Pressable>
          {permissionMessage && <Text style={[styles.permissionText, { color: colors.sun }]}>{permissionMessage}</Text>}
        </View>

        {pendingTask && (
          <View style={[styles.taskPrompt, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
            <View style={[styles.taskPromptIcon, { backgroundColor: colors.card }]}><Feather name="calendar" size={18} color={colors.primary} /></View>
            <View style={styles.taskPromptCopy}>
              <Text style={[styles.taskPromptLabel, { color: colors.primary }]}>Possible reminder found</Text>
              <Text style={[styles.taskPromptText, { color: colors.foreground }]}>{pendingTask.title} · {pendingTask.time}</Text>
            </View>
            <Pressable onPress={acceptTask} accessibilityLabel="Add possible voice task" style={[styles.addTaskButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.addTaskLabel, { color: colors.primaryForeground }]}>Add</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.headingRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent notes</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>{diaryEntries.length}</Text>
        </View>
        {diaryEntries.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="book-open" size={20} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your first note will appear here.</Text>
          </View>
        ) : diaryEntries.map((entry) => (
          <View key={entry.id} style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.entryIcon, { backgroundColor: colors.peach }]}><Feather name="volume-2" size={18} color={colors.accentForeground} /></View>
            <View style={styles.entryCopy}>
              <Text style={[styles.entryText, { color: colors.foreground }]}>{entry.transcript}</Text>
              <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>{entry.audioUri ? 'Audio and text saved locally' : 'Text note saved locally'}</Text>
            </View>
          </View>
        ))}
      </Screen>
      <MicButton />
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '700', marginTop: 7 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 7, maxWidth: 320 },
  hero: { borderRadius: 26, padding: 22, marginTop: 26 },
  wave: { width: 58, height: 58, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heroTitle: { fontSize: 22, fontWeight: '700' },
  heroBody: { fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 290 },
  recordButton: { marginTop: 22, borderRadius: 16, height: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  recordLabel: { fontSize: 15, fontWeight: '700' },
  permissionText: { fontSize: 12, lineHeight: 17, marginTop: 13 },
  taskPrompt: { marginTop: 14, borderRadius: 18, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center' },
  taskPromptIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  taskPromptCopy: { flex: 1 },
  taskPromptLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  taskPromptText: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  addTaskButton: { borderRadius: 12, paddingHorizontal: 12, height: 34, alignItems: 'center', justifyContent: 'center' },
  addTaskLabel: { fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  count: { fontSize: 13, fontWeight: '700' },
  empty: { borderWidth: 1, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
  entry: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', marginBottom: 10 },
  entryIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  entryCopy: { flex: 1 },
  entryText: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  entryMeta: { fontSize: 11, marginTop: 5 },
});