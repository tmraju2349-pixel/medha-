import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { MicButton } from '@/components/MicButton';
import { TestDataBanner } from '@/components/TestDataBanner';
import { useApp, type MicPosition } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { requestNotificationAccess, scheduleTaskAlarm } from '@/services/notifications';

const positions: Array<{ key: MicPosition; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: 'bottom-left', label: 'Bottom left', icon: 'corner-left-down' },
  { key: 'bottom-right', label: 'Bottom right', icon: 'corner-right-down' },
  { key: 'top-left', label: 'Top left', icon: 'corner-left-up' },
  { key: 'top-right', label: 'Top right', icon: 'corner-right-up' },
];

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    micPosition,
    setMicPosition,
    settings,
    updateSetting,
    testDataActive,
    patient,
    loadTestPatientData,
    deleteTestPatientData,
    syncStatus,
    syncQueue,
    syncNow,
  } = useApp();
  const { user, isDemo, isLoading: authLoading, signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>CARE & SAFETY</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>More</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your safety tools and personal app settings.</Text>
        {testDataActive && <TestDataBanner />}

        <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.accountHeader}>
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
              <Feather name={user ? 'cloud' : 'user'} size={18} color={colors.primary} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                {isDemo ? 'Local demo only' : user ? 'Cloud account connected' : 'Connect a free cloud account'}
              </Text>
              <Text style={[styles.settingBody, { color: colors.mutedForeground }]}>
                {isDemo
                  ? 'Test data stays on this device and is never synced.'
                  : user?.email || 'Keep your care plan available across devices.'}
              </Text>
            </View>
          </View>
          {isDemo ? (
            <Pressable
              accessibilityLabel="Sign in to a real Medha account"
              onPress={() => router.replace('/auth')}
              style={[styles.accountAction, { backgroundColor: colors.primary }]}
            >
              <Feather name="arrow-right" size={16} color={colors.card} />
              <Text style={[styles.accountActionText, { color: colors.card }]}>Sign in to a real account</Text>
            </Pressable>
          ) : user ? (
            <>
              <View style={[styles.syncRow, { borderTopColor: colors.border }]}>
                <View style={styles.syncCopy}>
                  <Text style={[styles.syncTitle, { color: colors.foreground }]}>
                    {testDataActive
                      ? 'Local test mode'
                      : syncStatus === 'syncing'
                        ? 'Syncing securely…'
                        : syncStatus === 'offline'
                          ? 'Offline — changes are queued'
                          : syncStatus === 'error'
                            ? 'Sync needs another try'
                            : syncQueue.length > 0
                              ? `${syncQueue.length} change${syncQueue.length === 1 ? '' : 's'} waiting`
                              : 'Synced to your account'}
                  </Text>
                  <Text style={[styles.syncBody, { color: colors.mutedForeground }]}>
                    {testDataActive
                      ? 'Delete TEST DATA — DELETE ME before syncing anything.'
                      : 'AsyncStorage keeps your latest changes available offline.'}
                  </Text>
                </View>
                {!testDataActive && (
                  <Pressable
                    accessibilityLabel="Sync care plan now"
                    onPress={() => void syncNow()}
                    disabled={syncStatus === 'syncing'}
                    style={[styles.syncButton, { backgroundColor: colors.secondary }]}
                  >
                    <Feather name="refresh-cw" size={15} color={colors.primary} />
                    <Text style={[styles.syncButtonText, { color: colors.primary }]}>Sync</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                accessibilityLabel="Sign out of Medha AI"
                onPress={() => {
                  void signOut().then(
                    () => router.replace('/auth'),
                    () => router.replace('/auth'),
                  );
                }}
                disabled={authLoading}
                style={[styles.accountAction, { borderColor: colors.border }]}
              >
                <Feather name="log-out" size={15} color={colors.primary} />
                <Text style={[styles.accountActionText, { color: colors.primary }]}>
                  {authLoading ? 'Signing out…' : 'Sign out'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel="Create or sign in to a Medha AI account"
              onPress={() => router.push('/auth')}
              style={[styles.accountAction, { backgroundColor: colors.primary }]}
            >
              <Feather name="arrow-right" size={16} color={colors.card} />
              <Text style={[styles.accountActionText, { color: colors.card }]}>Create account or sign in</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityLabel="Activate SOS safety mode"
          testID="activate-sos"
          onPress={() => router.navigate('/safety')}
          style={({ pressed }) => [styles.safety, { backgroundColor: colors.navy }, pressed && styles.pressed]}
        >
          <View style={[styles.safetyIcon, { backgroundColor: colors.safe }]}><Feather name="shield" size={23} color={colors.card} /></View>
          <View style={styles.safetyCopy}>
            <Text style={[styles.safetyTitle, { color: colors.card }]}>SOS Mode</Text>
            <Text style={[styles.safetyBody, { color: colors.sage }]}>Calm help is one tap away.</Text>
          </View>
          <Feather name="chevron-right" size={21} color={colors.sage} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Microphone position</Text>
        <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>Choose where the voice button feels easiest to reach.</Text>
        <View style={styles.positionGrid}>
          {positions.map((position) => {
            const selected = position.key === micPosition;
            return (
              <Pressable
                key={position.key}
                accessibilityLabel={`Place microphone ${position.label}`}
                onPress={() => setMicPosition(position.key)}
                style={({ pressed }) => [
                  styles.position,
                  { backgroundColor: selected ? colors.secondary : colors.card, borderColor: selected ? colors.primary : colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <Feather name={position.icon} size={18} color={selected ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.positionLabel, { color: selected ? colors.primary : colors.foreground }]}>{position.label}</Text>
                {selected && <Feather name="check-circle" size={16} color={colors.safe} />}
              </Pressable>
            );
          })}
        </View>

        {isDemo && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 28 }]}>Settings</Text>
            <View style={[styles.testDatabase, { backgroundColor: colors.card, borderColor: colors.accent }]}>
              <View style={styles.testDatabaseHeader}>
                <View style={[styles.testDatabaseIcon, { backgroundColor: colors.peach }]}>
                  <Feather name="database" size={19} color={colors.accentForeground} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={[styles.settingTitle, { color: colors.foreground }]}>Test patient database</Text>
                  <Text style={[styles.settingBody, { color: colors.accentForeground }]}>TEST DATA — DELETE ME</Text>
                </View>
              </View>
              {testDataActive && patient ? (
                <>
                  <View style={[styles.testPatientRow, { borderColor: colors.border }]}>
                    <Text style={[styles.testPatientLabel, { color: colors.mutedForeground }]}>ACTIVE TEST PATIENT</Text>
                    <Text style={[styles.testPatientValue, { color: colors.foreground }]}>{patient.name} · {patient.age} years</Text>
                    <Text style={[styles.testPatientId, { color: colors.mutedForeground }]}>ID: {patient.id}</Text>
                  </View>
                  <Text style={[styles.testDatabaseHint, { color: colors.mutedForeground }]}>This profile powers the visible care plan, notifications, notes, and progress so you can test the full process.</Text>
                </>
              ) : (
                <Text style={[styles.testDatabaseHint, { color: colors.mutedForeground }]}>No test patient is loaded. Reload it below when you want to test the process again.</Text>
              )}
              <View style={styles.testActions}>
                <Pressable
                  testID="reload-test-patient"
                  onPress={() => {
                    loadTestPatientData();
                    Alert.alert('Test patient loaded', 'TEST DATA — DELETE ME is active again. You can now test the patient process.');
                  }}
                  style={[styles.testAction, { backgroundColor: colors.secondary }]}
                >
                  <Feather name="rotate-ccw" size={15} color={colors.primary} />
                  <Text style={[styles.testActionText, { color: colors.primary }]}>Reload test data</Text>
                </Pressable>
                <Pressable
                  testID="delete-test-patient"
                  onPress={() => Alert.alert(
                    'Delete test patient data?',
                    'This removes only the clearly labeled TEST DATA — DELETE ME profile, its tasks, notes, notifications, and test progress from this device.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete test data', style: 'destructive', onPress: deleteTestPatientData },
                    ],
                  )}
                  style={[styles.testAction, { backgroundColor: colors.peach }]}
                >
                  <Feather name="trash-2" size={15} color={colors.accentForeground} />
                  <Text style={[styles.testActionText, { color: colors.accentForeground }]}>Delete test data</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
        <View style={[styles.languageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.languageHeader}>
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}><Feather name="globe" size={18} color={colors.primary} /></View>
            <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Language & voice</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>Choose the language that feels most familiar.</Text></View>
          </View>
          <View style={styles.languageChoices}>
            {(['English', 'Assamese', 'Hindi'] as const).map((language) => (
              <Pressable key={language} onPress={() => updateSetting('language', language)} style={[styles.languageChoice, { backgroundColor: settings.language === language ? colors.secondary : colors.background, borderColor: settings.language === language ? colors.primary : colors.border }]}>
                <Text style={[styles.languageText, { color: settings.language === language ? colors.primary : colors.foreground }]}>{language}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { key: 'voicePrompts' as const, title: 'Voice prompts', body: 'Speak guidance aloud when helpful.', value: settings.voicePrompts },
            { key: 'highContrast' as const, title: 'Higher contrast', body: 'Make important actions easier to see.', value: settings.highContrast },
          ].map((item, index) => (
            <View key={item.key} style={[styles.toggleRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
              <Switch value={item.value} onValueChange={(value) => updateSetting(item.key, value)} trackColor={{ false: colors.muted, true: colors.safe }} thumbColor={colors.card} />
            </View>
          ))}
        </View>
        {[
          { icon: 'bell' as const, title: 'Notifications & alarms', body: settings.notificationsEnabled ? 'Gentle reminders are on' : 'Reminders are paused' },
          { icon: 'share' as const, title: 'Bluetooth & file sharing', body: 'Send an encrypted patient record to the caregiver' },
          { icon: 'clipboard' as const, title: 'Medical reports', body: 'Private care records' },
          { icon: 'map-pin' as const, title: 'Geofencing', body: 'Home boundary not configured' },
        ].map((item) => (
          <Pressable
            key={item.title}
            onPress={async () => {
              if (item.title === 'Notifications & alarms') {
                const granted = await requestNotificationAccess();
                updateSetting('notificationsEnabled', granted);
                if (granted) {
                  await scheduleTaskAlarm({ id: 'demo-alarm', title: 'Reminder preview', time: 'Now', category: 'routine', icon: 'calendar', status: 'pending' }, 5);
                }
                Alert.alert(granted ? 'Alarms enabled' : 'Permission needed', granted ? 'A gentle reminder will appear in a few seconds as a preview.' : 'Allow notifications in your phone settings to receive reminders.');
                return;
              }
              if (item.title === 'Geofencing') {
                router.navigate('/safety');
                return;
              }
              if (item.title === 'Medical reports') {
                router.navigate('/reports');
                return;
              }
              if (item.title === 'Bluetooth & file sharing') {
                router.navigate('/share-record');
                return;
              }
              Alert.alert(item.title, 'This setting will be connected to your caregiver profile.');
            }}
            style={({ pressed }) => [styles.setting, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}><Feather name={item.icon} size={18} color={colors.primary} /></View>
            <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
            <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </Screen>
      <MicButton />
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '700', marginTop: 7 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 7, maxWidth: 320, marginBottom: 26 },
  accountCard: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 16 },
  accountHeader: { flexDirection: 'row', alignItems: 'center' },
  syncRow: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, flexDirection: 'row', alignItems: 'center' },
  syncCopy: { flex: 1, paddingRight: 8 },
  syncTitle: { fontSize: 13, fontWeight: '700' },
  syncBody: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  syncButton: { minHeight: 35, borderRadius: 11, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncButtonText: { fontSize: 12, fontWeight: '700' },
  accountAction: { minHeight: 40, borderRadius: 12, marginTop: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  accountActionText: { fontSize: 13, fontWeight: '700' },
  safety: { borderRadius: 24, padding: 17, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  safetyIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  safetyCopy: { flex: 1 },
  safetyTitle: { fontSize: 18, fontWeight: '700' },
  safetyBody: { fontSize: 13, marginTop: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionBody: { fontSize: 13, marginTop: 5, marginBottom: 13 },
  positionGrid: { gap: 9 },
  position: { minHeight: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  positionLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  setting: { minHeight: 64, borderRadius: 18, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  settingIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '700' },
  settingBody: { fontSize: 12, marginTop: 3 },
  languageCard: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 10 },
  languageHeader: { flexDirection: 'row', alignItems: 'center' },
  languageChoices: { flexDirection: 'row', gap: 7, marginTop: 12 },
  languageChoice: { flex: 1, height: 36, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  languageText: { fontSize: 11, fontWeight: '700' },
  toggleCard: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, marginBottom: 10 },
  toggleRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  testDatabase: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 10 },
  testDatabaseHeader: { flexDirection: 'row', alignItems: 'center' },
  testDatabaseIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  testPatientRow: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, marginTop: 11 },
  testPatientLabel: { fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  testPatientValue: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  testPatientId: { fontSize: 10, marginTop: 3 },
  testDatabaseHint: { fontSize: 11, lineHeight: 17, marginTop: 10 },
  testActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  testAction: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 7 },
  testActionText: { fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});